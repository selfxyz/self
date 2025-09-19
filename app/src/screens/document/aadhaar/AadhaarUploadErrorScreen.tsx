// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { BodyText } from '@/components/typography/BodyText';
import WarningIcon from '@/images/warning.svg';
import { useSafeAreaInsets } from '@/mocks/react-native-safe-area-context';
import { black, slate100, slate200, slate500, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';

type AadhaarUploadErrorRouteParams = {
  errorType?: 'general' | 'expired';
};

type AadhaarUploadErrorRoute = RouteProp<
  Record<string, AadhaarUploadErrorRouteParams>,
  string
>;

const AadhaarUploadErrorScreen: React.FC = () => {
  const { bottom } = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<AadhaarUploadErrorRoute>();
  const { trackEvent } = useSelfClient();
  const errorType = route.params?.errorType || 'general';

  // Define error messages based on error type
  const getErrorMessages = () => {
    if (errorType === 'expired') {
      return {
        title: 'QR Code Has Expired',
        description:
          'You uploaded a valid Aadhaar QR code, but unfortunately it has expired. Please generate a new QR code from the mAadhaar app and try again.',
      };
    }

    return {
      title: 'There was a problem reading the code',
      description:
        'Please ensure the QR code is clear and well-lit, then try again. For best results, take a screenshot of the QR code instead of photographing it.',
    };
  };

  const { title, description } = getErrorMessages();

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
        <BodyText fontSize={19} textAlign="center" color={black}>
          {title}
        </BodyText>
        <BodyText
          marginTop={6}
          fontSize={17}
          textAlign="center"
          color={slate500}
        >
          {description}
        </BodyText>
      </YStack>

      <YStack
        paddingHorizontal={25}
        backgroundColor={white}
        paddingBottom={bottom + extraYPadding + 35}
        paddingTop={25}
      >
        <XStack gap="$3" alignItems="stretch">
          <YStack flex={1}>
            <PrimaryButton
              onPress={() => {
                trackEvent(AadhaarEvents.RETRY_BUTTON_PRESSED, { errorType });
                // Navigate back to upload screen to try again
                navigation.goBack();
              }}
            >
              Try Again
            </PrimaryButton>
          </YStack>
          <YStack flex={1}>
            <SecondaryButton
              onPress={() => {
                trackEvent(AadhaarEvents.HELP_BUTTON_PRESSED, { errorType });
                // TODO: Implement help functionality
              }}
            >
              Need Help?
            </SecondaryButton>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
};

export default AadhaarUploadErrorScreen;
