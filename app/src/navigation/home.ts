// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { HomeNavBar } from '@/components/NavBar';
import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import { black } from '@/utils/colors';

const DisclaimerScreen = lazyWithPreload(
  () => import('@/screens/home/DisclaimerScreen'),
);
const HomeScreen = lazyWithPreload(
  () => import('@/screens/home/HomeScreen'),
);
const ProofHistoryDetailScreen = lazyWithPreload(
  () => import('@/screens/home/ProofHistoryDetailScreen'),
);
const ProofHistoryScreen = lazyWithPreload(
  () => import('@/screens/home/ProofHistoryScreen'),
);
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
