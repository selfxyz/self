import React from 'react';
import 'react-native-gesture-handler';

import {
  StaticParamList,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  StackHeaderProps,
  createStackNavigator,
} from '@react-navigation/stack';
import { Clock9, Settings } from '@tamagui/lucide-icons';
import { Button, View } from 'tamagui';

import { NavBar } from './components/NavBar';
import DisclaimerScreen from './screens/DisclaimerScreen';
import HomeScreen from './screens/HomeScreen';
import LaunchScreen from './screens/LaunchScreen';
import MockDataScreen from './screens/MockDataScreen';
import NextScreen from './screens/NextScreen';
import PassportCameraScreen from './screens/Onboarding/PassportCameraScreen';
import PassportNFCScanScreen from './screens/Onboarding/PassportNFCScanScreen';
import PassportOnboardingScreen from './screens/Onboarding/PassportOnboardingScreen';
import SettingsScreen from './screens/SettingsScreen';
import StartScreen from './screens/StartScreen';
import ValidProofScreen from './screens/ValidProofScreen';
import WrongProofScreen from './screens/WrongProofScreen';
import { black, white } from './utils/colors';

const DefaultNavBar = (props: StackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  return (
    <NavBar.Container>
      <NavBar.LeftAction
        component={canGoBack() ? 'back' : undefined}
        onPress={goBack}
      />
      <NavBar.Title>{props.options.title}</NavBar.Title>
      <View />
    </NavBar.Container>
  );
};

const HomeNavBar = (props: StackHeaderProps) => {
  return (
    <NavBar.Container bg={black}>
      <NavBar.LeftAction
        component={
          <Button unstyled icon={<Clock9 size="$4" color={white} />} />
        }
      />
      <NavBar.Title color={white}>{props.options.title}</NavBar.Title>
      <NavBar.RightAction
        component={
          <Button unstyled icon={<Settings size="$4" color={white} />} />
        }
        onPress={() => props.navigation.navigate('Settings')}
      />
    </NavBar.Container>
  );
};

const RootStack = createStackNavigator({
  initialRouteName: 'Launch',
  screenOptions: {
    header: DefaultNavBar,
  },
  screens: {
    Launch: {
      if: () => true, // TODO: useIsNewUser
      screen: LaunchScreen,
      options: {
        headerShown: false,
      },
    },
    Start: {
      if: () => true, // TODO: useIsNewUser
      screen: StartScreen,
      options: {
        headerShown: false,
      },
    },
    PassportOnboarding: {
      screen: PassportOnboardingScreen,
      options: {
        headerShown: false,
      },
    },
    PassportCamera: {
      screen: PassportCameraScreen,
      options: {
        headerShown: false,
      },
    },
    PassportNFCScan: {
      screen: PassportNFCScanScreen,
      options: {
        headerShown: false,
      },
      initialParams: {
        passportNumber: '',
        dateOfBirth: '',
        dateOfExpiry: '',
      },
    },
    CreateMock: {
      screen: MockDataScreen,
      options: {
        if: () => true, // TODO: dev only
        title: 'Mock Passport',
      },
    },
    // TODO: rename ? maybe summary
    NextScreen: {
      screen: NextScreen,
      options: {
        title: 'TODO: NextScreen',
      },
    },
    Home: {
      screen: HomeScreen,
      options: {
        title: 'Self ID',
        header: HomeNavBar,
      },
    },
    Disclaimer: {
      screen: DisclaimerScreen,
      options: {
        title: 'Disclaimer',
        headerShown: false,
      },
    },
    ValidProofScreen: {
      screen: ValidProofScreen,
      options: {
        headerShown: false,
      },
    },
    WrongProofScreen: {
      screen: WrongProofScreen,
      options: {
        headerShown: false,
      },
    },
    Settings: {
      screen: SettingsScreen,
      options: {
        title: 'Settings',
      },
      config: {
        screens: {},
      },
    },
  },
});

const AppNavigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default AppNavigation;
