import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DevHapticFeedbackScreen from '../screens/dev/DevHapticFeedback';
import DevSettingsScreen from '../screens/dev/DevSettingsScreen';
import MockDataScreen from '../screens/dev/MockDataScreen';
import { white } from '../utils/colors';

const devScreens = {
  CreateMock: {
    screen: MockDataScreen,
    options: {
      title: 'Mock Passport',
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
