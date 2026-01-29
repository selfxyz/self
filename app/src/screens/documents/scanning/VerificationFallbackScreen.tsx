// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import WarningIcon from '@/assets/images/warning.svg';
import { useSumsubLauncher } from '@/hooks/useSumsubLauncher';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

type FallbackErrorSource =
  | 'mrz_scan_failed'
  | 'nfc_scan_failed'
  | 'sumsub_initialization'
  | 'sumsub_verification';

type VerificationFallbackRouteParams = {
  errorSource: FallbackErrorSource;
  countryCode: string;
};

type VerificationFallbackRoute = RouteProp<
  Record<string, VerificationFallbackRouteParams>,
  string
>;

const getErrorMessages = (
  errorSource: FallbackErrorSource,
): { title: string; description: string; canRetryOriginal: boolean } => {
  switch (errorSource) {
    case 'mrz_scan_failed':
      return {
        title: 'Scanning Failed',
        description:
          'Unable to scan your document. You can try scanning again or use alternative verification.',
        canRetryOriginal: true,
      };
    case 'nfc_scan_failed':
      return {
        title: 'NFC Scan Failed',
        description:
          'Unable to read your document chip. You can try again or use alternative verification.',
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

const VerificationFallbackScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<VerificationFallbackRoute>();
  const { trackEvent } = useSelfClient();

  const errorSource = route.params?.errorSource || 'sumsub_initialization';
  const countryCode = route.params?.countryCode || '';

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

  const handleTryAlternative = useCallback(async () => {
    trackEvent('VERIFICATION_FALLBACK_TRY_ALTERNATIVE', { errorSource });
    await launchSumsubVerification();
  }, [errorSource, launchSumsubVerification, trackEvent]);

  const handleRetryOriginal = useCallback(() => {
    trackEvent('VERIFICATION_FALLBACK_RETRY_ORIGINAL', { errorSource });

    // Navigate back to the appropriate screen based on error source
    if (errorSource === 'mrz_scan_failed') {
      navigation.navigate('DocumentCamera');
    } else if (errorSource === 'nfc_scan_failed') {
      navigation.navigate('DocumentNFCScan', {});
    } else if (errorSource === 'sumsub_initialization') {
      // Go back to ID Picker
      navigation.goBack();
    }
  }, [errorSource, navigation, trackEvent]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
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

      <YStack
        paddingHorizontal={20}
        paddingTop={20}
        alignItems="center"
        paddingVertical={25}
        borderBlockWidth={1}
        borderBlockColor={slate200}
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

      <YStack
        paddingHorizontal={25}
        backgroundColor={white}
        paddingBottom={paddingBottom}
        paddingTop={25}
        gap="$3"
      >
        <PrimaryButton onPress={handleTryAlternative} disabled={isRetrying}>
          {isRetrying ? 'Loading...' : 'Try Alternative Verification'}
        </PrimaryButton>

        {canRetryOriginal && (
          <SecondaryButton onPress={handleRetryOriginal} disabled={isRetrying}>
            Try Scanning Again
          </SecondaryButton>
        )}
      </YStack>
    </YStack>
  );
};

export default VerificationFallbackScreen;
