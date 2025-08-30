// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, slate300 } from '@/utils/colors';

const AccountRecoveryChoiceScreen = lazyWithPreload(
  () => import('@/screens/recovery/AccountRecoveryChoiceScreen'),
);
const AccountRecoveryScreen = lazyWithPreload(
  () => import('@/screens/recovery/AccountRecoveryScreen'),
);
const AccountVerifiedSuccessScreen = lazyWithPreload(
  () => import('@/screens/recovery/AccountVerifiedSuccessScreen'),
);
const PassportDataNotFound = lazyWithPreload(
  () => import('@/screens/recovery/PassportDataNotFoundScreen'),
);
const RecoverWithPhraseScreen = lazyWithPreload(
  () => import('@/screens/recovery/RecoverWithPhraseScreen'),
);
const SaveRecoveryPhraseScreen = lazyWithPreload(
  () => import('@/screens/recovery/SaveRecoveryPhraseScreen'),
);

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
