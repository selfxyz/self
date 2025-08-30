// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const DocumentCameraScreen = lazy(
  () => import('@/screens/document/DocumentCameraScreen'),
);
const DocumentCameraTroubleScreen = lazy(
  () => import('@/screens/document/DocumentCameraTroubleScreen'),
);
const DocumentNFCScanScreen = lazy(
  () => import('@/screens/document/DocumentNFCScanScreen'),
);
const DocumentNFCTroubleScreen = lazy(
  () => import('@/screens/document/DocumentNFCTroubleScreen'),
);
const DocumentOnboardingScreen = lazy(
  () => import('@/screens/document/DocumentOnboardingScreen'),
);
const UnsupportedDocumentScreen = lazy(
  () => import('@/screens/document/UnsupportedDocumentScreen'),
);
const DocumentNFCMethodSelectionScreen = lazy(
  () => import('@/screens/document/DocumentNFCMethodSelectionScreen'),
);

const documentScreens = {
  DocumentCamera: {
    screen: DocumentCameraScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  DocumentCameraTrouble: {
    screen: DocumentCameraTroubleScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  DocumentNFCScan: {
    screen: DocumentNFCScanScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
    initialParams: {
      passportNumber: '',
      dateOfBirth: '',
      dateOfExpiry: '',
    },
  },
  DocumentNFCTrouble: {
    screen: DocumentNFCTroubleScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
      presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
  DocumentOnboarding: {
    screen: DocumentOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      // presentation: 'modal' wanted to do this but seems to break stuff
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  UnsupportedDocument: {
    screen: UnsupportedDocumentScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      passportData: null,
    },
  },
  DocumentNFCMethodSelection: {
    screen: DocumentNFCMethodSelectionScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
};

export default documentScreens;
