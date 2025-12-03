// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { PermissionsAndroid, Platform } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import messaging from '@react-native-firebase/messaging';

import type { DeviceTokenRegistration } from '@/services/notifications/notificationService.shared';
import {
  API_URL,
  API_URL_STAGING,
  getStateMessage,
} from '@/services/notifications/notificationService.shared';
import { useSettingStore } from '@/stores/settingStore';

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    if (token) {
      log('FCM Token received');
      return token;
    }
    return null;
  } catch (err) {
    error('Failed to get FCM token:', err);
    return null;
  }
}
// Determine if running in test environment
const isTestEnv = process.env.NODE_ENV === 'test';
const log = (...args: unknown[]) => {
  if (!isTestEnv) console.log(...args);
};
const error = (...args: unknown[]) => {
  if (!isTestEnv) console.error(...args);
};

export { getStateMessage };

export async function isNotificationSystemReady(): Promise<{
  ready: boolean;
  message: string;
}> {
  try {
    // Check permissions first
    const authStatus = await messaging().hasPermission();
    const hasPermission =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!hasPermission) {
      return {
        ready: false,
        message:
          'Notification permissions not granted. Please enable notifications in Settings.',
      };
    }

    // Check if FCM token is available (ensures APNs is registered on iOS)
    const token = await messaging().getToken();

    if (!token) {
      return {
        ready: false,
        message:
          Platform.OS === 'ios'
            ? 'APNs token not registered yet. Try restarting the app or check your network connection.'
            : 'FCM token not available. Check your network connection.',
      };
    }

    log(
      'Notification system ready with token:',
      token.substring(0, 10) + '...',
    );

    return {
      ready: true,
      message: 'Notification system is ready',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error('Failed to check notification system readiness:', errorMessage);
    return {
      ready: false,
      message: `Error: ${errorMessage}`,
    };
  }
}

export async function isTopicSubscribed(topic: string): Promise<boolean> {
  try {
    const readiness = await isNotificationSystemReady();
    if (!readiness.ready) {
      return false;
    }
    const subscribedTopics = useSettingStore.getState().subscribedTopics;
    return subscribedTopics.includes(topic);
  } catch {
    return false;
  }
}

export async function registerDeviceToken(
  sessionId: string,
  deviceToken?: string,
  isMockPassport?: boolean,
): Promise<void> {
  try {
    let token = deviceToken;
    if (!token) {
      token = await messaging().getToken();
      if (!token) {
        log('No FCM token available');
        return;
      }
    }

    const cleanedToken = token.trim();
    const baseUrl = isMockPassport ? API_URL_STAGING : API_URL;

    const deviceTokenRegistration: DeviceTokenRegistration = {
      session_id: sessionId,
      device_token: cleanedToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };

    if (cleanedToken.length > 10) {
      log(
        'Registering device token:',
        `${cleanedToken.substring(0, 5)}...${cleanedToken.substring(
          cleanedToken.length - 5,
        )}`,
      );
    }

    const response = await fetch(`${baseUrl}/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(deviceTokenRegistration),
    });

    if (!response.ok) {
      const errorText = await response.text();
      error('Failed to register device token:', response.status, errorText);
    } else {
      log('Device token registered successfully with session_id:', sessionId);
    }
  } catch (err) {
    error('Error registering device token:', err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          log('Notification permission denied');
          return false;
        }
      }
    }
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    log('Notification permission status:', enabled);

    return enabled;
  } catch (err) {
    error('Failed to request notification permission:', err);
    return false;
  }
}

export function setupNotifications(): () => void {
  messaging().setBackgroundMessageHandler(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      log('Message handled in the background!', remoteMessage);
    },
  );

  const unsubscribeForeground = messaging().onMessage(
    async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      log('Foreground message received:', remoteMessage);
    },
  );

  return unsubscribeForeground;
}

/**
 * Subscribe to FCM topics client-side
 *
 * IMPORTANT: On iOS, this requires APNs token to be registered with FCM first.
 * We ensure this by getting the FCM token before subscribing to topics.
 *
 * @param topics Array of topic names to subscribe to
 * @returns Object with successes and failures arrays
 */
export async function subscribeToTopics(topics: string[]): Promise<{
  successes: string[];
  failures: Array<{ topic: string; error: string }>;
}> {
  const successes: string[] = [];
  const failures: Array<{ topic: string; error: string }> = [];

  try {
    // CRITICAL FOR iOS: Get FCM token first to ensure APNs is registered
    // Without this, topic subscriptions silently fail on iOS
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      const errorMsg =
        'No FCM token available. Cannot subscribe to topics without valid token.';
      error(errorMsg);
      return {
        successes: [],
        failures: topics.map(topic => ({ topic, error: errorMsg })),
      };
    }

    log('FCM token available, proceeding with topic subscriptions...');

    // iOS: Wait a moment for APNs registration to complete
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      log('APNs registration delay complete');
    }

    for (const topic of topics) {
      try {
        await messaging().subscribeToTopic(topic);
        log(`Successfully subscribed to topic: ${topic}`);
        successes.push(topic);
        // Track subscription in store
        useSettingStore.getState().addSubscribedTopic(topic);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error(`Failed to subscribe to topic ${topic}:`, errorMessage);
        failures.push({ topic, error: errorMessage });
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error('Failed to initialize topic subscription:', errorMessage);
    return {
      successes: [],
      failures: topics.map(topic => ({
        topic,
        error: `Initialization failed: ${errorMessage}`,
      })),
    };
  }

  return { successes, failures };
}

/**
 * Unsubscribe from FCM topics client-side
 * @param topics Array of topic names to unsubscribe from
 * @returns Object with successes and failures arrays
 */
export async function unsubscribeFromTopics(topics: string[]): Promise<{
  successes: string[];
  failures: Array<{ topic: string; error: string }>;
}> {
  const successes: string[] = [];
  const failures: Array<{ topic: string; error: string }> = [];

  try {
    // Ensure FCM token is available (same requirement as subscribe)
    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      const errorMsg =
        'No FCM token available. Cannot unsubscribe from topics without valid token.';
      error(errorMsg);
      return {
        successes: [],
        failures: topics.map(topic => ({ topic, error: errorMsg })),
      };
    }

    for (const topic of topics) {
      try {
        await messaging().unsubscribeFromTopic(topic);
        log(`Successfully unsubscribed from topic: ${topic}`);
        successes.push(topic);
        // Remove from store
        useSettingStore.getState().removeSubscribedTopic(topic);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error(`Failed to unsubscribe from topic ${topic}:`, errorMessage);
        failures.push({ topic, error: errorMessage });
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error('Failed to initialize topic unsubscription:', errorMessage);
    return {
      successes: [],
      failures: topics.map(topic => ({
        topic,
        error: `Initialization failed: ${errorMessage}`,
      })),
    };
  }

  return { successes, failures };
}
