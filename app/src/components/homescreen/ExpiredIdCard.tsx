// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import {
  black,
  gray400,
  red600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoInactive from '@/assets/images/self_logo_inactive.svg';
import WavePatternBody from '@/assets/images/wave_pattern_body.png';
import { cardStyles } from '@/components/homescreen/cardStyles';
import { useCardDimensions } from '@/hooks/useCardDimensions';

/**
 * Expired state card shown when user's identity document has expired.
 * Matches Figma design exactly:
 * - White header with red Self logo and "EXPIRED ID" text
 * - Red divider line
 * - White body with gray wave pattern
 * - Black "EXPIRED ID" badge in bottom right
 */
const ExpiredIdCard: FC = () => {
  const {
    cardWidth,
    borderRadius,
    scale,
    headerHeight,
    figmaPadding,
    logoSize,
    headerGap,
    expandedAspectRatio,
    fontSize,
  } = useCardDimensions();

  return (
    <YStack width="100%" alignItems="center" justifyContent="center">
      <YStack
        width={cardWidth}
        aspectRatio={expandedAspectRatio}
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
          borderBottomColor={red600}
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
                  color={red600}
                  textTransform="uppercase"
                  lineHeight={fontSize.header * 1.1}
                >
                  EXPIRED ID
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={fontSize.subtitle}
                  color={gray400}
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
        <YStack style={cardStyles.body}>
          {/* Wave pattern background */}
          <Image
            source={WavePatternBody}
            style={cardStyles.wavePattern}
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
              fontSize={fontSize.badge}
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

export default ExpiredIdCard;
