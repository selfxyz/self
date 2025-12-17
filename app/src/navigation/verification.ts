// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import ProofRequestStatusScreen from '@/screens/verification/ProofRequestStatusScreen';
import ProveScreen from '@/screens/verification/ProveScreen';
import QRCodeTroubleScreen from '@/screens/verification/QRCodeTroubleScreen';
import QRCodeViewFinderScreen from '@/screens/verification/QRCodeViewFinderScreen';

const verificationScreens = {
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
      gestureEnabled: false,
    } as NativeStackNavigationOptions,
  },
};

export default verificationScreens;
