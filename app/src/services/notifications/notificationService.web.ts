// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DeviceTokenRegistration } from '@/services/notifications/notificationService.shared';
import {
  API_URL,
  API_URL_STAGING,
  getStateMessage,
} from '@/services/notifications/notificationService.shared';

export async function getFCMToken(): Promise<string | null> {
  try {
    // For web, we'll generate a simple token or use a service worker registration
    // In a real implementation, you might want to use Firebase Web SDK or a custom solution
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker
        .register('/sw.js')
        .catch(() => null);
      if (registration) {
        // Generate a simple token based on registration
        const token = `web_${registration.active?.scriptURL || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Web FCM Token generated');
        return token;
      }
    }

    // Fallback: generate a simple token
    const token = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Web FCM Token generated (fallback)');
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

// TODO: web handle notifications better. this file is more or less a fancy placeholder
export { getStateMessage };

/**
 * Check if notifications are ready (web stub)
 * @returns readiness status
 */
export async function isNotificationSystemReady(): Promise<{
  ready: boolean;
  message: string;
}> {
  try {
    if (!('Notification' in window)) {
      return {
        ready: false,
        message: 'This browser does not support notifications',
      };
    }

    if (Notification.permission === 'granted') {
      return {
        ready: true,
        message: 'Notification system is ready',
      };
    }

    if (Notification.permission === 'denied') {
      return {
        ready: false,
        message:
          'Notification permissions denied. Please enable them in browser settings.',
      };
    }

    return {
      ready: false,
      message: 'Notification permissions not requested yet',
    };
  } catch (error) {
    console.error('Failed to check notification readiness:', error);
    return {
      ready: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
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
      const fcmToken = await getFCMToken();
      if (!fcmToken) {
        console.log('No FCM token available');
        return;
      }
      token = fcmToken;
    }

    const cleanedToken = token.trim();
    const baseUrl = isMockPassport ? API_URL_STAGING : API_URL;

    const deviceTokenRegistration: DeviceTokenRegistration = {
      session_id: sessionId,
      device_token: cleanedToken,
      platform: 'web',
    };

    if (cleanedToken.length > 10) {
      console.log(
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
      console.error(
        'Failed to register device token:',
        response.status,
        errorText,
      );
    } else {
      console.log(
        'Device token registered successfully with session_id:',
        sessionId,
      );
    }
  } catch (error) {
    console.error('Error registering device token:', error);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';

    console.log('Notification permission status:', enabled);
    return enabled;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export function setupNotifications(): () => void {
  // For web, we'll set up service worker for background notifications
  // and handle foreground notifications directly

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  }

  // For web, we don't have a direct equivalent to Firebase messaging
  // You might want to implement WebSocket or Server-Sent Events for real-time notifications
  // For now, we'll return a no-op unsubscribe function
  return () => {
    console.log('Web notification service cleanup');
  };
}

/**
 * Subscribe to FCM topics client-side (web stub)
 * @param topics Array of topic names to subscribe to
 * @returns Object with successes and failures arrays
 */
export async function subscribeToTopics(topics: string[]): Promise<{
  successes: string[];
  failures: Array<{ topic: string; error: string }>;
}> {
  console.warn(
    'FCM topic subscription is not fully implemented for web. Topics:',
    topics,
  );
  // For web, you might want to implement this by calling your backend API
  // or using Firebase Web SDK
  return {
    successes: [],
    failures: topics.map(topic => ({
      topic,
      error: 'Web topic subscription not implemented',
    })),
  };
}

/**
 * Unsubscribe from FCM topics client-side (web stub)
 * @param topics Array of topic names to unsubscribe from
 * @returns Object with successes and failures arrays
 */
export async function unsubscribeFromTopics(topics: string[]): Promise<{
  successes: string[];
  failures: Array<{ topic: string; error: string }>;
}> {
  console.warn(
    'FCM topic unsubscription is not fully implemented for web. Topics:',
    topics,
  );
  return {
    successes: [],
    failures: topics.map(topic => ({
      topic,
      error: 'Web topic unsubscription not implemented',
    })),
  };
}
