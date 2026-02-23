// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { CardFontSizes } from '@/hooks/useCardDimensions';

interface Badge {
  text: string;
  backgroundColor: string;
  textColor: string;
}

interface CardBottomContentProps {
  truncatedId?: string;
  bottomLabel: string;
  badges: Badge[];
  padding: number;
  fontSize: CardFontSizes;
}

const CardBottomContent: FC<CardBottomContentProps> = ({
  truncatedId,
  bottomLabel,
  badges,
  padding,
  fontSize,
}) => {
  return (
    <XStack
      position="absolute"
      bottom={padding}
      left={padding}
      right={padding}
      justifyContent="space-between"
      alignItems="flex-end"
    >
      {/* Bottom Left: ID + Document Label */}
      <YStack gap={4}>
        {truncatedId ? (
          <Text
            fontFamily={plexMono}
            fontSize={fontSize.bottomId}
            color={white}
          >
            {truncatedId}
          </Text>
        ) : null}
        <Text
          fontFamily={dinot}
          fontSize={fontSize.bottomLabel}
          fontWeight="500"
          color={white}
          textTransform="uppercase"
          letterSpacing={0.6}
        >
          {bottomLabel}
        </Text>
      </YStack>

      {/* Bottom Right: Badges */}
      <YStack alignItems="flex-end" gap={4}>
        {badges.map(badge => (
          <YStack
            key={badge.text}
            backgroundColor={badge.backgroundColor}
            borderRadius={30}
            paddingHorizontal={padding * 0.6}
            paddingVertical={padding * 0.3}
          >
            <Text
              fontFamily={dinot}
              fontSize={fontSize.badge}
              fontWeight="500"
              color={badge.textColor}
              textTransform="uppercase"
              letterSpacing={0.6}
            >
              {badge.text}
            </Text>
          </YStack>
        ))}
      </YStack>
    </XStack>
  );
};

export default CardBottomContent;
