// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { DocumentSelectorForProvingScreen } from '@/screens/verification/DocumentSelectorForProvingScreen';
import ProofRequestStatusScreen from '@/screens/verification/ProofRequestStatusScreen';
import ProveScreen from '@/screens/verification/ProveScreen';
import { ProvingScreenRouter } from '@/screens/verification/ProvingScreenRouter';
import QRCodeTroubleScreen from '@/screens/verification/QRCodeTroubleScreen';
import QRCodeViewFinderScreen from '@/screens/verification/QRCodeViewFinderScreen';

/**
 * Shared header configuration for proof request screens
 */
const proofRequestHeaderOptions: NativeStackNavigationOptions = {
  title: 'Proof Requested',
  headerStyle: {
    backgroundColor: black,
  },
  headerTitleStyle: {
    color: white,
    fontWeight: '600',
  },
  headerTintColor: white,
  gestureEnabled: false,
  animation: 'none',
};

const verificationScreens = {
  ProofRequestStatus: {
    screen: ProofRequestStatusScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      gestureEnabled: false,
    } as NativeStackNavigationOptions,
  },
  ProvingScreenRouter: {
    screen: ProvingScreenRouter,
    options: proofRequestHeaderOptions,
  },
  DocumentSelectorForProving: {
    screen: DocumentSelectorForProvingScreen,
    options: proofRequestHeaderOptions,
  },
  Prove: {
    screen: ProveScreen,
    options: proofRequestHeaderOptions,
  },
  QRCodeTrouble: {
    screen: QRCodeTroubleScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  QRCodeViewFinder: {
    screen: QRCodeViewFinderScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      gestureEnabled: false,
    } as NativeStackNavigationOptions,
  },
};

export default verificationScreens;
