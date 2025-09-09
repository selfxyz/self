// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DocumentCameraScreen from '@/screens/document/DocumentCameraScreen';
import DocumentCameraTroubleScreen from '@/screens/document/DocumentCameraTroubleScreen';
import DocumentNFCMethodSelectionScreen from '@/screens/document/DocumentNFCMethodSelectionScreen';
import DocumentNFCScanScreen from '@/screens/document/DocumentNFCScanScreen';
import DocumentNFCTroubleScreen from '@/screens/document/DocumentNFCTroubleScreen';
import DocumentOnboardingScreen from '@/screens/document/DocumentOnboardingScreen';
import UnsupportedDocumentScreen from '@/screens/document/UnsupportedDocumentScreen';

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
      countryCode: null,
      documentCategory: null,
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
