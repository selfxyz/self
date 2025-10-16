// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RotateCcw,
} from '@tamagui/lucide-icons';

import { Button, XStack } from '@selfxyz/mobile-sdk-alpha/components';

import { charcoal, slate300 } from '@/utils/colors';
import { buttonTap } from '@/utils/haptic';

export interface WebViewFooterProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onOpenInBrowser: () => void;
}

const iconSize = 24;

export const WebViewFooter: React.FC<WebViewFooterProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onOpenInBrowser,
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
    >
      {icon}
    </Button>
  );

  return (
    <XStack
      width="100%"
      alignItems="center"
      justifyContent="space-between"
      gap={12}
    >
      {renderIconButton(
        'back',
        <ArrowLeft size={iconSize} color={canGoBack ? charcoal : slate300} />,
        onGoBack,
        !canGoBack,
      )}
      {renderIconButton(
        'forward',
        <ArrowRight
          size={iconSize}
          color={canGoForward ? charcoal : slate300}
        />,
        onGoForward,
        !canGoForward,
      )}
      {renderIconButton(
        'reload',
        <RotateCcw size={iconSize} color={charcoal} />,
        onReload,
      )}
      {renderIconButton(
        'open',
        <ExternalLink size={iconSize} color={charcoal} />,
        onOpenInBrowser,
      )}
    </XStack>
  );
};
