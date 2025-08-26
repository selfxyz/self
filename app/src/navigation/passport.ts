// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const PassportCameraScreen = lazy(
  () => import('@/screens/passport/PassportCameraScreen'),
);
const PassportCameraTrouble = lazy(
  () => import('@/screens/passport/PassportCameraTroubleScreen'),
);
const PassportNFCScanScreen = lazy(
  () => import('@/screens/passport/PassportNFCScanScreen'),
);
const PassportNFCTrouble = lazy(
  () => import('@/screens/passport/PassportNFCTroubleScreen'),
);
const PassportOnboardingScreen = lazy(
  () => import('@/screens/passport/PassportOnboardingScreen'),
);
const UnsupportedPassportScreen = lazy(
  () => import('@/screens/passport/UnsupportedPassportScreen'),
);
const NFCMethodSelectionScreen = lazy(
  () => import('@/screens/passport/NFCMethodSelectionScreen'),
);

const passportScreens = {
  PassportCamera: {
    screen: PassportCameraScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  PassportCameraTrouble: {
    screen: PassportCameraTrouble,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  PassportNFCScan: {
    screen: PassportNFCScanScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
    initialParams: {
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    },
  },
  PassportNFCTrouble: {
    screen: PassportNFCTrouble,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      // presentation: 'modal' wanted to do this but seems to break stuff
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  UnsupportedPassport: {
    screen: UnsupportedPassportScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      passportData: null,
    },
  },
  PassportNFCMethodSelection: {
    screen: NFCMethodSelectionScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default passportScreens;
