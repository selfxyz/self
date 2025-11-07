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
 * Provides automatic timeout trigger (3 seconds) and manual trigger function.
 *
 * Flow: Sets referrer → shows confirmation modal → on confirm, checks prerequisites
 * → if identity doc & points disclosure done → registers referral → navigates to Gratification
 *
 * @param isFocused - Whether the screen is currently focused (prevents showing alert on other screens)
 * @param shouldAutoTrigger - Whether to automatically trigger the alert after 3 seconds (default: false)
 */
export const useTestReferralFlow = (
  isFocused = true,
  shouldAutoTrigger = false,
) => {
  const referralTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFocusedRef = useRef(isFocused);

  // Keep the ref updated
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const triggerReferralFlow = useCallback(() => {
    if (IS_DEV_MODE) {
      const testReferrer = TEST_REFERRER;
      const store = useUserStore.getState();

      // Always reset state for full flow testing
      console.log('[DEV MODE] Resetting test state for full flow:');
      console.log('  - Clearing all registered referrers');
      // Clear the "already registered" flag for all referrers
      useUserStore.setState({ registeredReferrers: new Set<string>() });
      console.log('  - Referrer will be treated as first-time registration');

      console.log(
        '[DEV MODE] Simulating referral flow with referrer:',
        testReferrer,
      );
      store.setDeepLinkReferrer(testReferrer);
      // Trigger the referral confirmation modal
      // The useReferralConfirmation hook will handle showing the modal
    }
  }, []);

  const showReferralFlowAlert = useCallback(() => {
    // Only show alert if screen is focused
    if (IS_DEV_MODE && isFocusedRef.current) {
      Alert.alert(
        'DEV MODE: Test Referral Flow',
        'Start the full referral flow test? (Will reset test state)',
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
    } else if (IS_DEV_MODE && !isFocusedRef.current) {
      console.log(
        '[DEV MODE] Skipping referral flow alert - screen not focused',
      );
    }
  }, [triggerReferralFlow]);

  // Automatic trigger after 3 seconds (only if shouldAutoTrigger is true)
  useEffect(() => {
    if (IS_DEV_MODE && shouldAutoTrigger) {
      console.log('[DEV MODE] Referral flow test will prompt in 3 seconds...');
      referralTimerRef.current = setTimeout(() => {
        showReferralFlowAlert();
      }, 3000); // 3 seconds
    }

    return () => {
      if (referralTimerRef.current) {
        clearTimeout(referralTimerRef.current);
      }
    };
  }, [showReferralFlowAlert, shouldAutoTrigger]);

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
