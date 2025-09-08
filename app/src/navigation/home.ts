// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { HomeNavBar, IdDetailsNavBar } from '@/components/NavBar';

const DisclaimerScreen = lazy(() => import('@/screens/home/DisclaimerScreen'));
const HomeScreen = lazy(() => import('@/screens/home/HomeScreen'));
const ProofHistoryDetailScreen = lazy(
  () => import('@/screens/home/ProofHistoryDetailScreen'),
);
const ProofHistoryScreen = lazy(
  () => import('@/screens/home/ProofHistoryScreen'),
);
const IdDetailsScreen = lazy(() => import('@/screens/home/IdDetailsScreen'));
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
      presentation: 'card',
    } as NativeStackNavigationOptions,
  },
  ProofHistory: {
    screen: ProofHistoryScreen,
    options: {
      title: 'Approved Requests',
      headerBackTitle: 'close',
    },
  },
  ProofHistoryDetail: {
    screen: ProofHistoryDetailScreen,
    options: {
      title: 'Approval',
    },
  },
  IdDetails: {
    screen: IdDetailsScreen,
    options: {
      title: '',
      header: IdDetailsNavBar, // Use custom header
      headerBackVisible: false, // Hide default back button
    },
  },
};

export default homeScreens;
