//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import NFCMethodSelectionScreen from '../screens/passport/NFCMethodSelectionScreen';
import PassportCameraScreen from '../screens/passport/PassportCameraScreen';
import PassportCameraTrouble from '../screens/passport/PassportCameraTroubleScreen';
import PassportNFCScanScreen from '../screens/passport/PassportNFCScanScreen';
import PassportNFCTrouble from '../screens/passport/PassportNFCTroubleScreen';
import PassportOnboardingScreen from '../screens/passport/PassportOnboardingScreen';
import UnsupportedPassportScreen from '../screens/passport/UnsupportedPassportScreen';

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
