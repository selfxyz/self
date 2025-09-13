// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { SystemBars } from 'react-native-edge-to-edge';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DeferredLinkingInfoScreen from '@/screens/system/DeferredLinkingInfoScreen';
import LaunchScreen from '@/screens/system/LaunchScreen';
import LoadingScreen from '@/screens/system/Loading';
import ModalScreen from '@/screens/system/ModalScreen';
import SplashScreen from '@/screens/system/SplashScreen';

const systemScreens = {
  Launch: {
    screen: LaunchScreen,
    options: {
      header: () => <SystemBars style="light" />,
    },
  },
  Loading: {
    screen: LoadingScreen,
    options: {
      headerShown: false,
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
    },
  },
};

export default systemScreens;
