import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import PassportDataNotFound from '../screens/Onboarding/PassportDataNotFound';
import ProofRequestStatusScreen from '../screens/ProveFlow/ProofRequestStatusScreen';
import ProveScreen from '../screens/ProveFlow/ProveScreen';
import QRCodeTroubleScreen from '../screens/ProveFlow/QRCodeTrouble';
import QRCodeViewFinderScreen from '../screens/ProveFlow/ViewFinder';
import { black, white } from '../utils/colors';

const proveScreens = {
  QRCodeViewFinder: {
    screen: QRCodeViewFinderScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
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
  PassportDataNotFound: {
    screen: PassportDataNotFound,
    options: {
      headerShown: false,
      gestureEnabled: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
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
  ProofRequestStatusScreen: {
    screen: ProofRequestStatusScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default proveScreens;
