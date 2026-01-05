// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, View, XStack, YStack } from 'tamagui';
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

import CheckmarkIcon from '@/assets/icons/checkmark_white.svg';
import StarfallBackground from '@/assets/images/bg_starfall_push.png';
import OperaLogo from '@/assets/logos/opera_minipay.svg';
import SelfLogo from '@/assets/logos/self.svg';
import { StarfallPIN } from '@/components/starfall/StarfallPIN';
import { confirmTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';

// Placeholder code for initial implementation
const PLACEHOLDER_CODE = '8024';

const StarfallPushCodeScreen: React.FC = () => {
  const navigation = useNavigation();
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
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        {/* Colorful background image */}
        <ImageBackground
          source={StarfallBackground}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          {/* Fade to black overlay - stronger at bottom */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)', black]}
            locations={[0.1, 0.45, 0.6]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>

        {/* Content container */}
        <YStack flex={1} justifyContent="center" alignItems="center">
          {/* App logos section */}
          <XStack gap={10} alignItems="center" marginBottom={20}>
            {/* Opera MiniPay logo */}
            <View width={46} height={46} borderRadius={3} overflow="hidden">
              <OperaLogo width={46} height={46} />
            </View>

            {/* Checkmark icon */}
            <View width={32} height={32}>
              <CheckmarkIcon width={32} height={32} />
            </View>

            {/* Self logo */}
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
              <SelfLogo width={28} height={28} />
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
              Your Starfall code awaits
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
                  Open Starfall in Opera MiniPay and enter this four digit code
                  to continue your journey.
                </Text>
              </View>

              <View width="100%">
                <StarfallPIN code={PLACEHOLDER_CODE} />
              </View>
            </YStack>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.TopSection>

      <ExpandableBottomLayout.BottomSection
        backgroundColor={black}
        style={{ backgroundColor: black }}
      >
        {/* Bottom buttons */}
        <YStack gap={10} width="100%">
          <PrimaryButton
            onPress={handleCopyCode}
            disabled={isCopied}
            fontSize={16}
            style={{
              backgroundColor: isCopied ? green500 : undefined,
              borderColor: '#374151',
              borderWidth: 1,
              borderRadius: 60,
              height: 46,
              paddingVertical: 0,
            }}
          >
            {isCopied ? 'Code copied!' : 'Copy code'}
          </PrimaryButton>
          <SecondaryButton
            onPress={handleDismiss}
            textColor={black}
            fontSize={16}
            style={{ borderRadius: 60, height: 46, paddingVertical: 0 }}
          >
            Dismiss
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default StarfallPushCodeScreen;
