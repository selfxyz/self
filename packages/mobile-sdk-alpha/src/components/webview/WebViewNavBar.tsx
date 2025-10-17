// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { StyleSheet, Text } from 'react-native';

import { black } from '../../constants/colors';
import { dinot } from '../../constants/fonts';
import { buttonTap } from '../../haptic';
import { Button } from '../layout/Button';
import { XStack } from '../layout/XStack';

import { ExternalLink, X } from '@tamagui/lucide-icons';

export interface WebViewNavBarProps {
  title?: string;
  canGoBack?: boolean;
  onBackPress: () => void;
  onOpenExternalPress?: () => void;
  isOpenExternalDisabled?: boolean;
  safeAreaTop?: number;
}

export const WebViewNavBar: React.FC<WebViewNavBarProps> = ({
  title,
  onBackPress,
  onOpenExternalPress,
  isOpenExternalDisabled,
  safeAreaTop = 0,
}) => {
  return (
    <XStack
      paddingHorizontal={20}
      paddingVertical={10}
      paddingTop={safeAreaTop + 10}
      gap={14}
      alignItems="center"
      backgroundColor="white"
    >
      {/* Left: Close Button */}
      <Button
        unstyled
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 10 }}
        icon={<X size={24} color={black} />}
        onPress={() => {
          buttonTap();
          onBackPress();
        }}
      />

      {/* Center: Title */}
      <XStack flex={1} alignItems="center" justifyContent="center">
        <Text style={styles.title} numberOfLines={1}>
          {title?.toUpperCase() || 'PAGE TITLE'}
        </Text>
      </XStack>

      {/* Right: Open External Button */}
      <Button
        unstyled
        disabled={isOpenExternalDisabled}
        hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
        icon={
          <ExternalLink
            size={24}
            color={isOpenExternalDisabled ? black : black}
            opacity={isOpenExternalDisabled ? 0.3 : 1}
          />
        }
        onPress={() => {
          buttonTap();
          onOpenExternalPress?.();
        }}
      />
    </XStack>
  );
};

const styles = StyleSheet.create({
  title: {
    fontFamily: dinot,
    fontSize: 15,
    color: black,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
