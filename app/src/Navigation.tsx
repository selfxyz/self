import 'react-native-gesture-handler';
import React from 'react';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import {
  createStackNavigator,
  StackHeaderProps,
} from '@react-navigation/stack';
import LaunchScreen from './screens/LaunchScreen';
import StartScreen from './screens/StartScreen';
import PassportOnboardingScreen from './screens/Onboarding/PassportOnboardingScreen';
import PassportCameraScreen from './screens/Onboarding/PassportCameraScreen';
import SettingsScreen from './screens/SettingsScreen';
import { NavBar } from './components/NavBar';
import MockDataScreen from './screens/MockDataScreen';
import NextScreen from './screens/NextScreen';
import { Button, View } from 'tamagui';
import HomeScreen from './screens/HomeScreen';
import DisclaimerScreen from './screens/DisclaimerScreen';
import { black, neutral400, white } from './utils/colors';
import PassportNFCScanScreen from './screens/Onboarding/PassportNFCScanScreen';
import ValidProofScreen from './screens/ValidProofScreen';
import WrongProofScreen from './screens/WrongProofScreen';
import ActivityIcon from './images/icons/activity.svg';
import SettingsIcon from './images/icons/settings.svg';
import { Title } from './components/typography/Title';
import ProveScreen from './screens/ProveScreen';

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
    <NavBar.Container bg={black} style={{ padding: 16 }} alignItems="center">
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
      <NavBar.Title>
        <Title size="large" color={white}>
          {props.options.title}
        </Title>
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
