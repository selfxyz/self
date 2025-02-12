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
  NativeStackHeaderProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { Button, TextStyle, ViewStyle } from 'tamagui';

import { NavBar } from './components/NavBar';
import ActivityIcon from './images/icons/activity.svg';
import SettingsIcon from './images/icons/settings.svg';
import AccountRecoveryScreen from './screens/AccountFlow/AccountRecoveryScreen';
import AccountVerifiedSuccessScreen from './screens/AccountFlow/AccountVerifiedSuccessScreen';
import RecoverWithPhraseScreen from './screens/AccountFlow/RecoverWithPhraseScreen';
import SaveRecoveryPhraseScreen from './screens/AccountFlow/SaveRecoveryPhraseScreen';
import DisclaimerScreen from './screens/DisclaimerScreen';
import HomeScreen from './screens/HomeScreen';
import LaunchScreen from './screens/LaunchScreen';
import MockDataScreen from './screens/MockDataScreen';
import NextScreen from './screens/NextScreen';
import ConfirmBelongingScreen from './screens/Onboarding/ConfirmBelongingScreen';
import PassportCameraScreen from './screens/Onboarding/PassportCameraScreen';
import PassportNFCScanScreen from './screens/Onboarding/PassportNFCScanScreen';
import PassportOnboardingScreen from './screens/Onboarding/PassportOnboardingScreen';
import ProofRequestStatusScreen from './screens/ProveFlow/ProofRequestStatusScreen';
import ProveScreen from './screens/ProveFlow/ProveScreen';
import QRCodeViewFinderScreen from './screens/ProveFlow/ViewFinder';
import DevSettingsScreen from './screens/Settings/DevSettingsScreen';
import PassportDataInfoScreen from './screens/Settings/PassportDataInfoScreen';
import ShowRecoveryPhraseScreen from './screens/Settings/ShowRecoveryPhraseScreen';
import SettingsScreen from './screens/SettingsScreen';
import SplashScreen from './screens/SplashScreen';
import StartScreen from './screens/StartScreen';
import { black, neutral400, slate300, white } from './utils/colors';

const DefaultNavBar = (props: NativeStackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  const insets = useSafeAreaInsets();
  return (
    <NavBar.Container
      gap={14}
      paddingHorizontal={20}
      paddingTop={Math.max(insets.top, 12)}
      paddingBottom={20}
      backgroundColor={headerStyle.backgroundColor as string}
      barStyle={
        options.headerTintColor === white ||
        (options.headerTitleStyle as TextStyle)?.color === white
          ? 'light-content'
          : 'dark-content'
      }
    >
      <NavBar.LeftAction
        component={
          options.headerBackTitle || (canGoBack() ? 'back' : undefined)
        }
        onPress={goBack}
        {...options.headerTitleStyle}
      />
      <NavBar.Title {...options.headerTitleStyle}>
        {props.options.title}
      </NavBar.Title>
    </NavBar.Container>
  );
};

const HomeNavBar = (props: NativeStackHeaderProps) => {
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

const AppNavigation = createNativeStackNavigator({
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
    ConfirmBelongingScreen: {
      screen: ConfirmBelongingScreen,
      options: {
        headerShown: false,
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
        headerTitleStyle: {
          color: white,
        },
      },
    },
    ProofRequestStatusScreen: {
      screen: ProofRequestStatusScreen,
      options: {
        headerShown: false,
      },
    },
    Settings: {
      screen: SettingsScreen,
      options: {
        title: 'Settings',
        headerStyle: {
          backgroundColor: white,
        },
        headerTitleStyle: {
          color: black,
        },
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
    SaveRecoveryPhrase: {
      screen: SaveRecoveryPhraseScreen,
      options: {
        headerShown: false,
      },
    },
    RecoverWithPhrase: {
      screen: RecoverWithPhraseScreen,
      options: {
        headerTintColor: black,
        title: 'Enter Recovery Phrase',
        headerStyle: {
          backgroundColor: black,
        },
        headerTitleStyle: {
          color: slate300,
        },
        headerBackTitle: 'close',
      },
    },
    AccountVerifiedSuccess: {
      screen: AccountVerifiedSuccessScreen,
      options: {
        headerShown: false,
      },
    },
    ShowRecoveryPhrase: {
      screen: ShowRecoveryPhraseScreen,
      options: {
        title: 'Recovery Phrase',
        headerStyle: {
          backgroundColor: white,
        },
      },
    },
    PassportDataInfo: {
      screen: PassportDataInfoScreen,
      options: {
        title: 'Passport Data Info',
        headerStyle: {
          backgroundColor: white,
        },
      },
    },
    DevSettings: {
      screen: DevSettingsScreen,
      options: {
        title: 'Developer Settings',
        headerStyle: {
          backgroundColor: white,
        },
      },
    },
  },
});

export type RootStackParamList = StaticParamList<typeof AppNavigation>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export default createStaticNavigation(AppNavigation);
