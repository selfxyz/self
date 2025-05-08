import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';

import LaunchScreen from '../screens/static/LaunchScreen';
import ModalScreen from '../screens/static/ModalScreen';
import SplashScreen from '../screens/static/SplashScreen';
import { black } from '../utils/colors';

const staticScreens = {
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

export default staticScreens;
