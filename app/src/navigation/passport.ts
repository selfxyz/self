import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import PassportCameraScreen from '../screens/Onboarding/PassportCameraScreen';
import PassportCameraTrouble from '../screens/Onboarding/PassportCameraTroubleScreen';
import PassportNFCScanScreen from '../screens/Onboarding/PassportNFCScanScreen';
import PassportNFCTrouble from '../screens/Onboarding/PassportNFCTroubleScreen';
import PassportOnboardingScreen from '../screens/Onboarding/PassportOnboardingScreen';
import UnsupportedPassportScreen from '../screens/Onboarding/UnsupportedPassportScreen';

const passportScreens = {
  PassportCamera: {
    screen: PassportCameraScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  PassportCameraTrouble: {
    screen: PassportCameraTrouble,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  PassportNFCScan: {
    screen: PassportNFCScanScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
    initialParams: {
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    },
  },
  PassportNFCTrouble: {
    screen: PassportNFCTrouble,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      // presentation: 'modal' wanted to do this but seems to break stuff
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  UnsupportedPassport: {
    screen: UnsupportedPassportScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
};

export default passportScreens;
