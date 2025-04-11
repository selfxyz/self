import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { ProgressNavBar } from '../components/NavBar';
import { shouldShowAesopRedesign } from '../hooks/useAesopRedesign';
import PassportOnboardingScreen from '../screens/_Aesop/PassportOnboardingScreen';
import { slate100 } from '../utils/colors';

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your passport',
      headerStyle: {
        backgroundColor: slate100,
      },
    } as NativeStackNavigationOptions,
  },
};

export default shouldShowAesopRedesign() ? aesopScreens : {};
