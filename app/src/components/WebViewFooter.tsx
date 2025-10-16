// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ArrowLeft, ArrowRight, RotateCcw } from '@tamagui/lucide-icons';

import { Button, XStack, YStack } from '@selfxyz/mobile-sdk-alpha/components';

import { black, slate50, slate400 } from '@/utils/colors';
import { buttonTap } from '@/utils/haptic';

export interface WebViewFooterProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onOpenInBrowser: () => void;
}

const iconSize = 22;
const buttonSize = 42;

export const WebViewFooter: React.FC<WebViewFooterProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onOpenInBrowser: _onOpenInBrowser,
}) => {
  const renderIconButton = (
    key: string,
    icon: React.ReactNode,
    onPress: () => void,
    disabled?: boolean,
  ) => (
    <Button
      key={key}
      size="$4"
      unstyled
      disabled={disabled}
      onPress={() => {
        buttonTap();
        onPress();
      }}
      backgroundColor={slate50}
      borderRadius={buttonSize / 2}
      width={buttonSize}
      height={buttonSize}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.5 : 1}
    >
      {icon}
    </Button>
  );

  return (
    <YStack gap={12} paddingTop={12} paddingHorizontal={20} width="100%">
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal={10}
        width="100%"
      >
        {renderIconButton(
          'back',
          <ArrowLeft size={iconSize} color={canGoBack ? black : slate400} />,
          onGoBack,
          !canGoBack,
        )}
        {renderIconButton(
          'reload',
          <RotateCcw size={iconSize} color={black} />,
          onReload,
        )}
        {renderIconButton(
          'forward',
          <ArrowRight
            size={iconSize}
            color={canGoForward ? black : slate400}
          />,
          onGoForward,
          !canGoForward,
        )}
      </XStack>

      {/* Home Indicator - only on iOS */}
      {Platform.OS === 'ios' && (
        <View style={styles.homeIndicatorContainer}>
          <View style={styles.homeIndicator} />
        </View>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  homeIndicatorContainer: {
    height: 21,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeIndicator: {
    width: 139,
    height: 5,
    backgroundColor: black,
    borderRadius: 100,
  },
});
