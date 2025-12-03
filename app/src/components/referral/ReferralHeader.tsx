// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import ArrowLeft from '@/assets/icons/arrow_left.svg';

export interface ReferralHeaderProps {
  imageSource: ImageSourcePropType;
  onBackPress: () => void;
}

export const ReferralHeader: React.FC<ReferralHeaderProps> = ({
  imageSource,
  onBackPress,
}) => {
  const { top } = useSafeAreaInsets();

  return (
    <View height={430} position="relative" overflow="hidden">
      <Image
        source={imageSource}
        style={{
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        }}
      />

      {/* Back button */}
      <View position="absolute" top={top + 16} left={20} zIndex={10}>
        <Pressable onPress={onBackPress}>
          <View
            backgroundColor={white}
            width={46}
            height={46}
            borderRadius={60}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontFamily="SF Pro"
              fontSize={24}
              lineHeight={29}
              color={black}
            >
              <ArrowLeft width={24} height={24} />
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};
