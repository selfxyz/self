// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import messaging from '@react-native-firebase/messaging';

import { NotificationEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { navigationRef } from '@/navigation';
import { trackEvent } from '@/services/analytics';

/**
 * Handle navigation based on notification type and data
 */
const handleNotificationNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const notificationType = remoteMessage.data?.type;
  const status = remoteMessage.data?.status;

  // Handle KYC result notifications
  if (notificationType === 'kyc_result' && status === 'approved') {
    // Wait for navigation to be ready
    if (navigationRef.isReady()) {
      navigationRef.navigate('KYCVerified', {
        status: String(status),
        userId: remoteMessage.data?.user_id
          ? String(remoteMessage.data.user_id)
          : undefined,
      });
    }
  }
  // Add handling for other notification types here as needed
  // For retry/rejected statuses, could navigate to appropriate screens in future
};

export const NotificationTrackingProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  useEffect(() => {
    // Handle notification tap when app is in background
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      trackEvent(NotificationEvents.BACKGROUND_NOTIFICATION_OPENED, {
        messageId: remoteMessage.messageId,
        // Only track notification type/category if available
        type: remoteMessage.data?.type,
        // Track if user interacted with any actions
        actionId: remoteMessage.data?.actionId,
      });

      // Handle navigation based on notification type
      handleNotificationNavigation(remoteMessage);
    });

    // Handle notification tap when app is completely closed (cold start)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          trackEvent(NotificationEvents.COLD_START_NOTIFICATION_OPENED, {
            messageId: remoteMessage.messageId,
            // Only track notification type/category if available
            type: remoteMessage.data?.type,
            // Track if user interacted with any actions
            actionId: remoteMessage.data?.actionId,
          });

          // Handle navigation based on notification type
          handleNotificationNavigation(remoteMessage);
        }
      });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};
