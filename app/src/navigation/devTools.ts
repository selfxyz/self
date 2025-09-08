// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@/utils/colors';

const DevFeatureFlagsScreen = lazy(
  () => import('@/screens/dev/DevFeatureFlagsScreen'),
);
const DevHapticFeedbackScreen = lazy(
  () => import('@/screens/dev/DevHapticFeedbackScreen'),
);
const DevPrivateKeyScreen = lazy(
  () => import('@/screens/dev/DevPrivateKeyScreen'),
);
const DevSettingsScreen = lazy(() => import('@/screens/dev/DevSettingsScreen'));
const CreateMockScreen = lazy(() => import('@/screens/dev/CreateMockScreen'));
const CreateMockScreenDeepLink = lazy(
  () => import('@/screens/dev/CreateMockScreenDeepLink'),
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
      title: 'Mock Document',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: white,
      },
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
