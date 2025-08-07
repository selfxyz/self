// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TextStyle, ViewStyle } from 'tamagui';

import { white } from '../../utils/colors';
import { extraYPadding } from '../../utils/constants';
import { buttonTap } from '../../utils/haptic';
import { NavBar } from './BaseNavBar';

import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const DefaultNavBar = (props: NativeStackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  const insets = useSafeAreaInsets();
  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
      paddingBottom={20}
      backgroundColor={headerStyle.backgroundColor as string}
      barStyle={
        options.headerTintColor === white ||
        (options.headerTitleStyle as TextStyle)?.color === white
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
        {...(options.headerTitleStyle as ViewStyle)}
      />
      <NavBar.Title {...(options.headerTitleStyle as ViewStyle)}>
        {props.options.title}
      </NavBar.Title>
    </NavBar.Container>
  );
};
