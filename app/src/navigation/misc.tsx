// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';

import LaunchScreen from '../screens/misc/LaunchScreen';
import LoadingScreen from '../screens/misc/LoadingScreen';
import ModalScreen from '../screens/misc/ModalScreen';
import SplashScreen from '../screens/misc/SplashScreen';
import { black } from '../utils/colors';

const miscScreens = {
  Launch: {
    screen: LaunchScreen,
    options: {
      header: () => (
        <StatusBar barStyle="light-content" backgroundColor={black} />
      ),
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
      header: () => (
        <StatusBar barStyle="light-content" backgroundColor={black} />
      ),
      navigationBarColor: black,
    },
  },
};

export default miscScreens;
