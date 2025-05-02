import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DevHapticFeedbackScreen from '../screens/Settings/DevHapticFeedback';
import DevSettingsScreen from '../screens/Settings/DevSettingsScreen';
import { white } from '../utils/colors';

const settingsScreens = {
  DevSettings: {
    screen: DevSettingsScreen,
    options: {
      title: 'Developer Settings',
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
  },
  DevHapticFeedback: {
    screen: DevHapticFeedbackScreen,
    options: {
      title: 'Haptic Feedback',
    } as NativeStackNavigationOptions,
  },
};

export default settingsScreens;
