// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import {
  black,
  slate300,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { HeadlessNavForEuclid } from '@/components/navbar/HeadlessNavForEuclid';
import AccountRecoveryChoiceScreen from '@/screens/account/recovery/AccountRecoveryChoiceScreen';
import AccountRecoveryScreen from '@/screens/account/recovery/AccountRecoveryScreen';
import DocumentDataNotFoundScreen from '@/screens/account/recovery/DocumentDataNotFoundScreen';
import RecoverWithPhraseScreen from '@/screens/account/recovery/RecoverWithPhraseScreen';
import CloudBackupScreen from '@/screens/account/settings/CloudBackupScreen';
import { ProofSettingsScreen } from '@/screens/account/settings/ProofSettingsScreen';
import SettingsScreen from '@/screens/account/settings/SettingsScreen';
import ShowRecoveryPhraseScreen from '@/screens/account/settings/ShowRecoveryPhraseScreen';
import { IS_EUCLID_ENABLED } from '@/utils/devUtils';

const accountScreens = {
  AccountRecovery: {
    screen: AccountRecoveryScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  AccountRecoveryChoice: {
    screen: AccountRecoveryChoiceScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  RecoverWithPhrase: {
    screen: RecoverWithPhraseScreen,
    options: {
      headerTintColor: black,
      title: 'Enter Recovery Phrase',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: slate300,
      },
      headerBackTitle: 'close',
    } as NativeStackNavigationOptions,
  },
  DocumentDataNotFound: {
    screen: DocumentDataNotFoundScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  CloudBackupSettings: {
    screen: CloudBackupScreen,
    options: {
      title: 'Account Backup',
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
      },
    } as NativeStackNavigationOptions,
  },
  ProofSettings: {
    screen: ProofSettingsScreen,
    options: {
      title: 'Proof Settings',
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
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

  ShowRecoveryPhrase: {
    screen: ShowRecoveryPhraseScreen,
    options: IS_EUCLID_ENABLED
      ? ({
          headerShown: true,
          header: HeadlessNavForEuclid,
          statusBarStyle: ShowRecoveryPhraseScreen.statusBarStyle,
          statusBarHidden: ShowRecoveryPhraseScreen.statusBarHidden,
        } as NativeStackNavigationOptions)
      : ({
          title: 'Recovery Phrase',
          headerStyle: {
            backgroundColor: white,
          },
        } as NativeStackNavigationOptions),
  },
};

export default accountScreens;
