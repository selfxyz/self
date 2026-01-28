// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import { fetchAccessToken, launchSumsub } from '@/integrations/sumsub';
import WarningIcon from '@/assets/images/warning.svg';
import { extraYPadding } from '@/utils/styleUtils';

type KycErrorRouteParams = {
  errorSource: 'initialization' | 'verification';
  countryCode: string;
};

type KycErrorRoute = RouteProp<Record<string, KycErrorRouteParams>, string>;

const getErrorMessages = (
  errorSource: 'initialization' | 'verification',
): { title: string; description: string } => {
  if (errorSource === 'initialization') {
    return {
      title: 'Connection Error',
      description:
        'Unable to connect to verification service. Please check your internet connection and try again.',
    };
  }
  return {
    title: 'Verification Error',
    description:
      'Something went wrong during the verification process. Please try again.',
  };
};

const KycErrorScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation = useNavigation();
  const route = useRoute<KycErrorRoute>();
  const { trackEvent } = useSelfClient();
  const [isRetrying, setIsRetrying] = useState(false);

  const errorSource = route.params?.errorSource || 'initialization';
  const countryCode = route.params?.countryCode;

  const { title, description } = getErrorMessages(errorSource);

  const handleRetry = useCallback(async () => {
    trackEvent('KYC_ERROR_RETRY_PRESSED', { errorSource });

    if (errorSource === 'initialization') {
      // Go back to ID Picker for initialization errors
      navigation.goBack();
    } else {
      // Retry the entire KYC flow for verification errors
      setIsRetrying(true);
      try {
        const accessToken = await fetchAccessToken();
        const result = await launchSumsub({ accessToken: accessToken.token });

        // User cancelled - return silently
        if (!result.success && result.status === 'Interrupted') {
          navigation.goBack();
          return;
        }

        // Still failed - stay on error screen
        if (!result.success) {
          console.error('KYC retry failed:', result.errorMsg || result.errorType);
          // Stay on this screen, user can try again
        } else {
          // Success - provider handles its own success UI
          // The screen will be navigated away by the provider's flow
        }
      } catch (error) {
        console.error('Error retrying KYC flow:', error);
        // Stay on this screen, user can try again
      } finally {
        setIsRetrying(false);
      }
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
      >
        <XStack gap="$3" alignItems="stretch">
          <YStack flex={1}>
            <PrimaryButton onPress={handleRetry} disabled={isRetrying}>
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </PrimaryButton>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
};

export default KycErrorScreen;
