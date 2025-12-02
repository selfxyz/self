// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from '@tamagui/lucide-icons';

import { Button, XStack, YStack } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate50,
  slate400,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { buttonTap } from '@/integrations/haptics';

export interface WebViewFooterProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onOpenInBrowser: () => void;
}

const iconSize = 22;
const buttonSize = 36;

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
    <YStack gap={12} paddingVertical={12} width="100%">
      <XStack justifyContent="space-between" alignItems="center" width="100%">
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
    </YStack>
  );
};
