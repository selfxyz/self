import React from 'react';
import 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  StaticParamList,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  StackHeaderProps,
  createStackNavigator,
} from '@react-navigation/stack';
import { Button, ViewStyle } from 'tamagui';

import { NavBar } from './components/NavBar';
import ActivityIcon from './images/icons/activity.svg';
import SettingsIcon from './images/icons/settings.svg';
import DisclaimerScreen from './screens/DisclaimerScreen';
import HomeScreen from './screens/HomeScreen';
import LaunchScreen from './screens/LaunchScreen';
import MockDataScreen from './screens/MockDataScreen';
import NextScreen from './screens/NextScreen';
import PassportCameraScreen from './screens/Onboarding/PassportCameraScreen';
import PassportNFCScanScreen from './screens/Onboarding/PassportNFCScanScreen';
import PassportOnboardingScreen from './screens/Onboarding/PassportOnboardingScreen';
import ProveScreen from './screens/ProveFlow/ProveScreen';
import ValidProofScreen from './screens/ProveFlow/ValidProofScreen';
import QRCodeViewFinderScreen from './screens/ProveFlow/ViewFinder';
import WrongProofScreen from './screens/ProveFlow/WrongProofScreen';
import AccountRecoveryScreen from './screens/Settings/AccountRecoveryScreen';
import ShowRecoveryPhraseScreen from './screens/Settings/ShowRecoveryPhraseScreen';
import SettingsScreen from './screens/SettingsScreen';
import SplashScreen from './screens/SplashScreen';
import StartScreen from './screens/StartScreen';
import { black, neutral400, white } from './utils/colors';

const DefaultNavBar = (props: StackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={12}
      paddingBottom={20}
      backgroundColor={headerStyle.backgroundColor as string}
      barStyle={
        options.headerTintColor === white ? 'light-content' : 'dark-content'
      }
    >
      <NavBar.LeftAction
        component={canGoBack() ? 'back' : undefined}
        onPress={goBack}
        color={options.headerTintColor}
      />
      <NavBar.Title color={options.headerTintColor}>
        {props.options.title}
      </NavBar.Title>
    </NavBar.Container>
  );
};

const HomeNavBar = (props: StackHeaderProps) => {
  const insets = useSafeAreaInsets();
  return (
    <NavBar.Container
      backgroundColor={black}
      barStyle={'light-content'}
      padding={16}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 20)}
    >
      <NavBar.LeftAction
        component={
          <Button
            size="$3"
            unstyled
            icon={
              <ActivityIcon width={'35'} height={'100%'} color={neutral400} />
            }
          />
        }
        onPress={() => props.navigation.navigate('Activity')}
      />
      <NavBar.Title size="large" color={white}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          <Button
            size={'$3'}
            unstyled
            icon={
              <SettingsIcon width={'35'} height={'100%'} color={neutral400} />
            }
          />
        }
        onPress={() => props.navigation.navigate('Settings')}
      />
    </NavBar.Container>
  );
};

const RootStack = createStackNavigator({
  initialRouteName: 'Splash',
  screenOptions: {
    header: DefaultNavBar,
  },

  layout: ({ children }) => <SafeAreaProvider>{children}</SafeAreaProvider>,
  screens: {
    Splash: {
      screen: SplashScreen,
      options: {
        headerShown: false,
      },
    },
    Launch: {
      screen: LaunchScreen,
      options: {
        headerShown: false,
      },
    },
    Start: {
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
        title: 'Self',
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
    QRCodeViewFinder: {
      screen: QRCodeViewFinderScreen,
      options: {
        headerShown: false,
      },
    },
    ProveScreen: {
      screen: ProveScreen,
      options: {
        title: 'Request Proof',
        headerStyle: {
          backgroundColor: black,
        },
        headerTintColor: white,
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
    AccountRecovery: {
      screen: AccountRecoveryScreen,
      options: {
        headerShown: false,
      },
    },
    ShowRecoveryPhrase: {
      screen: ShowRecoveryPhraseScreen,
      options: {
        headerShown: false,
      },
    },
  },
});

const AppNavigation = createStaticNavigation(RootStack);

export type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default AppNavigation;
