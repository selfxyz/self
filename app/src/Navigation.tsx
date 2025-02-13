import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  StaticParamList,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DefaultNavBar from './components/DefaultNavBar';
import HomeNavBar from './components/HomeNavBar';
import AccountRecoveryChoiceScreen from './screens/AccountFlow/AccountRecoveryChoiceScreen';
import AccountRecoveryScreen from './screens/AccountFlow/AccountRecoveryScreen';
import AccountVerifiedSuccessScreen from './screens/AccountFlow/AccountVerifiedSuccessScreen';
import RecoverWithCloudScreen from './screens/AccountFlow/RecoverWithCloud';
import RecoverWithPhraseScreen from './screens/AccountFlow/RecoverWithPhraseScreen';
import SaveRecoveryPhraseScreen from './screens/AccountFlow/SaveRecoveryPhraseScreen';
import DisclaimerScreen from './screens/DisclaimerScreen';
import HomeScreen from './screens/HomeScreen';
import LaunchScreen from './screens/LaunchScreen';
import MockDataScreen from './screens/MockDataScreen';
import NextScreen from './screens/NextScreen';
import ConfirmBelongingScreen from './screens/Onboarding/ConfirmBelongingScreen';
import LoadingScreen from './screens/Onboarding/LoadingScreen';
import PassportCameraScreen from './screens/Onboarding/PassportCameraScreen';
import PassportNFCScanScreen from './screens/Onboarding/PassportNFCScanScreen';
import PassportOnboardingScreen from './screens/Onboarding/PassportOnboardingScreen';
import ProofRequestStatusScreen from './screens/ProveFlow/ProofRequestStatusScreen';
import ProveScreen from './screens/ProveFlow/ProveScreen';
import QRCodeViewFinderScreen from './screens/ProveFlow/ViewFinder';
import CloudBackupScreen from './screens/Settings/CloudBackupScreen';
import DevSettingsScreen from './screens/Settings/DevSettingsScreen';
import PassportDataInfoScreen from './screens/Settings/PassportDataInfoScreen';
import ShowRecoveryPhraseScreen from './screens/Settings/ShowRecoveryPhraseScreen';
import SettingsScreen from './screens/SettingsScreen';
import SplashScreen from './screens/SplashScreen';
import StartScreen from './screens/StartScreen';
import { black, slate300, white } from './utils/colors';

const AppNavigation = createNativeStackNavigator({
  initialRouteName: 'Splash',
  orientation: 'portrait_up',
  screenOptions: {
    header: DefaultNavBar,
    navigationBarColor: white,
  },
  layout: ({ children }) => <SafeAreaProvider>{children}</SafeAreaProvider>,
  screens: {
    /**
     * STATIC SCREENS
     */
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
    /**
     * SCAN PASSPORT FLOW
     */
    PassportOnboarding: {
      screen: PassportOnboardingScreen,
      options: {
        animation: 'slide_from_bottom',
        // presentation: 'modal' wanted to do this but seems to break stuff
        headerShown: false,
      },
    },
    PassportCamera: {
      screen: PassportCameraScreen,
      options: {
        headerShown: false,
        animation: 'slide_from_bottom',
      },
    },
    PassportNFCScan: {
      screen: PassportNFCScanScreen,
      options: {
        headerShown: false,
        animation: 'slide_from_bottom',
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
    LoadingScreen: {
      screen: LoadingScreen,
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
    /**
     * HOME SECTION
     */
    Home: {
      screen: HomeScreen,
      options: {
        title: 'Self',
        header: HomeNavBar,
        navigationBarColor: black,
        presentation: 'card',
      },
    },
    Disclaimer: {
      screen: DisclaimerScreen,
      options: {
        title: 'Disclaimer',
        headerShown: false,
      },
    },
    /**
     * QR CODE SCANNING + PROVE FLOW
     */
    QRCodeViewFinder: {
      screen: QRCodeViewFinderScreen,
      options: {
        headerShown: false,
        animation: 'slide_from_bottom',
        // presentation: 'modal',
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
        animation: 'slide_from_bottom',
        presentation: 'containedModal',
      },
    },
    /**
     * CREATE OR RECOVER ACCOUNT
     */
    AccountRecovery: {
      screen: AccountRecoveryScreen,
      options: {
        headerShown: false,
      },
    },
    AccountRecoveryChoice: {
      screen: AccountRecoveryChoiceScreen,
      options: {
        headerShown: false,
      },
    },
    SaveRecoveryPhrase: {
      screen: SaveRecoveryPhraseScreen,
      options: {
        headerShown: false,
        animation: 'slide_from_bottom',
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
    RecoverWithCloud: {
      screen: RecoverWithCloudScreen,
      options: {
        headerShown: false,
      },
    },
    AccountVerifiedSuccess: {
      screen: AccountVerifiedSuccessScreen,
      options: {
        headerShown: false,
        animation: 'slide_from_bottom',
      },
    },
    /**
     * SETTINGS
     */
    Settings: {
      screen: SettingsScreen,
      options: {
        animation: 'slide_from_bottom',
        title: 'Settings',
        headerStyle: {
          backgroundColor: white,
        },
        headerTitleStyle: {
          color: black,
        },
        navigationBarColor: black,
      },
      config: {
        screens: {},
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
    CloudBackupSettings: {
      screen: CloudBackupScreen,
      options: {
        title: 'Cloud backup',
        headerStyle: {
          backgroundColor: black,
        },
        headerTitleStyle: {
          color: slate300,
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
