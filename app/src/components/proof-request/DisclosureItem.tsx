// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable } from 'react-native';
import { Text, View, XStack } from 'tamagui';

import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import {
  FilledCircleIcon,
  InfoCircleIcon,
} from '@/components/proof-request/icons';

export interface DisclosureItemProps {
  text: string;
  verified?: boolean;
  onInfoPress?: () => void;
  isLast?: boolean;
  testID?: string;
}

/**
 * Individual disclosure row with green checkmark and optional info button.
 * Matches Figma design 15234:9267.
 */
export const DisclosureItem: React.FC<DisclosureItemProps> = ({
  text,
  verified = true,
  onInfoPress,
  isLast = false,
  testID = 'disclosure-item',
}) => {
  return (
    <XStack
      paddingVertical={16}
      alignItems="center"
      gap={10}
      borderBottomWidth={isLast ? 0 : 1}
      borderBottomColor={proofRequestColors.slate200}
      testID={testID}
    >
      {/* Status Icon */}
      <View width={20} alignItems="center" justifyContent="center">
        <FilledCircleIcon
          size={9}
          color={
            verified
              ? proofRequestColors.emerald500
              : proofRequestColors.slate400
          }
        />
      </View>

      {/* Disclosure Text */}
      <View flex={1}>
        <Text
          fontFamily={dinot}
          fontSize={12}
          color={proofRequestColors.slate900}
          textTransform="uppercase"
          letterSpacing={0.48}
          testID={`${testID}-text`}
        >
          {text}
        </Text>
      </View>

      {/* Info Button */}
      {onInfoPress && (
        <Pressable
          onPress={onInfoPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`${testID}-info-button`}
        >
          <View width={25} alignItems="center" justifyContent="center">
            <InfoCircleIcon size={20} color={proofRequestColors.blue500} />
          </View>
        </Pressable>
      )}
    </XStack>
  );
};
