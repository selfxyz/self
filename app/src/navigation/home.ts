// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { HomeNavBar } from '@/components/NavBar';
import PointsScreen from '@/components/NavBar/Points';
import { PointsNavBar } from '@/components/NavBar/PointsNavBar';
import ReferralScreen from '@/screens/app/ReferralScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import ProofHistoryDetailScreen from '@/screens/home/ProofHistoryDetailScreen';
import ProofHistoryScreen from '@/screens/home/ProofHistoryScreen';

const homeScreens = {
  Home: {
    screen: HomeScreen,
    options: {
      title: 'Self',
      header: HomeNavBar,
      presentation: 'card',
    } as NativeStackNavigationOptions,
  },
  Points: {
    screen: PointsScreen,
    options: {
      title: 'Self Points',
      header: PointsNavBar,
      presentation: 'card',
    } as NativeStackNavigationOptions,
  },
  Referral: {
    screen: ReferralScreen,
    options: {
      headerShown: false,
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
};

export default homeScreens;
