// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
import { LinearGradient } from 'tamagui/linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';

import {
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  green500,
  white,
  zinc800,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import { NovaPIN } from '@/components/nova/NovaPIN';
import { confirmTap } from '@/integrations/haptics';

// Placeholder code for initial implementation
const PLACEHOLDER_CODE = '8024';

const NovaCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const bottomPadding = useSafeBottomPadding();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      confirmTap();
      await Clipboard.setString(PLACEHOLDER_CODE);
      setIsCopied(true);

      // Reset after 1.65 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 1650);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDismiss = () => {
    confirmTap();
    navigation.goBack();
  };

  return (
    <View flex={1} backgroundColor={black}>
      {/* Background gradient overlay */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', black]}
        locations={[0.46562, 0.86729]}
        start={[0, 0]}
        end={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content container */}
      <YStack flex={1} justifyContent="center" alignItems="center">
        {/* App logos section */}
        <XStack gap={10} alignItems="center" marginBottom={20}>
          {/* Aave logo placeholder */}
          <View
            width={46}
            height={46}
            backgroundColor="#9391f7"
            borderRadius={3}
            alignItems="center"
            justifyContent="center"
          >
            <Text color={white} fontSize={20} fontWeight="bold">
              A
            </Text>
          </View>

          {/* Arrow symbol */}
          <Text
            fontFamily="SF Pro"
            fontSize={18}
            fontWeight="600"
            color={white}
          >
            􁁛
          </Text>

          {/* Self logo placeholder */}
          <View
            width={46}
            height={46}
            backgroundColor={black}
            borderRadius={3}
            borderWidth={1}
            borderColor={zinc800}
            alignItems="center"
            justifyContent="center"
          >
            <Text color={white} fontSize={20} fontWeight="bold">
              S
            </Text>
          </View>
        </XStack>

        {/* Title and content */}
        <YStack
          paddingHorizontal={20}
          paddingVertical={20}
          gap={12}
          alignItems="center"
          width="100%"
        >
          <Text
            fontFamily={advercase}
            fontSize={28}
            fontWeight="400"
            color={white}
            textAlign="center"
            letterSpacing={1}
          >
            Your Nova code awaits
          </Text>

          <YStack gap={16} width="100%" alignItems="center">
            <View paddingHorizontal={40} width="100%">
              <Text
                fontFamily={dinot}
                fontSize={14}
                fontWeight="500"
                color={white}
                textAlign="center"
              >
                Open Nova in Opera MiniPay and enter this four digit code to
                continue your journey.
              </Text>
            </View>

            <View width="100%">
              <NovaPIN code={PLACEHOLDER_CODE} />
            </View>
          </YStack>
        </YStack>
      </YStack>

      {/* Bottom buttons */}
      <YStack
        gap={10}
        paddingHorizontal={20}
        paddingBottom={bottomPadding + 20}
        width="100%"
      >
        <PrimaryButton
          onPress={handleCopyCode}
          disabled={isCopied}
          style={{
            backgroundColor: isCopied ? green500 : undefined,
          }}
        >
          {isCopied ? 'Code copied!' : 'Copy code'}
        </PrimaryButton>
        <SecondaryButton onPress={handleDismiss}>Dismiss</SecondaryButton>
      </YStack>
    </View>
  );
};

export default NovaCodeScreen;
