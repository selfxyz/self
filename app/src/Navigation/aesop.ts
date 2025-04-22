import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { ProgressNavBar } from '../components/NavBar';
import { shouldShowAesopRedesign } from '../hooks/useAesopRedesign';
import PassportOnboardingScreen from '../screens/_Aesop/PassportOnboardingScreen';
import { white } from '../utils/colors';

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your passport',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 1,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },

  // stub the rest of the steps. will update in future pr
  PassportCamera: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Take a photo',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 2,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },

  PassportNFC: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan NFC',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 3,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },

  PassportComplete: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Complete',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 4,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },
};

export default shouldShowAesopRedesign() ? aesopScreens : {};
