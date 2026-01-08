// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { NavBar } from '@/components/navbar/BaseNavBar';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

export const DefaultNavBar = (props: NativeStackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  const insets = useSafeAreaInsets();
  const headerTitleStyle = (options.headerTitleStyle || {}) as TextStyle;

  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
      paddingBottom={20}
      backgroundColor={headerStyle.backgroundColor as string}
      barStyle={
        options.headerTintColor === white || headerTitleStyle?.color === white
          ? 'light'
          : 'dark'
      }
    >
      <NavBar.LeftAction
        component={
          options.headerBackTitle || (canGoBack() ? 'back' : undefined)
        }
        onPress={() => {
          buttonTap();
          goBack();
        }}
        color={options.headerTintColor as string}
      />
      <NavBar.Title
        color={headerTitleStyle.color as string}
        style={headerTitleStyle}
      >
        {props.options.title}
      </NavBar.Title>
    </NavBar.Container>
  );
};
