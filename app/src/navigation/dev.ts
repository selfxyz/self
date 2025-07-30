// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { lazy } from 'react';

const DevFeatureFlagsScreen = lazy(
  () => import('../screens/dev/DevFeatureFlagsScreen'),
);
const DevHapticFeedbackScreen = lazy(
  () => import('../screens/dev/DevHapticFeedback'),
);
const DevSettingsScreen = lazy(
  () => import('../screens/dev/DevSettingsScreen'),
);
const MockDataScreen = lazy(() => import('../screens/dev/MockDataScreen'));
const MockDataScreenDeepLink = lazy(
  () => import('../screens/dev/MockDataScreenDeepLink'),
);
import { white } from '../utils/colors';

const devScreens = {
  CreateMock: {
    screen: MockDataScreen,
    options: {
      title: 'Mock Passport',
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
      title: 'Developer Settings',
      headerStyle: {
        backgroundColor: white,
      },
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
};

export default devScreens;
