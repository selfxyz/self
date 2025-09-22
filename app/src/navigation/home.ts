// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { HomeNavBar, IdDetailsNavBar } from '@/components/NavBar';
import { AadhaarNavBar } from '@/components/NavBar/AadhaarNavBar';
import AadhaarUploadedSuccessScreen from '@/screens/document/aadhaar/AadhaarUploadedSuccessScreen';
import AadhaarUploadErrorScreen from '@/screens/document/aadhaar/AadhaarUploadErrorScreen';
import AadhaarUploadScreen from '@/screens/document/aadhaar/AadhaarUploadScreen';
import DisclaimerScreen from '@/screens/home/DisclaimerScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import IdDetailsScreen from '@/screens/home/IdDetailsScreen';
import ProofHistoryDetailScreen from '@/screens/home/ProofHistoryDetailScreen';
import ProofHistoryScreen from '@/screens/home/ProofHistoryScreen';

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
  AadhaarUpload: {
    screen: AadhaarUploadScreen,
    options: {
      title: 'AADHAAR REGISTRATION',
      header: AadhaarNavBar,
      headerBackVisible: false,
    } as NativeStackNavigationOptions,
  },
  AadhaarUploadSuccess: {
    screen: AadhaarUploadedSuccessScreen,
    options: {
      title: 'AADHAAR REGISTRATION',
      header: AadhaarNavBar,
      headerBackVisible: false,
    } as NativeStackNavigationOptions,
  },
  AadhaarUploadError: {
    screen: AadhaarUploadErrorScreen,
    options: {
      title: 'AADHAAR REGISTRATION',
      header: AadhaarNavBar,
      headerBackVisible: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      errorType: 'general',
    },
  },
};

export default homeScreens;
