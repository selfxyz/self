// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { lazy } from 'react';

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HomeNavBar } from '@src/components/NavBar';
import { black } from '@src/utils/colors';

const DisclaimerScreen = lazy(
  () => import('@src/screens/home/DisclaimerScreen'),
);
const HomeScreen = lazy(() => import('@src/screens/home/HomeScreen'));
const ProofHistoryDetailScreen = lazy(
  () => import('@src/screens/home/ProofHistoryDetailScreen'),
);
const ProofHistoryScreen = lazy(
  () => import('@src/screens/home/ProofHistoryScreen'),
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
