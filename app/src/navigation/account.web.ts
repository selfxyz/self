// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import SettingsScreen from '@/screens/account/settings/SettingsScreen';
import SupportUuidScreen from '@/screens/account/settings/SupportUuidScreen';

const accountScreens = {
  SupportUuid: {
    screen: SupportUuidScreen,
    options: {
      title: 'Diagnostic ID',
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
      },
    } as NativeStackNavigationOptions,
    config: {
      screens: {},
    },
  },
  Settings: {
    screen: SettingsScreen,
    options: {
      animation: 'slide_from_bottom',
      title: 'Settings',
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
      },
    } as NativeStackNavigationOptions,
    config: {
      screens: {},
    },
  },
};

export default accountScreens;
