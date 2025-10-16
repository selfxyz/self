// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack } from '@selfxyz/mobile-sdk-alpha/components';
import { ExternalLink, Share2 } from '@tamagui/lucide-icons';

import { NavBar } from '@/components/NavBar/BaseNavBar';
import { charcoal, slate300, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { buttonTap } from '@/utils/haptic';

export interface WebViewNavBarProps {
  title?: string;
  canGoBack?: boolean;
  onBackPress: () => void;
  onSharePress?: () => void;
  onOpenExternalPress?: () => void;
  isShareDisabled?: boolean;
  isOpenExternalDisabled?: boolean;
}

export const WebViewNavBar: React.FC<WebViewNavBarProps> = ({
  title,
  canGoBack = true,
  onBackPress,
  onSharePress,
  onOpenExternalPress,
  isShareDisabled,
  isOpenExternalDisabled,
}) => {
  const insets = useSafeAreaInsets();

  const rightActions = useMemo(() => {
    const actions: React.ReactNode[] = [];

    if (onSharePress) {
      actions.push(
        <Button
          key="share"
          size="$3"
          unstyled
          disabled={isShareDisabled}
          icon={
            <Share2 size={22} color={isShareDisabled ? slate300 : charcoal} />
          }
          onPress={() => {
            buttonTap();
            onSharePress();
          }}
        />,
      );
    }

    if (onOpenExternalPress) {
      actions.push(
        <Button
          key="external"
          size="$3"
          unstyled
          disabled={isOpenExternalDisabled}
          icon={
            <ExternalLink
              size={22}
              color={isOpenExternalDisabled ? slate300 : charcoal}
            />
          }
          onPress={() => {
            buttonTap();
            onOpenExternalPress();
          }}
        />,
      );
    }

    if (!actions.length) {
      return null;
    }

    return (
      <XStack gap={4} alignItems="center">
        {actions}
      </XStack>
    );
  }, [
    isOpenExternalDisabled,
    isShareDisabled,
    onOpenExternalPress,
    onSharePress,
  ]);

  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
      paddingBottom={20}
      backgroundColor={white}
      barStyle="dark"
    >
      <NavBar.LeftAction
        component={canGoBack ? 'back' : undefined}
        onPress={() => {
          buttonTap();
          onBackPress();
        }}
      />
      <NavBar.Title
        style={{ fontSize: 20, textAlign: 'center', flex: 1 }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </NavBar.Title>
      <NavBar.RightAction component={rightActions} />
    </NavBar.Container>
  );
};

