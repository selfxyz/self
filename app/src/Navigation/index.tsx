import 'react-native-gesture-handler';

import {
  createNavigationContainerRef,
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DefaultNavBar } from '../components/NavBar';
import AppLayout from '../layouts/AppLayout';
import analytics from '../utils/analytics';
import { white } from '../utils/colors';
import { setupUniversalLinkListenerInNavigation } from '../utils/deeplinks';
import accountScreens from './account';
import aesopScreens from './aesop';
import devScreens from './dev';
import homeScreens from './home';
import passportScreens from './passport';
import proveScreens from './prove';
import recoveryScreens from './recovery';
import settingsScreens from './settings';
import staticScreens from './static';

const AppNavigation = createNativeStackNavigator({
  initialRouteName: 'Splash',
  orientation: 'portrait_up',
  screenOptions: {
    header: DefaultNavBar,
    navigationBarColor: white,
  },
  layout: AppLayout,
  screens: {
    ...staticScreens,
    ...passportScreens,
    ...homeScreens,
    ...proveScreens,
    ...accountScreens,
    ...settingsScreens,
    ...recoveryScreens,
    ...devScreens,
    ...aesopScreens,
  },
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
  React.useEffect(() => {
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
