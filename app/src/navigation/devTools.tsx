// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CreateMockScreen from '@/screens/dev/CreateMockScreen';
import CreateMockScreenDeepLink from '@/screens/dev/CreateMockScreenDeepLink';
import DevDangerZoneScreen from '@/screens/dev/DevDangerZoneScreen';
import DevFeatureFlagsScreen from '@/screens/dev/DevFeatureFlagsScreen';
import DevHapticFeedbackScreen from '@/screens/dev/DevHapticFeedbackScreen';
import DevLoadingScreen from '@/screens/dev/DevLoadingScreen';
import DevPrivateKeyScreen from '@/screens/dev/DevPrivateKeyScreen';
import DevSettingsScreen from '@/screens/dev/DevSettingsScreen';
import SocialLoginDemoScreen from '@/screens/dev/SocialLoginDemoScreen';
import TroubleshootingScreen from '@/screens/dev/TroubleshootingScreen';
import WebViewHostScreen from '@/screens/dev/WebViewHostScreen';

const devHeaderOptions: NativeStackNavigationOptions = {
  headerStyle: {
    backgroundColor: black,
  },
  headerTitleStyle: {
    color: white,
  },
  headerTintColor: white,
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
  DevDangerZone: {
    screen: DevDangerZoneScreen,
    options: {
      ...devHeaderOptions,
      title: 'Danger Zone',
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
  SocialLoginDemo: {
    screen: SocialLoginDemoScreen,
    options: {
      ...devHeaderOptions,
      title: 'Social Login Demo',
    } as NativeStackNavigationOptions,
  },
  Troubleshooting: {
    screen: TroubleshootingScreen,
    options: {
      ...devHeaderOptions,
      title: 'Troubleshooting',
    } as NativeStackNavigationOptions,
  },
  WebViewHost: {
    screen: WebViewHostScreen,
    options: {
      ...devHeaderOptions,
      title: 'WebView Host (rn-sdk)',
    } as NativeStackNavigationOptions,
  },
};

export default devScreens;
