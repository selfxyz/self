// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { lazy } from 'react';
import { SystemBars } from 'react-native-edge-to-edge';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Important: SplashScreen is imported directly and not lazy-loaded.
// This is because it's used as a fallback for the Suspense boundary in the root navigator,
// ensuring it's immediately available at startup.
import SplashScreen from '@/screens/misc/SplashScreen';
import { black } from '@/utils/colors';

const LaunchScreen = lazy(() => import('@/screens/misc/LaunchScreen'));
const LoadingScreen = lazy(() => import('@/screens/misc/LoadingScreen'));
const ModalScreen = lazy(() => import('@/screens/misc/ModalScreen'));
const DeferredLinkingInfoScreen = lazy(
  () => import('@/screens/misc/DeferredLinkingInfoScreen'),
);

const miscScreens = {
  Launch: {
    screen: LaunchScreen,
    options: {
      header: () => <SystemBars style="light" />,
      navigationBarColor: black,
    },
  },
  LoadingScreen: {
    screen: LoadingScreen,
    options: {
      headerShown: false,
      navigationBarColor: black,
    } as NativeStackNavigationOptions,
  },
  Modal: {
    screen: ModalScreen,
    options: {
      headerShown: false,
      presentation: 'transparentModal',
      animation: 'fade',
      contentStyle: { backgroundColor: 'transparent' },
    } as NativeStackNavigationOptions,
  },
  DeferredLinkingInfo: {
    screen: DeferredLinkingInfoScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },

  Splash: {
    screen: SplashScreen,
    options: {
      header: () => <SystemBars style="light" />,
      navigationBarColor: black,
    },
  },
};

export default miscScreens;
