// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef } from 'react';

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
 * @param shouldAutoTrigger - Whether to automatically trigger the flow after 3 seconds (default: false)
 */
export const useTestReferralFlow = (shouldAutoTrigger = false) => {
  const referralTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReferralFlow = useCallback(() => {
    if (IS_DEV_MODE) {
      const testReferrer = TEST_REFERRER;
      const store = useUserStore.getState();

      store.setDeepLinkReferrer(testReferrer);
      // Trigger the referral confirmation modal
      // The useReferralConfirmation hook will handle showing the modal
    }
  }, []);

  // Automatic trigger after 3 seconds (only if shouldAutoTrigger is true)
  useEffect(() => {
    if (IS_DEV_MODE && shouldAutoTrigger) {
      referralTimerRef.current = setTimeout(() => {
        triggerReferralFlow();
      }, 3000);
    }

    return () => {
      if (referralTimerRef.current) {
        clearTimeout(referralTimerRef.current);
      }
    };
  }, [triggerReferralFlow, shouldAutoTrigger]);

  const handleTestReferralFlow = useCallback(() => {
    if (IS_DEV_MODE) {
      triggerReferralFlow();
    }
  }, [triggerReferralFlow]);

  return {
    handleTestReferralFlow,
    isDevMode: IS_DEV_MODE,
  };
};
