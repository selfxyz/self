// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { lazy } from 'react';

import { black, white } from '../utils/colors';

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const ManageDocumentsScreen = lazy(
  () => import('../screens/settings/ManageDocumentsScreen'),
);
const PassportDataInfoScreen = lazy(
  () => import('../screens/settings/PassportDataInfoScreen'),
);
const SettingsScreen = lazy(() => import('../screens/settings/SettingsScreen'));

const settingsScreens = {
  ManageDocuments: {
    screen: ManageDocumentsScreen,
    options: {
      title: 'Manage Documents',
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
      },
    } as NativeStackNavigationOptions,
  },
  PassportDataInfo: {
    screen: PassportDataInfoScreen,
    options: {
      title: 'Passport Data Info',
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
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
      navigationBarColor: black,
    } as NativeStackNavigationOptions,
    config: {
      screens: {},
    },
  },
};

export default settingsScreens;
