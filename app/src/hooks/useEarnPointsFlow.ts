// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import type { RootStackParamList } from '@/navigation';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
  POINT_VALUES,
  pointsSelfApp,
} from '@/services/points';
import useUserStore from '@/stores/userStore';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

type UseEarnPointsFlowParams = {
  hasReferrer: boolean;
  isReferralConfirmed: boolean | undefined;
};

export const useEarnPointsFlow = ({
  hasReferrer,
  isReferralConfirmed,
}: UseEarnPointsFlowParams) => {
  const selfClient = useSelfClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerReferral } = useRegisterReferral();
  const referrer = useUserStore(state => state.deepLinkReferrer);

  const navigateToPointsProof = useCallback(async () => {
    const selfApp = await pointsSelfApp();
    selfClient.getSelfAppState().setSelfApp(selfApp);

    // Use setTimeout to ensure modal dismisses before navigating
    setTimeout(() => {
      navigation.navigate('ProvingScreenRouter');
    }, 100);
  }, [selfClient, navigation]);

  const showIdentityVerificationModal = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: () => {
        // Use setTimeout to ensure modal dismisses before navigating
        setTimeout(() => {
          navigation.navigate('CountryPicker');
        }, 100);
      },
      onModalDismiss: () => {
        if (hasReferrer) {
          useUserStore.getState().clearDeepLinkReferrer();
        }
      },
    });

    navigation.navigate('Modal', {
      titleText: 'Identity Verification Required',
      bodyText:
        'To access Self Points, you need to register an identity document with Self first. This helps us verify your identity and keep your points secure.',
      buttonText: 'Verify Identity',
      secondaryButtonText: 'Not Now',
      callbackId,
    });
  }, [hasReferrer, navigation]);

  const showPointsDisclosureModal = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: () => {
        navigateToPointsProof();
      },
      onModalDismiss: () => {
        if (hasReferrer) {
          useUserStore.getState().clearDeepLinkReferrer();
        }
      },
    });

    navigation.navigate('Modal', {
      titleText: 'Points Disclosure Required',
      bodyText:
        'To access Self Points, you need to complete the points disclosure first. This helps us verify your identity and keep your points secure.',
      buttonText: 'Complete Points Disclosure',
      secondaryButtonText: 'Not Now',
      callbackId,
    });
  }, [hasReferrer, navigation, navigateToPointsProof]);

  const showPointsInfoScreen = useCallback(() => {
    navigation.navigate('PointsInfo', {
      showNextButton: true,
      onNextButtonPress: () => {
        showPointsDisclosureModal();
      },
    });
  }, [navigation, showPointsDisclosureModal]);

  const handleReferralFlow = useCallback(async () => {
    if (!referrer) {
      return;
    }

    const showReferralErrorModal = (errorMessage: string) => {
      const callbackId = registerModalCallbacks({
        onButtonPress: async () => {
          await handleReferralFlow();
        },
        onModalDismiss: () => {
          // Clear referrer when user dismisses to prevent retry loop
          useUserStore.getState().clearDeepLinkReferrer();
        },
      });

      navigation.navigate('Modal', {
        titleText: 'Referral Registration Failed',
        bodyText: `We couldn't register your referral at this time. ${errorMessage}. You can try again or dismiss this message.`,
        buttonText: 'Try Again',
        secondaryButtonText: 'Dismiss',
        callbackId,
      });
    };

    const store = useUserStore.getState();
    // Check if already registered to avoid duplicate calls
    if (!store.isReferrerRegistered(referrer)) {
      const result = await registerReferral(referrer);
      if (result.success) {
        store.markReferrerAsRegistered(referrer);

        // Only navigate to GratificationScreen on success
        store.clearDeepLinkReferrer();
        navigation.navigate('Gratification', {
          points: POINT_VALUES.referee,
        });
      } else {
        // Registration failed - show error and preserve referrer
        const errorMessage = result.error || 'Unknown error occurred';
        console.error('Referral registration failed:', errorMessage);

        // Show error modal with retry option, don't clear referrer
        showReferralErrorModal(errorMessage);
      }
    } else {
      // Already registered, navigate to gratification
      store.clearDeepLinkReferrer();
      navigation.navigate('Gratification', {
        points: POINT_VALUES.referee,
      });
    }
  }, [referrer, registerReferral, navigation]);

  const onEarnPointsPress = useCallback(
    async (skipReferralFlow = true) => {
      const hasUserAnIdentityDocumentRegistered_result =
        await hasUserAnIdentityDocumentRegistered();
      if (!hasUserAnIdentityDocumentRegistered_result) {
        showIdentityVerificationModal();
        return;
      }

      const hasUserDoneThePointsDisclosure_result =
        await hasUserDoneThePointsDisclosure();
      if (!hasUserDoneThePointsDisclosure_result) {
        showPointsInfoScreen();
        return;
      }

      // User has completed both checks
      if (!skipReferralFlow && hasReferrer && isReferralConfirmed === true) {
        await handleReferralFlow();
      } else {
        // Just go to points upon pressing "Earn Points" button
        if (!hasReferrer) {
          navigation.navigate('Points');
        }
      }
    },
    [
      hasReferrer,
      isReferralConfirmed,
      navigation,
      showIdentityVerificationModal,
      showPointsInfoScreen,
      handleReferralFlow,
    ],
  );

  return { onEarnPointsPress };
};
