// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Image } from 'react-native';
import { Text, YStack } from 'tamagui';

import {
  black,
  gray200,
  slate200,
  slate300,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoUnverified from '@/assets/images/self_logo_unverified.svg';
import WavePatternBody from '@/assets/images/wave_pattern_body.png';
import CardHeader from '@/components/homescreen/CardHeader';
import { cardStyles } from '@/components/homescreen/cardStyles';
import { useCardDimensions } from '@/hooks/useCardDimensions';

interface EmptyIdCardProps {
  onRegisterPress: () => void;
}

/**
 * Empty state card shown when user has no registered documents.
 * Matches Figma design exactly:
 * - White header with gray Self logo and "NO IDENTITY FOUND" text
 * - Solid gray divider line
 * - White body with gray wave pattern (from original unverified_human.png)
 * - Pill-shaped white button with gray border
 */
const EmptyIdCard: FC<EmptyIdCardProps> = ({ onRegisterPress }) => {
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
        borderColor={gray200}
        backgroundColor={white}
        marginBottom={8}
      >
        {/* Header Section - White background with bottom border */}
        <CardHeader
          variant="flat"
          title="NO IDENTITY FOUND"
          subtitle="NO IDENTITY FOUND"
          headerHeight={headerHeight}
          figmaPadding={figmaPadding}
          headerGap={headerGap}
          fontSize={fontSize}
          backgroundColor={white}
          borderBottomColor={slate300}
          logo={
            <YStack
              width={logoSize}
              height={logoSize}
              alignItems="center"
              justifyContent="center"
            >
              <SelfLogoUnverified width={logoSize} height={logoSize} />
            </YStack>
          }
        />

        {/* Body Section - White background with wave pattern */}
        <YStack style={[cardStyles.body, { backgroundColor: white }]}>
          {/* Wave pattern background - exact same as unverified_human.png */}
          <Image
            source={WavePatternBody}
            style={cardStyles.wavePattern}
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
              borderColor={slate200}
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

export default EmptyIdCard;
