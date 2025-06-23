//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import CloudBackupScreen from '../screens/settings/CloudBackupScreen';
import ManageDocumentsScreen from '../screens/settings/ManageDocumentsScreen';
import PassportDataInfoScreen from '../screens/settings/PassportDataInfoScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ShowRecoveryPhraseScreen from '../screens/settings/ShowRecoveryPhraseScreen';
import { black, slate300, white } from '../utils/colors';

const settingsScreens = {
  CloudBackupSettings: {
    screen: CloudBackupScreen,
    options: {
      title: 'Cloud backup',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: slate300,
      },
    } as NativeStackNavigationOptions,
  },
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
  ShowRecoveryPhrase: {
    screen: ShowRecoveryPhraseScreen,
    options: {
      title: 'Recovery Phrase',
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
  },
};

export default settingsScreens;
