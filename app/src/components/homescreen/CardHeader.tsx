// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC, ReactNode } from 'react';
import React from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import {
  black,
  borderColor,
  gray400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { CardFontSizes } from '@/hooks/useCardDimensions';

interface CardHeaderProps {
  variant: 'gradient' | 'flat';
  title: string;
  subtitle: string;
  titleColor?: string;
  subtitleColor?: string;
  logo: ReactNode;
  rightElement?: ReactNode;
  headerHeight: number;
  figmaPadding: number;
  headerGap: number;
  fontSize: CardFontSizes;
  // flat variant only
  backgroundColor?: string;
  borderBottomWidth?: number;
  borderBottomColor?: string;
}

const CardHeader: FC<CardHeaderProps> = ({
  variant,
  title,
  subtitle,
  titleColor,
  subtitleColor,
  logo,
  rightElement,
  headerHeight,
  figmaPadding,
  headerGap,
  fontSize,
  backgroundColor,
  borderBottomWidth = 2,
  borderBottomColor,
}) => {
  const resolvedTitleColor =
    titleColor ?? (variant === 'gradient' ? white : black);
  const resolvedSubtitleColor =
    subtitleColor ?? (variant === 'gradient' ? '#9193A2' : gray400);

  const content = (
    <XStack flex={1} alignItems="center">
      <XStack alignItems="center" gap={headerGap} flex={1}>
        {logo}
        <YStack gap={2}>
          <Text
            fontFamily={dinot}
            fontSize={fontSize.header}
            fontWeight="500"
            color={resolvedTitleColor}
            textTransform="uppercase"
            lineHeight={fontSize.header * 1.1}
          >
            {title}
          </Text>
          <Text
            fontFamily={dinot}
            fontSize={fontSize.subtitle}
            color={resolvedSubtitleColor}
            letterSpacing={0.7}
            textTransform="uppercase"
          >
            {subtitle}
          </Text>
        </YStack>
      </XStack>
      {rightElement}
    </XStack>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[black, borderColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          {
            height: headerHeight,
            paddingHorizontal: figmaPadding,
          },
        ]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <YStack
      height={headerHeight}
      padding={figmaPadding}
      backgroundColor={backgroundColor ?? white}
      justifyContent="center"
      borderBottomWidth={borderBottomWidth}
      borderBottomColor={borderBottomColor}
    >
      {content}
    </YStack>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
    width: '100%',
  },
});

export default CardHeader;
