//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import messaging from '@react-native-firebase/messaging';
import React, { PropsWithChildren, useEffect } from 'react';

import { NotificationEvents } from '../consts/analytics';
import analytics from '../utils/analytics';

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
