// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { Suspense, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'tamagui';
import type { StaticParamList } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DefaultNavBar } from '@/components/NavBar';
import AppLayout from '@/layouts/AppLayout';
import { getAesopScreens } from '@/navigation/aesop';
// Import dev screens type for conditional inclusion
import type devScreensType from '@/navigation/dev';
// Dev screens are conditionally loaded to avoid bundling in production
import homeScreens from '@/navigation/home';
import miscScreens from '@/navigation/misc';
import passportScreens from '@/navigation/passport';
import proveScreens from '@/navigation/prove';
import recoveryScreens from '@/navigation/recovery';
import settingsScreens from '@/navigation/settings';
import analytics from '@/utils/analytics';
import { white } from '@/utils/colors';
import { setupUniversalLinkListenerInNavigation } from '@/utils/deeplinks';

// Conditionally load dev screens only in development
const devScreens: typeof devScreensType = __DEV__
  ? require('@/navigation/dev').default
  : ({} as typeof devScreensType);

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

// Create a ref that we can use to access the navigation state
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
      if (__DEV__) console.log(`Screen View: ${currentRoute.name}`);
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
