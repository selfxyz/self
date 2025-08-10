// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';

import { NotificationEvents } from '@/consts/analytics';
import analytics from '@/utils/analytics';

const { trackEvent } = analytics();

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
