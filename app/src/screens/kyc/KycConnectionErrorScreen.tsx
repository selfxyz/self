// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X } from '@tamagui/lucide-icons';

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
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import WarningIcon from '@/assets/images/warning.svg';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

const KycConnectionErrorScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleClose = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const handleTryDifferentMethod = useCallback(() => {
    buttonTap();
    navigation.navigate('CountryPicker');
  }, [navigation]);

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
            CONNECTION ERROR
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
            opacity={0}
          >
            <X size={20} color={black} />
          </Button>
        </XStack>
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
          Connection Error
        </BodyText>
        <BodyText
          style={{
            marginTop: 6,
            fontSize: 17,
            textAlign: 'center',
            color: slate500,
          }}
        >
          Unable to connect to verification service. Please check your internet
          connection and try again.
        </BodyText>
      </YStack>

      {/* Retry Button */}
      <YStack paddingHorizontal={25} paddingBottom={20}>
        <PrimaryButton onPress={handleRetry}>Try again</PrimaryButton>
      </YStack>

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
        <SecondaryButton onPress={handleTryDifferentMethod}>
          Try a different method
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

export default KycConnectionErrorScreen;
