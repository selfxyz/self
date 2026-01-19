// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';

import { NotificationEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { trackEvent } from '@/services/analytics';

export const NotificationTrackingProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      trackEvent(NotificationEvents.BACKGROUND_NOTIFICATION_OPENED, {
        messageId: remoteMessage.messageId,
        // Only track notification type/category if available
        type: remoteMessage.data?.type,
        // Track if user interacted with any actions
        actionId: remoteMessage.data?.actionId,
      });
    });

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
        }
      });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};
