// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, slate300, white } from '@/utils/colors';

const CloudBackupScreen = lazyWithPreload(
  () => import('@/screens/settings/CloudBackupScreen'),
);
const ManageDocumentsScreen = lazyWithPreload(
  () => import('@/screens/settings/ManageDocumentsScreen'),
);
const PassportDataInfoScreen = lazyWithPreload(
  () => import('@/screens/settings/PassportDataInfoScreen'),
);
const SettingsScreen = lazyWithPreload(
  () => import('@/screens/settings/SettingsScreen'),
);
const ShowRecoveryPhraseScreen = lazyWithPreload(
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
