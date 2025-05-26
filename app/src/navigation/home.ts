import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { HomeNavBar } from '../components/NavBar';
import DisclaimerScreen from '../screens/home/DisclaimerScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProofHistoryDetailScreen from '../screens/home/ProofHistoryDetailScreen';
import ProofHistoryScreen from '../screens/home/ProofHistoryScreen';
import { black } from '../utils/colors';

const homeScreens = {
  Disclaimer: {
    screen: DisclaimerScreen,
    options: {
      title: 'Disclaimer',
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  Home: {
    screen: HomeScreen,
    options: {
      title: 'Self',
      header: HomeNavBar,
      navigationBarColor: black,
      presentation: 'card',
    } as NativeStackNavigationOptions,
  },
  ProofHistory: {
    screen: ProofHistoryScreen,
    options: {
      title: 'Approved Requests',
      navigationBarColor: black,
      headerBackTitle: 'close',
    },
  },
  ProofHistoryDetail: {
    screen: ProofHistoryDetailScreen,
    options: {
      title: 'Approval',
    },
  },
};

export default homeScreens;
