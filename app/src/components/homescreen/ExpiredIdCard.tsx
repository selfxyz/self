// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoInactive from '@/assets/images/self_logo_inactive.svg';
import WavePatternBody from '@/assets/images/wave_pattern_body.png';

// Figma design tokens
const EXPIRED_TITLE_COLOR = '#DC2626'; // red-600
const EXPIRED_DIVIDER_COLOR = '#DC2626'; // red-600
const SUBTITLE_COLOR = '#9CA3AF'; // gray-400

/**
 * Expired state card shown when user's identity document has expired.
 * Matches Figma design exactly:
 * - White header with red Self logo and "EXPIRED ID" text
 * - Red divider line
 * - White body with gray wave pattern
 * - Black "EXPIRED ID" badge in bottom right
 */
const ExpiredIdCard: FC = () => {
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
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 44 }}
        shadowOpacity={0.25}
        shadowRadius={68}
        elevation={12}
      >
        {/* Header Section - White background with red divider */}
        <YStack
          height={headerHeight}
          padding={figmaPadding}
          backgroundColor={white}
          justifyContent="center"
          borderBottomWidth={2}
          borderBottomColor={EXPIRED_DIVIDER_COLOR}
        >
          {/* Content row */}
          <XStack flex={1} alignItems="center">
            {/* Logo + Text */}
            <XStack alignItems="center" gap={headerGap} flex={1}>
              {/* Red Self logo (reuses inactive logo) */}
              <YStack
                width={logoSize}
                height={logoSize}
                alignItems="center"
                justifyContent="center"
              >
                <SelfLogoInactive width={logoSize} height={logoSize} />
              </YStack>
              {/* Text container */}
              <YStack gap={2}>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.header}
                  fontWeight="500"
                  color={EXPIRED_TITLE_COLOR}
                  textTransform="uppercase"
                  lineHeight={fontSize.header * 1.1}
                >
                  EXPIRED ID
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.subtitle}
                  color={SUBTITLE_COLOR}
                  letterSpacing={0.7}
                  textTransform="uppercase"
                >
                  TIME TO REGISTER A VALID COPY
                </Text>
              </YStack>
            </XStack>
          </XStack>
        </YStack>

        {/* Body Section - White background with wave pattern */}
        <YStack flex={1} position="relative" overflow="hidden">
          {/* Wave pattern background */}
          <Image
            source={WavePatternBody}
            style={styles.wavePattern}
            resizeMode="cover"
          />

          {/* Expired badge - bottom right (black background) */}
          <YStack
            position="absolute"
            bottom={figmaPadding}
            right={figmaPadding}
            backgroundColor={black}
            borderRadius={30}
            paddingHorizontal={8 * scale}
            paddingVertical={4 * scale}
          >
            <Text
              fontFamily={dinot}
              fontSize={10 * scale}
              fontWeight="500"
              color={white}
              letterSpacing={0.6}
              textTransform="uppercase"
            >
              EXPIRED ID
            </Text>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
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

export default ExpiredIdCard;
