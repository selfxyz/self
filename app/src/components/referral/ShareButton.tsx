// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { slate800 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface ShareButtonProps {
  icon: React.ReactNode;
  label: string;
  backgroundColor: string;
  onPress: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  icon,
  label,
  backgroundColor,
  onPress,
}) => {
  return (
    <Pressable onPress={onPress}>
      <YStack gap={8} alignItems="center">
        <View
          backgroundColor={backgroundColor}
          width={64}
          height={64}
          borderRadius={60}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </View>
        <Text
          fontFamily={dinot}
          fontSize={14}
          fontWeight="500"
          color={slate800}
        >
          {label}
        </Text>
      </YStack>
    </Pressable>
  );
};
