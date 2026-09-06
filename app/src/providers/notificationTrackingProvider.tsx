// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import messaging from '@react-native-firebase/messaging';

import { NotificationEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { isKycFlowEnabled } from '@/integrations/kyc';
import { navigationRef } from '@/navigation';
import { trackEvent } from '@/services/analytics';

// Queue for pending navigation actions that need to wait for navigation to be ready
let pendingNavigation: FirebaseMessagingTypes.RemoteMessage | null = null;

/**
 * Execute navigation for a notification
 * @returns true if navigation was executed, false if it needs to be queued
 */
const executeNotificationNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): boolean => {
  if (!navigationRef.isReady()) {
    return false;
  }

  const notificationType = remoteMessage.data?.type;
  const status = remoteMessage.data?.status;

  // Handle KYC result notifications
  if (notificationType === 'kyc_result') {
    if (status === 'approved') {
      navigationRef.navigate('KYCVerified', {
        status: String(status),
        userId: remoteMessage.data?.user_id
          ? String(remoteMessage.data.user_id)
          : undefined,
      });
      return true;
    } else if (status === 'rejected') {
      navigationRef.navigate('KycFailure', {
        canRetry: false,
      });
      return true;
    } else if (status === 'retry') {
      if (!isKycFlowEnabled()) {
        // The picker no longer offers KYC, so a retry cannot be honoured;
        // show the terminal failure state instead of stranding the user in
        // onboarding.
        navigationRef.navigate('KycFailure', { canRetry: false });
        return true;
      }
      // Take user directly to verification flow to retry
      navigationRef.navigate('CountryPicker');
      return true;
    }
  }

  return true; // Navigation handled (or not applicable)
};

/**
 * Handle navigation based on notification type and data
 * Queues navigation if navigationRef is not ready yet
 */
const handleNotificationNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const executed = executeNotificationNavigation(remoteMessage);

  if (!executed) {
    // Navigation not ready yet - queue for later
    pendingNavigation = remoteMessage;
    if (__DEV__) {
      console.log(
        'Navigation not ready, queuing notification navigation:',
        remoteMessage.data?.type,
      );
    }
  }
};

/**
 * Process any pending navigation once navigation is ready
 */
const processPendingNavigation = () => {
  if (pendingNavigation && navigationRef.isReady()) {
    if (__DEV__) {
      console.log(
        'Processing pending notification navigation:',
        pendingNavigation.data?.type,
      );
    }
    executeNotificationNavigation(pendingNavigation);
    pendingNavigation = null;
  }
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

  // Monitor navigation readiness and process pending navigation
  useEffect(() => {
    // Check immediately if navigation is already ready
    if (navigationRef.isReady()) {
      processPendingNavigation();
      return;
    }

    // Poll for navigation readiness if not ready yet
    const checkInterval = setInterval(() => {
      if (navigationRef.isReady()) {
        processPendingNavigation();
        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup interval on unmount
    return () => clearInterval(checkInterval);
  }, []);

  return <>{children}</>;
};
