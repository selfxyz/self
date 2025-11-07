// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import useUserStore from '@/stores/userStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

const TEST_REFERRER = '0x1234567890123456789012345678901234567890';

/**
 * Hook for testing referral flow in DEV mode.
 * Provides automatic timeout trigger (15 seconds) and manual trigger function.
 *
 * Flow: Sets referrer → shows confirmation modal → on confirm, checks prerequisites
 * → if identity doc & points disclosure done → registers referral → navigates to Gratification
 */
export const useTestReferralFlow = () => {
  const referralTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic trigger after 15 seconds
  useEffect(() => {
    if (IS_DEV_MODE) {
      console.log('[DEV MODE] Referral flow test will prompt in 15 seconds...');
      referralTimerRef.current = setTimeout(() => {
        showReferralFlowAlert();
      }, 15000); // 15 seconds
    }

    return () => {
      if (referralTimerRef.current) {
        clearTimeout(referralTimerRef.current);
      }
    };
  }, [showReferralFlowAlert]);

  const triggerReferralFlow = useCallback(() => {
    if (IS_DEV_MODE) {
      const testReferrer = TEST_REFERRER;
      console.log(
        '[DEV MODE] Simulating referral flow with referrer:',
        testReferrer,
      );
      useUserStore.getState().setDeepLinkReferrer(testReferrer);
      // Trigger the referral confirmation modal
      // The useReferralConfirmation hook will handle showing the modal
    }
  }, []);

  const showReferralFlowAlert = useCallback(() => {
    if (IS_DEV_MODE) {
      Alert.alert(
        'DEV MODE: Test Referral Flow',
        'Start the referral flow test now?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('[DEV MODE] Referral flow test cancelled');
            },
          },
          {
            text: 'Start',
            onPress: triggerReferralFlow,
          },
        ],
      );
    }
  }, [triggerReferralFlow]);

  const handleTestReferralFlow = useCallback(() => {
    if (IS_DEV_MODE) {
      showReferralFlowAlert();
    }
  }, [showReferralFlowAlert]);

  return {
    handleTestReferralFlow,
    isDevMode: IS_DEV_MODE,
  };
};
