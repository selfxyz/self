// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  API_URL,
  API_URL_STAGING,
  DeviceTokenRegistration,
  getStateMessage,
  RemoteMessage,
} from './notificationService.shared';

export { getStateMessage };
// Determine if running in test environment
const isTestEnv = process.env.NODE_ENV === 'test';
const log = (...args: any[]) => {
  if (!isTestEnv) console.log(...args);
};
const error = (...args: any[]) => {
  if (!isTestEnv) console.error(...args);
};

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

export function setupNotifications(): () => void {
  messaging().setBackgroundMessageHandler(
    async (remoteMessage: RemoteMessage) => {
      log('Message handled in the background!', remoteMessage);
    },
  );

  const unsubscribeForeground = messaging().onMessage(
    async (remoteMessage: RemoteMessage) => {
      log('Foreground message received:', remoteMessage);
    },
  );

  return unsubscribeForeground;
}
