// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoUnverified from '@/assets/images/self_logo_unverified.svg';
import WavePatternBody from '@/assets/images/wave_pattern_body.png';

interface EmptyIdCardProps {
  onRegisterPress: () => void;
}

// Figma design tokens
const DIVIDER_COLOR = '#CBD5E1'; // slate-300
const BUTTON_BORDER_COLOR = '#E2E8F0'; // slate-200
const SUBTITLE_COLOR = '#9CA3AF'; // gray-400

/**
 * Empty state card shown when user has no registered documents.
 * Matches Figma design exactly:
 * - White header with gray Self logo and "NO IDENTITY FOUND" text
 * - Solid gray divider line
 * - White body with gray wave pattern (from original unverified_human.png)
 * - Pill-shaped white button with gray border
 */
const EmptyIdCard: FC<EmptyIdCardProps> = ({ onRegisterPress }) => {
  const { width: screenWidth } = Dimensions.get('window');

  // Card dimensions (matching IdCardLayout)
  const cardWidth = screenWidth * 0.95 - 16;
  const cardHeight = cardWidth * 0.635;
  const borderRadius = 12;

  // Figma exact dimensions (scaled from 353px reference width)
  const scale = cardWidth / 353;
  const headerHeight = 67 * scale;
  const figmaPadding = 14 * scale;
  const logoSize = 32 * scale;
  const headerGap = 12 * scale;

  // Font sizes from Figma
  const fontSize = {
    header: 20 * scale, // 20px in Figma
    subtitle: 7 * scale, // 7px in Figma
    button: 16 * scale, // 16px in Figma
  };

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        height={cardHeight}
        borderRadius={borderRadius}
        overflow="hidden"
        borderWidth={1}
        borderColor="#E5E7EB"
        backgroundColor={white}
        marginBottom={8}
      >
        {/* Header Section - White background with bottom border */}
        <YStack
          height={headerHeight}
          padding={figmaPadding}
          backgroundColor={white}
          justifyContent="center"
          borderBottomWidth={2}
          borderBottomColor={DIVIDER_COLOR}
        >
          {/* Content row */}
          <XStack flex={1} alignItems="center">
            {/* Logo + Text */}
            <XStack alignItems="center" gap={headerGap} flex={1}>
              {/* Self logo (gray) - exact Figma asset */}
              <YStack
                width={logoSize}
                height={logoSize}
                alignItems="center"
                justifyContent="center"
              >
                <SelfLogoUnverified width={logoSize} height={logoSize} />
              </YStack>
              {/* Text container */}
              <YStack gap={2}>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.header}
                  fontWeight="500"
                  color={black}
                  textTransform="uppercase"
                  lineHeight={fontSize.header * 1.1}
                >
                  NO IDENTITY FOUND
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.subtitle}
                  color={SUBTITLE_COLOR}
                  letterSpacing={0.7}
                  textTransform="uppercase"
                >
                  NO IDENTITY FOUND
                </Text>
              </YStack>
            </XStack>
          </XStack>
        </YStack>

        {/* Body Section - White background with wave pattern */}
        <YStack style={styles.body}>
          {/* Wave pattern background - exact same as unverified_human.png */}
          <Image
            source={WavePatternBody}
            style={styles.wavePattern}
            resizeMode="cover"
          />

          {/* Register button - pill-shaped with gray border */}
          <YStack
            position="absolute"
            bottom={figmaPadding}
            left={figmaPadding}
            right={figmaPadding}
          >
            <YStack
              backgroundColor={white}
              borderWidth={1}
              borderColor={BUTTON_BORDER_COLOR}
              borderRadius={9999}
              paddingVertical={8 * scale}
              paddingHorizontal={20 * scale}
              alignItems="center"
              justifyContent="center"
              onPress={onRegisterPress}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text
                fontFamily={dinot}
                fontSize={fontSize.button}
                fontWeight="500"
                color={black}
                textAlign="center"
              >
                Register a new ID
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  wavePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

export default EmptyIdCard;
