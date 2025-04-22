import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import MockDataScreen from '../screens/MockDataScreen';
import ConfirmBelongingScreen from '../screens/Onboarding/ConfirmBelongingScreen';
import LoadingScreen from '../screens/Onboarding/LoadingScreen';
import PassportCameraScreen from '../screens/Onboarding/PassportCameraScreen';
import PassportCameraTrouble from '../screens/Onboarding/PassportCameraTrouble';
import PassportNFCScanScreen from '../screens/Onboarding/PassportNFCScanScreen';
import PassportNFCTrouble from '../screens/Onboarding/PassportNFCTrouble';
import PassportOnboardingScreen from '../screens/Onboarding/PassportOnboardingScreen';
import UnsupportedPassportScreen from '../screens/Onboarding/UnsupportedPassport';
import { black } from '../utils/colors';

const passportScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      // presentation: 'modal' wanted to do this but seems to break stuff
      headerShown: false,
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
  PassportNFCTrouble: {
    screen: PassportNFCTrouble,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  PassportCamera: {
    screen: PassportCameraScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
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
  ConfirmBelongingScreen: {
    screen: ConfirmBelongingScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  UnsupportedPassport: {
    screen: UnsupportedPassportScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  LoadingScreen: {
    screen: LoadingScreen,
    options: {
      headerShown: false,
      navigationBarColor: black,
    } as NativeStackNavigationOptions,
  },
  CreateMock: {
    screen: MockDataScreen,
    options: {
      title: 'Mock Passport',
    } as NativeStackNavigationOptions,
  },
};

export default passportScreens;
