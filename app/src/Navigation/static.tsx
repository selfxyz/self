import React from 'react';
import { StatusBar } from 'react-native';

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import LaunchScreen from '../screens/LaunchScreen';
import ModalScreen from '../screens/Settings/ModalScreen';
import SplashScreen from '../screens/SplashScreen';
import { black } from '../utils/colors';

const staticScreens = {
  Splash: {
    screen: SplashScreen,
    options: {
      header: () => (
        <StatusBar barStyle="light-content" backgroundColor={black} />
      ),
      navigationBarColor: black,
    },
  },
  Launch: {
    screen: LaunchScreen,
    options: {
      headerShown: false,
      gestureEnabled: false,
    },
  },
  Modal: {
    screen: ModalScreen,
    options: {
      headerShown: false,
      presentation: 'transparentModal',
      animation: 'fade',
    } as NativeStackNavigationOptions,
  },
};

export default staticScreens;
