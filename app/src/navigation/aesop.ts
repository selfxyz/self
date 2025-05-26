import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { ProgressNavBar } from '../components/NavBar';
import { shouldShowAesopRedesign } from '../hooks/useAesopRedesign';
import PassportOnboardingScreen from '../screens/aesop/PassportOnboardingScreen';
import { white } from '../utils/colors';

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your passport',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 1,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },
};

export const getAesopScreens = () =>
  shouldShowAesopRedesign() ? aesopScreens : {};
export default getAesopScreens();
