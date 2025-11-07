// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import useUserStore from '@/stores/userStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

/**
 * Hook to handle referral registration when a referrer is present in route params.
 * Automatically registers the referral if:
 * - A referrer is present in route params
 * - The referrer hasn't been registered yet
 * - Registration is not already in progress
 */
export const useReferralRegistration = () => {
  const route = useRoute();
  const params = route.params as { referrer?: string } | undefined;
  const referrer = params?.referrer;
  const { registerReferral, isLoading: isRegisteringReferral } =
    useRegisterReferral();

  useEffect(() => {
    if (IS_DEV_MODE) {
      if (referrer) {
        console.log(
          '[useReferralRegistration] Referrer found in params:',
          referrer,
        );
      } else {
        console.log('[useReferralRegistration] No referrer in route params');
      }
    }

    if (!referrer || isRegisteringReferral) {
      return;
    }

    const store = useUserStore.getState();

    // Check if this referrer has already been registered
    if (store.isReferrerRegistered(referrer)) {
      if (IS_DEV_MODE) {
        console.log(
          '[useReferralRegistration] Referrer already registered:',
          referrer,
        );
      }
      return;
    }

    if (IS_DEV_MODE) {
      console.log('[useReferralRegistration] Registering referrer:', referrer);
    }

    // Register the referral
    const register = async () => {
      const result = await registerReferral(referrer);
      if (result.success) {
        store.markReferrerAsRegistered(referrer);
        if (IS_DEV_MODE) {
          console.log(
            '[useReferralRegistration] Successfully registered referrer:',
            referrer,
          );
        }
      } else {
        if (IS_DEV_MODE) {
          console.error(
            '[useReferralRegistration] Failed to register referrer:',
            result.error,
          );
        }
      }
    };

    register();
  }, [referrer, isRegisteringReferral, registerReferral]);
};
