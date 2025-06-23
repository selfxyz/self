//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextStyle, ViewStyle } from 'tamagui';

import { white } from '../../utils/colors';
import { extraYPadding } from '../../utils/constants';
import { buttonTap } from '../../utils/haptic';
import { NavBar } from './BaseNavBar';

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
          ? 'light-content'
          : 'dark-content'
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
