// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate100,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import { getErrorMessages } from '@selfxyz/mobile-sdk-alpha/onboarding/import-aadhaar';

import WarningIcon from '@/assets/images/warning.svg';
import { extraYPadding } from '@/utils/styleUtils';

type AadhaarUploadErrorRouteParams = {
  errorType?: 'general' | 'expired';
};

type AadhaarUploadErrorRoute = RouteProp<
  Record<string, AadhaarUploadErrorRouteParams>,
  string
>;

const AadhaarUploadErrorScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation = useNavigation();
  const route = useRoute<AadhaarUploadErrorRoute>();
  const { trackEvent } = useSelfClient();
  const errorType = route.params?.errorType || 'general';

  const { title, description } = getErrorMessages(errorType);

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
          {/* <YStack flex={1}>
            <SecondaryButton
              onPress={() => {
                trackEvent(AadhaarEvents.HELP_BUTTON_PRESSED, { errorType });
                // TODO: Implement help functionality
              }}
            >
              Need Help?
            </SecondaryButton>
          </YStack> */}
        </XStack>
      </YStack>
    </YStack>
  );
};

export default AadhaarUploadErrorScreen;
