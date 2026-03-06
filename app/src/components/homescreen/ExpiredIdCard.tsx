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
  red600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoInactive from '@/assets/images/self_logo_inactive.svg';
import WavePatternBody from '@/assets/images/wave_pattern_body.png';
import CardHeader from '@/components/homescreen/CardHeader';
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
        borderColor={gray200}
        backgroundColor={white}
        marginBottom={8}
        shadowColor={black}
        shadowOffset={{ width: 0, height: 44 }}
        shadowOpacity={0.25}
        shadowRadius={68}
        elevation={12}
      >
        {/* Header Section - White background with red divider */}
        <CardHeader
          variant="flat"
          title="EXPIRED ID"
          subtitle="TIME TO REGISTER A VALID COPY"
          titleColor={red600}
          headerHeight={headerHeight}
          figmaPadding={figmaPadding}
          headerGap={headerGap}
          fontSize={fontSize}
          backgroundColor={white}
          borderBottomColor={red600}
          logo={
            <YStack
              width={logoSize}
              height={logoSize}
              alignItems="center"
              justifyContent="center"
            >
              <SelfLogoInactive width={logoSize} height={logoSize} />
            </YStack>
          }
        />

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
