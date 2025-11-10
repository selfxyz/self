// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import useUserStore from '@/stores/userStore';

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
    if (!referrer || isRegisteringReferral) {
      return;
    }

    const store = useUserStore.getState();

    // Check if this referrer has already been registered
    if (store.isReferrerRegistered(referrer)) {
      return;
    }

    // Register the referral
    const register = async () => {
      const result = await registerReferral(referrer);
      if (result.success) {
        store.markReferrerAsRegistered(referrer);
      }
    };

    register();
  }, [referrer, isRegisteringReferral, registerReferral]);
};
