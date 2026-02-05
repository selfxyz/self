// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import WavePatternPending from '@/assets/images/wave_pattern_pending.png';

interface PendingIdCardProps {
  onClick?: () => void;
}

// Figma design tokens
const SUBTITLE_COLOR = '#9CA3AF'; // gray-400

// Pending card design tokens (from Figma)
const PENDING_HEADER_BG = '#FFFBEB'; // amber-50 (header background)
const PENDING_BODY_BG = '#FEFCE8'; // yellow-50 (body background)
const PENDING_DIVIDER_COLOR = '#F59E0B'; // amber-500
const PENDING_LOGO_BG = '#F59E0B'; // amber-500
const PENDING_BADGE_BG = '#FDE68A'; // amber-200
const PENDING_BADGE_TEXT = '#B45309'; // amber-700

/**
 * Pending state card shown when user has submitted identity for KYC verification.
 * Matches Figma design exactly:
 * - Amber-50 tinted header and body
 * - Orange divider line
 * - Orange logo circle with white Self logo
 * - "IDENTITY UNDER REVIEW" title
 * - Yellow "Pending" badge in bottom right
 */
const PendingIdCard: FC<PendingIdCardProps> = ({ onClick }) => {
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
        backgroundColor={PENDING_BODY_BG}
        marginBottom={8}
        shadowColor="#F59E0B"
        shadowOffset={{ width: 0, height: 14 }}
        shadowOpacity={0.25}
        shadowRadius={28}
        elevation={12}
        onPress={onClick}
        pressStyle={onClick ? { opacity: 0.7 } : undefined}
      >
        {/* Header Section */}
        <YStack
          height={headerHeight}
          padding={figmaPadding}
          backgroundColor={PENDING_HEADER_BG}
          justifyContent="center"
          borderBottomWidth={2}
          borderBottomColor={PENDING_DIVIDER_COLOR}
        >
          {/* Content row */}
          <XStack flex={1} alignItems="center">
            {/* Logo + Text */}
            <XStack alignItems="center" gap={headerGap} flex={1}>
              {/* Orange circle with white Self logo */}
              <YStack
                width={logoSize}
                height={logoSize}
                borderRadius={logoSize / 2}
                backgroundColor={PENDING_LOGO_BG}
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
              >
                <SelfLogoPending
                  width={logoSize * 0.56}
                  height={logoSize * 0.56}
                />
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
                  IDENTITY UNDER REVIEW
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

        {/* Body Section */}
        <YStack flex={1} position="relative" overflow="hidden">
          {/* Wave pattern background */}
          <Image
            source={WavePatternPending}
            style={styles.wavePattern}
            resizeMode="cover"
          />

          {/* Pending badge - bottom right */}
          <YStack
            position="absolute"
            bottom={figmaPadding}
            right={figmaPadding}
            backgroundColor={PENDING_BADGE_BG}
            borderRadius={30}
            paddingHorizontal={8 * scale}
            paddingVertical={4 * scale}
          >
            <Text
              fontFamily={dinot}
              fontSize={10 * scale}
              fontWeight="500"
              color={PENDING_BADGE_TEXT}
              letterSpacing={0.6}
              textTransform="uppercase"
            >
              Pending
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

export default PendingIdCard;
