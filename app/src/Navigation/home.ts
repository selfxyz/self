import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import HomeNavBar from '../components/NavBar/HomeNavBar';
import DisclaimerScreen from '../screens/DisclaimerScreen';
import HomeScreen from '../screens/HomeScreen';
import { black } from '../utils/colors';

const homeScreens = {
  Home: {
    screen: HomeScreen,
    options: {
      title: 'Self',
      header: HomeNavBar,
      navigationBarColor: black,
      presentation: 'card',
    } as NativeStackNavigationOptions,
  },
  Disclaimer: {
    screen: DisclaimerScreen,
    options: {
      title: 'Disclaimer',
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
};

export default homeScreens;
