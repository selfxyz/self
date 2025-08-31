// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@/utils/colors';

const ConfirmBelongingScreen = lazy(
  () => import('@/screens/prove/ConfirmBelongingScreen'),
);
const ProofRequestStatusScreen = lazy(
  () => import('@/screens/prove/ProofRequestStatusScreen'),
);
const ProveScreen = lazy(() => import('@/screens/prove/ProveScreen'));
const QRCodeTroubleScreen = lazy(
  () => import('@/screens/prove/QRCodeTroubleScreen'),
);
const QRCodeViewFinderScreen = lazy(
  () => import('@/screens/prove/QRCodeViewFinderScreen'),
);

const proveScreens = {
  ConfirmBelonging: {
    screen: ConfirmBelongingScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  ProofRequestStatus: {
    screen: ProofRequestStatusScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  Prove: {
    screen: ProveScreen,
    options: {
      title: 'Request Proof',
      headerStyle: {
        backgroundColor: black,
      },
      headerTitleStyle: {
        color: white,
      },
    } as NativeStackNavigationOptions,
  },
  QRCodeTrouble: {
    screen: QRCodeTroubleScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  QRCodeViewFinder: {
    screen: QRCodeViewFinderScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
};

export default proveScreens;
