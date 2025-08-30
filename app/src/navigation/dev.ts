// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import { black, white } from '@/utils/colors';

const DevFeatureFlagsScreen = lazyWithPreload(
  () => import('@/screens/dev/feature-flags'),
);
const DevHapticFeedbackScreen = lazyWithPreload(
  () => import('@/screens/dev/haptic-feedback'),
);
const DevSettingsScreen = lazyWithPreload(
  () => import('@/screens/dev/settings'),
);
const CreateMockScreen = lazyWithPreload(
  () => import('@/screens/dev/create-mock'),
);
const CreateMockScreenDeepLink = lazyWithPreload(
  () => import('@/screens/dev/create-mock/CreateMockScreenDeepLink'),
);
const DevPrivateKeyScreen = lazyWithPreload(
  () => import('@/screens/dev/private-key'),
);

const devHeaderOptions: NativeStackNavigationOptions = {
  headerStyle: {
    backgroundColor: black,
  },
  headerTitleStyle: {
    color: white,
  },
  headerBackTitle: 'close',
};

const devScreens = {
  CreateMock: {
    screen: CreateMockScreen,
    options: {
      ...devHeaderOptions,
      title: 'Mock Passport',
    } as NativeStackNavigationOptions,
  },
  MockDataDeepLink: {
    screen: CreateMockScreenDeepLink,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  DevHapticFeedback: {
    screen: DevHapticFeedbackScreen,
    options: {
      title: 'Haptic Feedback',
    } as NativeStackNavigationOptions,
  },
  DevSettings: {
    screen: DevSettingsScreen,
    options: {
      ...devHeaderOptions,
      title: 'Dev Mode',
    } as NativeStackNavigationOptions,
  },
  DevFeatureFlags: {
    screen: DevFeatureFlagsScreen,
    options: {
      title: 'Feature Flags',
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
  },
  DevPrivateKey: {
    screen: DevPrivateKeyScreen,
    options: {
      ...devHeaderOptions,
      title: 'Private Key',
    } as NativeStackNavigationOptions,
  },
};

export default devScreens;
