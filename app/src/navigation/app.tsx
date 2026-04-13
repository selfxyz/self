// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import type { DocumentCategory } from '@selfxyz/common/utils/types';

import { SystemBars } from '@/components/SystemBars';
import DeferredLinkingInfoScreen from '@/screens/app/DeferredLinkingInfoScreen';
import LoadingScreen from '@/screens/app/LoadingScreen';
import type { ModalNavigationParams } from '@/screens/app/ModalScreen';
import ModalScreen from '@/screens/app/ModalScreen';
import SplashScreen from '@/screens/app/SplashScreen';

const appScreens = {
  Loading: {
    screen: LoadingScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    params: {} as {
      documentCategory?: DocumentCategory;
      signatureAlgorithm?: string;
      curveOrExponent?: string;
    },
  },
  Modal: {
    screen: ModalScreen,
    options: {
      headerShown: false,
      presentation: 'transparentModal',
      animation: 'fade',
      contentStyle: { backgroundColor: 'transparent' },
    } as NativeStackNavigationOptions,
    params: {} as ModalNavigationParams,
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

export default appScreens;
