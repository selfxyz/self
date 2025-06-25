// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from 'tamagui';

// import ActivityIcon from '../../images/icons/activity.svg';
// import SettingsIcon from '../../images/icons/settings.svg';
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
        component={<Button size={'$3'} unstyled />}
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
        component={<Button size={'$3'} unstyled />}
        onPress={() => {
          buttonTap();
          props.navigation.navigate('Settings');
        }}
      />
    </NavBar.Container>
  );
};
