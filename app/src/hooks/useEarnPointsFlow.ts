// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import type { RootStackParamList } from '@/navigation';
import useUserStore from '@/stores/userStore';
import { IS_DEV_MODE } from '@/utils/devUtils';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
  POINT_VALUES,
  pointsSelfApp,
} from '@/utils/points';

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
      navigation.navigate('Prove');
    }, 100);
  }, [selfClient, navigation]);

  const showIdentityVerificationModal = useCallback(() => {
    const callbackId = registerModalCallbacks({
      onButtonPress: () => {
        // Use setTimeout to ensure modal dismisses before navigating
        setTimeout(() => {
          navigation.navigate('DocumentOnboarding');
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

  const handleReferralFlow = useCallback(async () => {
    if (!referrer) {
      return;
    }

    if (IS_DEV_MODE) {
      console.log('[DEV MODE] Starting referral flow for referrer:', referrer);
    }

    const showReferralErrorModal = (errorMessage: string) => {
      const callbackId = registerModalCallbacks({
        onButtonPress: async () => {
          // Retry the referral flow
          await handleReferralFlow();
        },
        onModalDismiss: () => {
          // Preserve referrer for future retry attempts
          if (IS_DEV_MODE) {
            console.log(
              '[DEV MODE] Referral error modal dismissed, preserving referrer for retry',
            );
          }
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
      if (IS_DEV_MODE) {
        console.log(
          '[DEV MODE] 3. Registering referral (mocked in __DEV__)...',
        );
      }
      const result = await registerReferral(referrer);
      if (result.success) {
        store.markReferrerAsRegistered(referrer);
        if (IS_DEV_MODE) {
          console.log('[DEV MODE] ✓ Referral registration successful (mocked)');
        }

        // Only navigate to GratificationScreen on success
        if (IS_DEV_MODE) {
          console.log(
            '[DEV MODE] 4. Navigating to Gratification screen with points:',
            POINT_VALUES.referee,
          );
        }
        store.clearDeepLinkReferrer();
        navigation.navigate('Gratification', {
          points: POINT_VALUES.referee,
        });
      } else {
        // Registration failed - show error and preserve referrer
        const errorMessage = result.error || 'Unknown error occurred';
        if (IS_DEV_MODE) {
          console.error('[DEV MODE] Error registering referral:', errorMessage);
        }
        console.error('Referral registration failed:', errorMessage);

        // Show error modal with retry option, don't clear referrer
        showReferralErrorModal(errorMessage);
      }
    } else {
      if (IS_DEV_MODE) {
        console.log(
          '[DEV MODE] Referrer already registered, skipping registration',
        );
      }

      // Already registered, navigate to gratification
      if (IS_DEV_MODE) {
        console.log(
          '[DEV MODE] 4. Navigating to Gratification screen with points:',
          POINT_VALUES.referee,
        );
      }
      store.clearDeepLinkReferrer();
      navigation.navigate('Gratification', {
        points: POINT_VALUES.referee,
      });
    }
  }, [referrer, registerReferral, navigation]);

  const onEarnPointsPress = useCallback(
    async (skipReferralFlow = true) => {
      if (IS_DEV_MODE) {
        console.log(
          '[DEV MODE] 1. Checking if identity document is registered...',
        );
      }
      const hasUserAnIdentityDocumentRegistered_result =
        await hasUserAnIdentityDocumentRegistered();
      if (!hasUserAnIdentityDocumentRegistered_result) {
        if (IS_DEV_MODE) {
          console.log(
            '[DEV MODE] Identity document not registered, showing modal',
          );
        }
        showIdentityVerificationModal();
        return;
      }
      if (IS_DEV_MODE) {
        console.log('[DEV MODE] ✓ Identity document is registered');
      }

      if (IS_DEV_MODE) {
        console.log(
          '[DEV MODE] 2. Checking if points disclosure is completed...',
        );
      }
      const hasUserDoneThePointsDisclosure_result =
        await hasUserDoneThePointsDisclosure();
      if (!hasUserDoneThePointsDisclosure_result) {
        if (IS_DEV_MODE) {
          console.log(
            '[DEV MODE] Points disclosure not completed, showing modal',
          );
        }
        showPointsDisclosureModal();
        return;
      }
      if (IS_DEV_MODE) {
        console.log('[DEV MODE] ✓ Points disclosure is completed');
      }

      // User has completed both checks
      if (!skipReferralFlow && hasReferrer && isReferralConfirmed === true) {
        if (IS_DEV_MODE) {
          console.log(
            '[DEV MODE] 3. Both checks passed, proceeding with referral flow...',
          );
        }
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
      showPointsDisclosureModal,
      handleReferralFlow,
    ],
  );

  return { onEarnPointsPress };
};
