// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation';
import useUserStore from '@/stores/userStore';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

type UseReferralConfirmationParams = {
  hasReferrer: boolean;
  onConfirmed: () => void;
};

export const useReferralConfirmation = ({
  hasReferrer,
  onConfirmed,
}: UseReferralConfirmationParams) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const referrer = useUserStore(state => state.deepLinkReferrer);
  const isReferrerRegistered = useUserStore(
    state => state.isReferrerRegistered,
  );

  // State machine: undefined (not shown) → true (confirmed) / false (dismissed)
  const [isReferralConfirmed, setIsReferralConfirmed] = useState<
    boolean | undefined
  >(undefined);

  // Guard to ensure callback executes exactly once per referral
  const hasTriggeredFlowRef = useRef(false);

  const showReferralConfirmationModal = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: async () => {
        setIsReferralConfirmed(true);
        // CRITICAL: setTimeout ensures React completes render cycle before navigation
        // Without this, navigation happens with stale state causing flow to re-trigger
        setTimeout(() => {
          navigation.goBack();
        }, 100);
      },
      onModalDismiss: () => {
        setIsReferralConfirmed(false);
        useUserStore.getState().clearDeepLinkReferrer();
      },
    });

    navigation.navigate('Modal', {
      titleText: 'Referral Confirmation',
      bodyText:
        'Seems like you opened the app from a referral link. Please confirm to continue.',
      buttonText: 'Confirm',
      secondaryButtonText: 'Dismiss',
      callbackId,
    });
  }, [navigation]);

  // Reset the trigger flag when referrer changes or is cleared
  useEffect(() => {
    hasTriggeredFlowRef.current = false;
  }, [referrer]);

  // Handle referral confirmation flow
  useEffect(() => {
    // === Common validation: Has valid, unregistered referrer ===
    const hasValidReferrer =
      hasReferrer && referrer && !isReferrerRegistered(referrer);

    // === CHECK 1: Execute callback after user confirms (evaluated first due to early return) ===
    const shouldExecuteCallback =
      hasValidReferrer &&
      isReferralConfirmed === true &&
      !hasTriggeredFlowRef.current;

    if (shouldExecuteCallback) {
      console.log('[Referral] Scheduling onConfirmed callback');
      hasTriggeredFlowRef.current = true;
      // CRITICAL: setTimeout ensures React completes render cycle before executing callback
      // This prevents stale closure issues where the callback has old state values
      setTimeout(() => {
        console.log('[Referral] Executing onConfirmed callback');
        onConfirmed();
      }, 150);
      return;
    }

    // === CHECK 2: Show modal for unconfirmed referrals ===
    const shouldShowModal =
      hasValidReferrer && isReferralConfirmed === undefined;

    if (shouldShowModal) {
      showReferralConfirmationModal();
    }
  }, [
    hasReferrer,
    referrer,
    isReferralConfirmed,
    isReferrerRegistered,
    showReferralConfirmationModal,
    onConfirmed,
  ]);

  return { isReferralConfirmed };
};
