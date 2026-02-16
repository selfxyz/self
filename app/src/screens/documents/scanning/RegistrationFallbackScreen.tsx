// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HelpCircle } from '@tamagui/lucide-icons/icons/HelpCircle';
import { X } from '@tamagui/lucide-icons/icons/X';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  cyan300,
  slate100,
  slate200,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import WarningIcon from '@/assets/images/warning.svg';
import { useSumsubLauncher } from '@/hooks/useSumsubLauncher';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

type FallbackErrorSource =
  | 'mrz_scan_failed'
  | 'nfc_scan_failed'
  | 'sumsub_initialization'
  | 'sumsub_verification';

type RegistrationFallbackRouteParams = {
  errorSource: FallbackErrorSource;
  countryCode: string;
};

type RegistrationFallbackRoute = RouteProp<
  Record<string, RegistrationFallbackRouteParams>,
  string
>;

const getHeaderTitle = (errorSource: FallbackErrorSource): string => {
  switch (errorSource) {
    case 'mrz_scan_failed':
      return 'MRZ SCAN';
    case 'nfc_scan_failed':
      return 'NFC SCAN';
    default:
      return 'REGISTRATION';
  }
};

const getCurrentStep = (errorSource: FallbackErrorSource): number => {
  switch (errorSource) {
    case 'mrz_scan_failed':
      return 1; // Step 1: MRZ scanning
    case 'nfc_scan_failed':
      return 2; // Step 2: NFC reading
    case 'sumsub_initialization':
    case 'sumsub_verification':
      return 3; // Step 3: Proving/verification
    default:
      return 1;
  }
};

const getRetryButtonText = (errorSource: FallbackErrorSource): string => {
  switch (errorSource) {
    case 'mrz_scan_failed':
      return 'Try scanning again';
    case 'nfc_scan_failed':
      return 'Try reading again';
    default:
      return 'Try again';
  }
};

const getErrorMessages = (
  errorSource: FallbackErrorSource,
): { title: string; description: string; canRetryOriginal: boolean } => {
  switch (errorSource) {
    case 'mrz_scan_failed':
      return {
        title: 'There was a problem scanning your document',
        description: 'Make sure the document is clearly visible and try again',
        canRetryOriginal: true,
      };
    case 'nfc_scan_failed':
      return {
        title: 'There was a problem reading the chip',
        description: 'Make sure NFC is enabled and try again',
        canRetryOriginal: true,
      };
    case 'sumsub_initialization':
      return {
        title: 'Connection Error',
        description:
          'Unable to connect to verification service. Please check your internet connection and try again.',
        canRetryOriginal: false,
      };
    case 'sumsub_verification':
      return {
        title: 'Verification Error',
        description:
          'Something went wrong during the verification process. Please try again.',
        canRetryOriginal: false,
      };
  }
};

const RegistrationFallbackScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RegistrationFallbackRoute>();
  const selfClient = useSelfClient();
  const { trackEvent, useMRZStore } = selfClient;
  const storeCountryCode = useMRZStore(state => state.countryCode);

  const errorSource = route.params?.errorSource || 'sumsub_initialization';
  // Use country code from route params, or fall back to MRZ store
  const countryCode = route.params?.countryCode || storeCountryCode || '';

  const headerTitle = getHeaderTitle(errorSource);
  const retryButtonText = getRetryButtonText(errorSource);
  const currentStep = getCurrentStep(errorSource);
  const { title, description, canRetryOriginal } =
    getErrorMessages(errorSource);

  const { launchSumsubVerification, isLoading: isRetrying } = useSumsubLauncher(
    {
      countryCode,
      errorSource,
      onCancel: () => {
        navigation.goBack();
      },
      onError: (_error, _result) => {
        // Stay on this screen - user can try again
        // Error is already logged in the hook
      },
      onSuccess: () => {
        // Success - provider handles its own success UI
        // The screen will be navigated away by the provider's flow
      },
    },
  );

  const handleClose = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const handleTryAlternative = useCallback(async () => {
    buttonTap();
    trackEvent('REGISTRATION_FALLBACK_TRY_ALTERNATIVE', { errorSource });
    await launchSumsubVerification();
  }, [errorSource, launchSumsubVerification, trackEvent]);

  const handleRetryOriginal = useCallback(() => {
    buttonTap();
    trackEvent('REGISTRATION_FALLBACK_RETRY_ORIGINAL', { errorSource });

    // Navigate back to the appropriate screen based on error source
    if (errorSource === 'mrz_scan_failed') {
      navigation.navigate('DocumentCamera');
    } else if (errorSource === 'nfc_scan_failed') {
      navigation.navigate('DocumentNFCScan', {});
    } else if (errorSource === 'sumsub_initialization') {
      // Go back to ID Picker
      navigation.goBack();
    }
    // TODO: Handle 'sumsub_verification' case - currently falls through without action
    // which could leave users stuck when tapping "Try again" after Sumsub verification failure.
    // Consider: calling launchSumsubVerification() or navigating to appropriate retry screen.
    // Need to determine the correct retry behavior for failed Sumsub verifications.
  }, [errorSource, navigation, trackEvent]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
      {/* Header */}
      <YStack backgroundColor={slate100}>
        <XStack
          backgroundColor={slate100}
          padding={20}
          justifyContent="space-between"
          alignItems="center"
          paddingTop={Math.max(insets.top, 15) + extraYPadding}
          paddingBottom={10}
        >
          <Button
            unstyled
            onPress={handleClose}
            padding={8}
            borderRadius={20}
            hitSlop={10}
          >
            <X size={24} color={black} />
          </Button>

          <BodyText
            style={{
              fontSize: 16,
              color: black,
              fontWeight: '600',
              fontFamily: dinot,
            }}
          >
            {headerTitle}
          </BodyText>

          <Button
            unstyled
            padding={8}
            borderRadius={20}
            hitSlop={10}
            width={32}
            height={32}
            justifyContent="center"
            alignItems="center"
            disabled
          >
            <HelpCircle size={20} color={black} opacity={0} />
          </Button>
        </XStack>

        {/* Progress Bar */}
        <YStack paddingHorizontal={40} paddingBottom={10}>
          <XStack gap={3} height={6}>
            {[1, 2, 3, 4].map(step => (
              <YStack
                key={step}
                flex={1}
                backgroundColor={step === currentStep ? cyan300 : slate300}
                borderRadius={10}
              />
            ))}
          </XStack>
        </YStack>
      </YStack>

      {/* Warning Icon */}
      <YStack flex={1} paddingHorizontal={20} paddingTop={20}>
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          paddingVertical={20}
        >
          <WarningIcon width={120} height={120} />
        </YStack>
      </YStack>

      {/* Error Message */}
      <YStack
        paddingHorizontal={20}
        paddingTop={20}
        alignItems="center"
        paddingVertical={25}
      >
        <BodyText style={{ fontSize: 19, textAlign: 'center', color: black }}>
          {title}
        </BodyText>
        <BodyText
          style={{
            marginTop: 6,
            fontSize: 17,
            textAlign: 'center',
            color: slate500,
          }}
        >
          {description}
        </BodyText>
      </YStack>

      {/* Top Button - Retry */}
      {canRetryOriginal && (
        <YStack paddingHorizontal={25} paddingBottom={20}>
          <PrimaryButton onPress={handleRetryOriginal} disabled={isRetrying}>
            {retryButtonText}
          </PrimaryButton>
        </YStack>
      )}

      {/* Bottom Section with Grey Line Separator */}
      <YStack
        paddingHorizontal={25}
        backgroundColor={white}
        paddingBottom={paddingBottom}
        paddingTop={25}
        gap="$3"
        borderTopWidth={1}
        borderTopColor={slate200}
      >
        <SecondaryButton onPress={handleTryAlternative} disabled={isRetrying}>
          {isRetrying ? 'Loading...' : 'Try a different method'}
        </SecondaryButton>

        {/* Footer Text */}
        <BodyText
          style={{
            fontSize: 15,
            textAlign: 'center',
            color: slate500,
            fontStyle: 'italic',
            marginTop: 8,
          }}
        >
          Registering with alternative methods may take longer to verify your
          document.
        </BodyText>
      </YStack>
    </YStack>
  );
};

export default RegistrationFallbackScreen;
