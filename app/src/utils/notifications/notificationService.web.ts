// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import {
  API_URL,
  API_URL_STAGING,
  DeviceTokenRegistration,
  getStateMessage,
} from './notificationService.shared';

// TODO: web handle notifications better. this file is more or less a fancy placeholder

export { getStateMessage };

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
