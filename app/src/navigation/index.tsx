// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { Suspense, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'tamagui';

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

import type { StaticParamList } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

export type RootStackParamList = StaticParamList<typeof AppNavigation>;

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

// Create a ref that we can use to access the navigation state
export const navigationRef = createNavigationContainerRef();

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const { trackScreenView } = analytics();
const Navigation = createStaticNavigation(AppNavigation);

const SuspenseFallback = () => {
  if (Platform.OS === 'web') {
    return <div>Loading...</div>;
  }
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
};

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
      <Suspense fallback={<SuspenseFallback />}>
        <Navigation ref={navigationRef} onStateChange={trackScreen} />
      </Suspense>
    </GestureHandlerRootView>
  );
};

export default NavigationWithTracking;
