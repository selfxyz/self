import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { shouldUseAesopRedesign } from '../hooks/useAesopRedesign';
import PassportOnboardingScreen from '../screens/_Aesop/PassportOnboardingScreen';
import { ProgressNavBar } from '../components/NavBar';

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your passport',
    } as NativeStackNavigationOptions,
  },
};

export default shouldUseAesopRedesign() ? aesopScreens : {};
