// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DocumentDataInfoScreen from '@/screens/settings/DocumentDataInfoScreen';
import ManageDocumentsScreen from '@/screens/settings/ManageDocumentsScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import { black, white } from '@/utils/colors';

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
  DocumentDataInfo: {
    screen: DocumentDataInfoScreen,
    options: {
      title: 'Document Data Info',
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
    } as NativeStackNavigationOptions,
    config: {
      screens: {},
    },
  },
};

export default settingsScreens;
