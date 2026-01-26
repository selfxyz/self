// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CreateMockScreen from '@/screens/dev/CreateMockScreen';
import CreateMockScreenDeepLink from '@/screens/dev/CreateMockScreenDeepLink';
import DevFeatureFlagsScreen from '@/screens/dev/DevFeatureFlagsScreen';
import DevHapticFeedbackScreen from '@/screens/dev/DevHapticFeedbackScreen';
import DevLoadingScreen from '@/screens/dev/DevLoadingScreen';
import DevPrivateKeyScreen from '@/screens/dev/DevPrivateKeyScreen';
import DevSettingsScreen from '@/screens/dev/DevSettingsScreen';

// Lazy load SumsubTestScreen to avoid loading Sumsub SDK on app startup
// This prevents the SDK from blocking app initialization and E2E tests
const LazySumsubTestScreen = React.lazy(
  () => import('@/screens/dev/SumsubTestScreen'),
);

const SumsubTestScreenWrapper: React.FC = () => (
  <React.Suspense
    fallback={
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: white,
        }}
      >
        <ActivityIndicator size="large" color={black} />
      </View>
    }
  >
    <LazySumsubTestScreen />
  </React.Suspense>
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
  DevLoadingScreen: {
    screen: DevLoadingScreen,
    options: {
      ...devHeaderOptions,
      title: 'Dev Loading Screen',
    } as NativeStackNavigationOptions,
  },
  SumsubTest: {
    screen: SumsubTestScreenWrapper,
    options: {
      ...devHeaderOptions,
      title: 'Sumsub Test',
    } as NativeStackNavigationOptions,
  },
};

export default devScreens;
