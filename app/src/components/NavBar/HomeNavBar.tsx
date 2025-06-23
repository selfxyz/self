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
import { Button } from 'tamagui';

import ActivityIcon from '../../images/icons/activity.svg';
import SettingsIcon from '../../images/icons/settings.svg';
import { black, neutral400, white } from '../../utils/colors';
import { extraYPadding } from '../../utils/constants';
import { buttonTap } from '../../utils/haptic';
import { NavBar } from './BaseNavBar';

export const HomeNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  return (
    <NavBar.Container
      backgroundColor={black}
      barStyle={'light-content'}
      padding={16}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
    >
      <NavBar.LeftAction
        component={
          <Button
            size={'$3'}
            unstyled
            icon={
              <ActivityIcon width={'24'} height={'100%'} color={neutral400} />
            }
          />
        }
        // disable icon click for now
        onPress={() => {
          buttonTap();
          props.navigation.navigate('ProofHistory');
        }}
      />
      <NavBar.Title size="large" color={white}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          <Button
            size={'$3'}
            unstyled
            icon={
              <SettingsIcon width={'24'} height={'100%'} color={neutral400} />
            }
          />
        }
        onPress={() => {
          buttonTap();
          props.navigation.navigate('Settings');
        }}
      />
    </NavBar.Container>
  );
};
