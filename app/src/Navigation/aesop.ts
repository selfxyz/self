import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { shouldUseAesopRedesign } from '../hooks/useAesopRedesign';
import PassportOnboardingScreen from '../screens/_Aesop/PassportOnboardingScreen';

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      // presentation: 'modal' wanted to do this but seems to break stuff
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
};

export default shouldUseAesopRedesign() ? aesopScreens : {};
