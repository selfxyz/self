// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import AccountVerifiedSuccessScreen from '@/screens/onboarding/AccountVerifiedSuccessScreen';
import DisclaimerScreen from '@/screens/onboarding/DisclaimerScreen';
import SaveRecoveryPhraseScreen from '@/screens/onboarding/SaveRecoveryPhraseScreen';

const onboardingScreens = {
  Disclaimer: {
    screen: DisclaimerScreen,
    options: {
      title: 'Disclaimer',
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  SaveRecoveryPhrase: {
    screen: SaveRecoveryPhraseScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  AccountVerifiedSuccess: {
    screen: AccountVerifiedSuccessScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default onboardingScreens;
