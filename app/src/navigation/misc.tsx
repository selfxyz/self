// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { lazy } from 'react';
import { SystemBars } from 'react-native-edge-to-edge';

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
// Important: SplashScreen is imported directly and not lazy-loaded.
// This is because it's used as a fallback for the Suspense boundary in the root navigator,
// ensuring it's immediately available at startup.
import SplashScreen from '@src/screens/misc/SplashScreen';
import { black } from '@src/utils/colors';

const LaunchScreen = lazy(() => import('@src/screens/misc/LaunchScreen'));
const LoadingScreen = lazy(() => import('@src/screens/misc/LoadingScreen'));
const ModalScreen = lazy(() => import('@src/screens/misc/ModalScreen'));

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
