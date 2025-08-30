// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const PassportCameraScreen = lazyWithPreload(
  () => import('@/screens/passport/PassportCameraScreen'),
);
const PassportCameraTrouble = lazyWithPreload(
  () => import('@/screens/passport/PassportCameraTroubleScreen'),
);
const PassportNFCScanScreen = lazyWithPreload(
  () => import('@/screens/passport/PassportNFCScanScreen'),
);
const PassportNFCTrouble = lazyWithPreload(
  () => import('@/screens/passport/PassportNFCTroubleScreen'),
);
const PassportOnboardingScreen = lazyWithPreload(
  () => import('@/screens/passport/PassportOnboardingScreen'),
);
const UnsupportedPassportScreen = lazyWithPreload(
  () => import('@/screens/passport/UnsupportedPassportScreen'),
);
const PassportNFCMethodSelectionScreen = lazyWithPreload(
  () => import('@/screens/passport/PassportNFCMethodSelectionScreen'),
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
    screen: PassportNFCMethodSelectionScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default passportScreens;
