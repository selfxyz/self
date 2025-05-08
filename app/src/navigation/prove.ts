import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import ConfirmBelongingScreen from '../screens/Onboarding/ConfirmBelongingScreen';
import LoadingScreen from '../screens/Onboarding/LoadingScreen';
import ProofRequestStatusScreen from '../screens/ProveFlow/ProofRequestStatusScreen';
import ProveScreen from '../screens/ProveFlow/ProveScreen';
import QRCodeTroubleScreen from '../screens/ProveFlow/QRCodeTroubleScreen';
import QRCodeViewFinderScreen from '../screens/ProveFlow/ViewFinderScreen';
import { black, white } from '../utils/colors';

const proveScreens = {
  ConfirmBelongingScreen: {
    screen: ConfirmBelongingScreen,
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
  ProofRequestStatusScreen: {
    screen: ProofRequestStatusScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
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
    } as NativeStackNavigationOptions,
  },
  QRCodeTrouble: {
    screen: QRCodeTroubleScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  QRCodeViewFinder: {
    screen: QRCodeViewFinderScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
};

export default proveScreens;
