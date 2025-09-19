// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { BodyText } from '@/components/typography/BodyText';
import { Title } from '@/components/typography/Title';
import WarningIcon from '@/images/warning.svg';
import { useSafeAreaInsets } from '@/mocks/react-native-safe-area-context';
import { black, slate100, slate200, slate500, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';

const AadhaarUploadErrorScreen: React.FC = () => {
  const { bottom } = useSafeAreaInsets();
  const navigation = useNavigation();

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
          There was a problem reading the code
        </BodyText>
        <BodyText
          marginTop={6}
          fontSize={17}
          textAlign="center"
          color={slate500}
        >
          Make sure the QR code is clear and try again. Or the QR code might
          have expired.
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
                // Navigate back to upload screen to try again
                navigation.goBack();
              }}
            >
              Try Again
            </PrimaryButton>
          </YStack>
          <YStack flex={1}>
            <SecondaryButton onPress={() => {}}>Need Help?</SecondaryButton>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
};

export default AadhaarUploadErrorScreen;
