// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import ComingSoonScreen from '@/screens/shared/ComingSoonScreen';
import { WebViewScreen } from '@/screens/shared/WebViewScreen';

type ScreenConfig = {
  // Using ComponentType to avoid importing RootStack types and prevent cycles
  screen: ComponentType<unknown>;
  options?: NativeStackNavigationOptions;
  initialParams?: Record<string, unknown>;
};

const sharedScreens: Record<string, ScreenConfig> = {
  ComingSoon: {
    screen: ComingSoonScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: null,
      documentCategory: null,
    },
  },
  WebView: {
    screen: WebViewScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      url: 'https://self.xyz',
      title: undefined,
      shareTitle: undefined,
      shareMessage: undefined,
      shareUrl: undefined,
    },
  },
};

export default sharedScreens;
