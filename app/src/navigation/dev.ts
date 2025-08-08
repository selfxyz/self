// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { lazy } from 'react';

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import DevPrivateKeyScreen from '@src/screens/dev/DevPrivateKeyScreen';
import { black, white } from '@src/utils/colors';

const DevFeatureFlagsScreen = lazy(
  () => import('@src/screens/dev/DevFeatureFlagsScreen'),
);
const DevHapticFeedbackScreen = lazy(
  () => import('@src/screens/dev/DevHapticFeedback'),
);
const DevSettingsScreen = lazy(
  () => import('@src/screens/dev/DevSettingsScreen'),
);
const MockDataScreen = lazy(() => import('@src/screens/dev/MockDataScreen'));
const MockDataScreenDeepLink = lazy(
  () => import('@src/screens/dev/MockDataScreenDeepLink'),
);

const devScreens = {
  CreateMock: {
    screen: MockDataScreen,
    options: {
      title: 'Mock Passport',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: white,
      },
    } as NativeStackNavigationOptions,
  },
  MockDataDeepLink: {
    screen: MockDataScreenDeepLink,
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
      title: 'Dev Mode',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: white,
      },
      headerBackTitle: 'close',
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
      title: 'Private Key',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: white,
      },
    } as NativeStackNavigationOptions,
  },
};

export default devScreens;
