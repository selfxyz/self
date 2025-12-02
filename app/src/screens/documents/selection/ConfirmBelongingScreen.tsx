// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import type { StaticScreenProps } from '@react-navigation/native';
import { usePreventRemove } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { ConfirmIdentificationScreen } from '@selfxyz/mobile-sdk-alpha/onboarding/confirm-identification';

import { flushAllAnalytics, trackNfcEvent } from '@/services/analytics';
import {
  getFCMToken,
  requestNotificationPermission,
} from '@/services/notifications/notificationService';
import { useSettingStore } from '@/stores/settingStore';

type ConfirmBelongingScreenProps = StaticScreenProps<Record<string, never>>;

// TODO -- need to set safe area insets for this screen.
const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = () => {
  // Prevents back navigation
  usePreventRemove(true, () => {});
  const setFcmToken = useSettingStore(state => state.setFcmToken);

  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;

  const grantNotificationsPermission = useCallback(async () => {
    trackEvent(ProofEvents.NOTIFICATION_PERMISSION_REQUESTED);

    // Request notification permission
    const permissionGranted = await requestNotificationPermission();
    if (permissionGranted) {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        trackEvent(ProofEvents.FCM_TOKEN_STORED);
      }
    }
  }, [trackEvent, setFcmToken]);

  const onOkPress = useCallback(async () => {
    try {
      await grantNotificationsPermission();
    } catch (error: unknown) {
      console.error('Error navigating:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });
      trackNfcEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });

      flushAllAnalytics();
    }
  }, [grantNotificationsPermission, trackEvent]);
  return <ConfirmIdentificationScreen onBeforeConfirm={onOkPress} />;
};

export default ConfirmBelongingScreen;
