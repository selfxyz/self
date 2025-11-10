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
  const [isReferralConfirmed, setIsReferralConfirmed] = useState<
    boolean | undefined
  >(undefined);
  const hasTriggeredFlowRef = useRef(false);

  const showReferralConfirmationModal = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: async () => {
        setIsReferralConfirmed(true);
        // Use setTimeout to ensure state updates and modal dismisses before navigation
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
    console.log('[Referral] useReferralConfirmation effect triggered', {
      isReferralConfirmed,
      hasReferrer,
      referrer,
      isReferrerRegistered: referrer ? isReferrerRegistered(referrer) : null,
      hasTriggeredFlow: hasTriggeredFlowRef.current,
    });

    // This should trigger the flow when user comes back from any of the onboarding screens
    // Only trigger once when confirmed, and ensure the referrer hasn't been registered yet
    if (
      isReferralConfirmed === true &&
      hasReferrer &&
      referrer &&
      !isReferrerRegistered(referrer) &&
      !hasTriggeredFlowRef.current
    ) {
      console.log('[Referral] Scheduling onConfirmed callback');
      hasTriggeredFlowRef.current = true;
      // Use setTimeout to ensure React re-renders with updated state before calling callback
      // This prevents stale closure issues where the callback has old state values
      setTimeout(() => {
        console.log('[Referral] Executing onConfirmed callback');
        onConfirmed();
      }, 150);
      return;
    }

    // Only show modal if referrer exists, not yet confirmed, and hasn't been registered
    if (
      hasReferrer &&
      referrer &&
      isReferralConfirmed === undefined &&
      !isReferrerRegistered(referrer)
    ) {
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
