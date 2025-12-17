// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink, X } from '@tamagui/lucide-icons';

import { Button, XStack } from '@selfxyz/mobile-sdk-alpha/components';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { buttonTap } from '@/integrations/haptics';

export interface WebViewNavBarProps {
  title?: string;
  onBackPress: () => void;
  onOpenExternalPress?: () => void;
  isOpenExternalDisabled?: boolean;
}

export const WebViewNavBar: React.FC<WebViewNavBarProps> = ({
  title,
  onBackPress,
  onOpenExternalPress,
  isOpenExternalDisabled,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <XStack
      paddingVertical={10}
      paddingTop={insets.top + 10}
      paddingHorizontal={16}
      gap={14}
      alignItems="center"
      backgroundColor="white"
    >
      {/* Left: Close Button */}
      <Button
        testID="WebViewNavBar.closeButton"
        unstyled
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 10 }}
        icon={<X size={24} color={black} />}
        onPress={() => {
          buttonTap();
          onBackPress();
        }}
      />

      {/* Center: Title */}
      <XStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={8}
      >
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
