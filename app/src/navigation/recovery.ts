// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import AccountRecoveryChoiceScreen from '../screens/recovery/AccountRecoveryChoiceScreen';
import AccountRecoveryScreen from '../screens/recovery/AccountRecoveryScreen';
import AccountVerifiedSuccessScreen from '../screens/recovery/AccountVerifiedSuccessScreen';
import PassportDataNotFound from '../screens/recovery/PassportDataNotFoundScreen';
import RecoverWithPhraseScreen from '../screens/recovery/RecoverWithPhraseScreen';
import SaveRecoveryPhraseScreen from '../screens/recovery/SaveRecoveryPhraseScreen';
import { black, slate300 } from '../utils/colors';

const recoveryScreens = {
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
  AccountVerifiedSuccess: {
    screen: AccountVerifiedSuccessScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  PassportDataNotFound: {
    screen: PassportDataNotFound,
    options: {
      headerShown: false,
      gestureEnabled: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
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
  SaveRecoveryPhrase: {
    screen: SaveRecoveryPhraseScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default recoveryScreens;
