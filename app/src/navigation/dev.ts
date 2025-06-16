import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { white } from '@selfxyz/ui/dist/utils/colors';

import DevHapticFeedbackScreen from '../screens/dev/DevHapticFeedback';
import DevSettingsScreen from '../screens/dev/DevSettingsScreen';
import MockDataScreen from '../screens/dev/MockDataScreen';
import MockDataScreenDeepLink from '../screens/dev/MockDataScreenDeepLink';

const devScreens = {
  CreateMock: {
    screen: MockDataScreen,
    options: {
      title: 'Mock Passport',
    } as NativeStackNavigationOptions,
  },
  MockDataDeepLink: {
    screen: MockDataScreenDeepLink,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  DevHapticFeedback: {
    screen: DevHapticFeedbackScreen,
    options: {
      title: 'Haptic Feedback',
    } as NativeStackNavigationOptions,
  },
  DevSettings: {
    screen: DevSettingsScreen,
    options: {
      title: 'Developer Settings',
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
  },
};

export default devScreens;
