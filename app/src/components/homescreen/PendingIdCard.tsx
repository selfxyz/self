// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Image } from 'react-native';
import { Text, YStack } from 'tamagui';

import {
  amber50,
  amber200,
  amber500,
  amber700,
  black,
  gray200,
  yellow50,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import SelfLogoPending from '@/assets/images/self_logo_pending.svg';
import WavePatternPending from '@/assets/images/wave_pattern_pending.png';
import CardHeader from '@/components/homescreen/CardHeader';
import { cardStyles } from '@/components/homescreen/cardStyles';
import { useCardDimensions } from '@/hooks/useCardDimensions';

interface PendingIdCardProps {
  onClick?: () => void;
}

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
        backgroundColor={yellow50}
        marginBottom={8}
        shadowColor={amber500}
        shadowOffset={{ width: 0, height: 14 }}
        shadowOpacity={0.25}
        shadowRadius={28}
        elevation={12}
        onPress={onClick}
        pressStyle={onClick ? { opacity: 0.7 } : undefined}
      >
        {/* Header Section */}
        <CardHeader
          variant="flat"
          title="IDENTITY UNDER REVIEW"
          subtitle="NO IDENTITY FOUND"
          titleColor={black}
          headerHeight={headerHeight}
          figmaPadding={figmaPadding}
          headerGap={headerGap}
          fontSize={fontSize}
          backgroundColor={amber50}
          borderBottomColor={amber500}
          logo={
            <YStack
              width={logoSize}
              height={logoSize}
              borderRadius={logoSize / 2}
              backgroundColor={amber500}
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <SelfLogoPending
                width={logoSize * 0.56}
                height={logoSize * 0.56}
              />
            </YStack>
          }
        />

        {/* Body Section */}
        <YStack style={cardStyles.body}>
          {/* Wave pattern background */}
          <Image
            source={WavePatternPending}
            style={cardStyles.wavePattern}
            resizeMode="cover"
          />

          {/* Pending badge - bottom right */}
          <YStack
            position="absolute"
            bottom={figmaPadding}
            right={figmaPadding}
            backgroundColor={amber200}
            borderRadius={30}
            paddingHorizontal={8 * scale}
            paddingVertical={4 * scale}
          >
            <Text
              fontFamily={dinot}
              fontSize={fontSize.badge}
              fontWeight="500"
              color={amber700}
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

export default PendingIdCard;
