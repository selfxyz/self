// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// DevPrivateKeyScreen is loaded lazily to avoid bundling in production
import { black, white } from '@/utils/colors';

const DevFeatureFlagsScreen = lazy(
  () => import('@/screens/dev/DevFeatureFlagsScreen'),
);
const DevHapticFeedbackScreen = lazy(
  () => import('@/screens/dev/DevHapticFeedback'),
);
const DevSettingsScreen = lazy(() => import('@/screens/dev/DevSettingsScreen'));
const MockDataScreen = lazy(() => import('@/screens/dev/MockDataScreen'));
const MockDataScreenDeepLink = lazy(
  () => import('@/screens/dev/MockDataScreenDeepLink'),
);
const DevPrivateKeyScreen = lazy(
  () => import('@/screens/dev/DevPrivateKeyScreen'),
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
