// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { lazyScreen } from './lazyScreen';

const DevFeatureFlagsScreen = lazyScreen(
  () => import('../screens/dev/DevFeatureFlagsScreen'),
);
const DevHapticFeedbackScreen = lazyScreen(
  () => import('../screens/dev/DevHapticFeedback'),
);
const DevSettingsScreen = lazyScreen(
  () => import('../screens/dev/DevSettingsScreen'),
);
const MockDataScreen = lazyScreen(
  () => import('../screens/dev/MockDataScreen'),
);
const MockDataScreenDeepLink = lazyScreen(
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
