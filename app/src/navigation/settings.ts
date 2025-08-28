// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, slate300, white } from '@/utils/colors';

const CloudBackupScreen = lazy(
  () => import('@/screens/settings/CloudBackupScreen'),
);
const ManageDocumentsScreen = lazy(
  () => import('@/screens/settings/ManageDocumentsScreen'),
);
const PassportDataInfoScreen = lazy(
  () => import('@/screens/settings/PassportDataInfoScreen'),
);
const SettingsScreen = lazy(() => import('@/screens/settings/SettingsScreen'));
const ShowRecoveryPhraseScreen = lazy(
  () => import('@/screens/settings/ShowRecoveryPhraseScreen'),
);

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
