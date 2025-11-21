// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';

import {
  black,
  blue600,
  slate500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface ReferralInfoProps {
  title: string;
  description: string;
  learnMoreText?: string;
  onLearnMorePress?: () => void;
}

export const ReferralInfo: React.FC<ReferralInfoProps> = ({
  title,
  description,
  learnMoreText,
  onLearnMorePress,
}) => {
  return (
    <YStack gap={12} alignItems="center">
      <Text
        fontFamily={dinot}
        fontSize={24}
        fontWeight="500"
        color={black}
        textAlign="center"
      >
        {title}
      </Text>
      <YStack gap={0}>
        <Text
          fontFamily={dinot}
          fontSize={16}
          fontWeight="500"
          color={slate500}
          textAlign="center"
        >
          {description}
        </Text>
        {learnMoreText && (
          <Pressable onPress={onLearnMorePress}>
            <Text
              fontFamily={dinot}
              fontSize={16}
              fontWeight="500"
              color={blue600}
              textAlign="center"
            >
              {learnMoreText}
            </Text>
          </Pressable>
        )}
      </YStack>
    </YStack>
  );
};
