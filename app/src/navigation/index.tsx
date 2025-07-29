// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import {
  createNavigationContainerRef,
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DefaultNavBar } from '../components/NavBar';
import AppLayout from '../layouts/AppLayout';
import analytics from '../utils/analytics';
import { white } from '../utils/colors';
import { setupUniversalLinkListenerInNavigation } from '../utils/deeplinks';
import { getAesopScreens } from './aesop';
import devScreens from './dev';
import homeScreens from './home';
import miscScreens from './misc';
import passportScreens from './passport';
import proveScreens from './prove';
import recoveryScreens from './recovery';
import settingsScreens from './settings';

export const navigationScreens = {
  ...miscScreens,
  ...passportScreens,
  ...homeScreens,
  ...proveScreens,
  ...settingsScreens,
  ...recoveryScreens,
  ...devScreens,
  // add last to override other screens
  ...getAesopScreens(),
};

const AppNavigation = createNativeStackNavigator({
  id: undefined,
  initialRouteName: Platform.OS === 'web' ? 'Home' : 'Splash',
  screenOptions: {
    header: DefaultNavBar,
    navigationBarColor: white,
  },
  layout: AppLayout,
  screens: navigationScreens,
});

export type RootStackParamList = StaticParamList<typeof AppNavigation>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Create a ref that we can use to access the navigation state
export const navigationRef = createNavigationContainerRef();

const { trackScreenView } = analytics();

const Navigation = createStaticNavigation(AppNavigation);
const NavigationWithTracking = () => {
  const trackScreen = () => {
    const currentRoute = navigationRef.getCurrentRoute();
    if (currentRoute) {
      console.log(`Screen View: ${currentRoute.name}`);
      trackScreenView(`${currentRoute.name}`, {
        screenName: currentRoute.name,
      });
    }
  };

  // Setup universal link handling at the navigation level
  useEffect(() => {
    const cleanup = setupUniversalLinkListenerInNavigation();

    return () => {
      cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView>
      <Navigation ref={navigationRef} onStateChange={trackScreen} />
    </GestureHandlerRootView>
  );
};

export default NavigationWithTracking;
