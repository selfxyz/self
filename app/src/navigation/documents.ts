// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { AadhaarNavBar, IdDetailsNavBar } from '@/components/navbar';
import { HeadlessNavForEuclid } from '@/components/navbar/HeadlessNavForEuclid';
import AadhaarUploadedSuccessScreen from '@/screens/documents/aadhaar/AadhaarUploadedSuccessScreen';
import AadhaarUploadErrorScreen from '@/screens/documents/aadhaar/AadhaarUploadErrorScreen';
import AadhaarUploadScreen from '@/screens/documents/aadhaar/AadhaarUploadScreen';
import DocumentDataInfoScreen from '@/screens/documents/management/DocumentDataInfoScreen';
import IdDetailsScreen from '@/screens/documents/management/IdDetailsScreen';
import ManageDocumentsScreen from '@/screens/documents/management/ManageDocumentsScreen';
import DataConfirmationScreen from '@/screens/documents/scanning/DataConfirmationScreen';
import DocumentCameraScreen from '@/screens/documents/scanning/DocumentCameraScreen';
import DocumentCameraTroubleScreen from '@/screens/documents/scanning/DocumentCameraTroubleScreen';
import DocumentNFCMethodSelectionScreen from '@/screens/documents/scanning/DocumentNFCMethodSelectionScreen';
import DocumentNFCScanScreen from '@/screens/documents/scanning/DocumentNFCScanScreen';
import DocumentNFCTroubleScreen from '@/screens/documents/scanning/DocumentNFCTroubleScreen';
import RegistrationFallbackMRZScreen from '@/screens/documents/scanning/RegistrationFallbackMRZScreen';
import RegistrationFallbackNFCScreen from '@/screens/documents/scanning/RegistrationFallbackNFCScreen';
import ConfirmBelongingScreen from '@/screens/documents/selection/ConfirmBelongingScreen';
import CountryPickerScreen from '@/screens/documents/selection/CountryPickerScreen';
import DocumentOnboardingScreen from '@/screens/documents/selection/DocumentOnboardingScreen';
import IDPickerScreen from '@/screens/documents/selection/IDPickerScreen';
import LogoConfirmationScreen from '@/screens/documents/selection/LogoConfirmationScreen';
import KycConnectionErrorScreen from '@/screens/kyc/KycConnectionErrorScreen';
import KycFailureScreen from '@/screens/kyc/KycFailureScreen';

const documentsScreens = {
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
  DocumentNFCMethodSelection: {
    screen: DocumentNFCMethodSelectionScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    } as NativeStackNavigationOptions,
  },
  DocumentOnboarding: {
    screen: DocumentOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  CountryPicker: {
    screen: CountryPickerScreen,
    options: {
      header: HeadlessNavForEuclid,
      statusBarHidden: CountryPickerScreen.statusBar?.hidden,
      statusBarStyle: CountryPickerScreen.statusBar?.style,
      headerShown: true,
    } as NativeStackNavigationOptions,
  },
  IDPicker: {
    screen: IDPickerScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: '',
      documentTypes: [],
    },
  },
  LogoConfirmation: {
    screen: LogoConfirmationScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      documentType: '',
      countryCode: '',
    },
  },
  ConfirmBelonging: {
    screen: ConfirmBelongingScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  DataConfirmation: {
    screen: DataConfirmationScreen,
    options: {
      header: HeadlessNavForEuclid,
      statusBarHidden: DataConfirmationScreen.statusBar?.hidden,
      statusBarStyle: DataConfirmationScreen.statusBar?.style,
      headerShown: true,
    } as NativeStackNavigationOptions,
  },
  IdDetails: {
    screen: IdDetailsScreen,
    options: {
      title: '',
      header: IdDetailsNavBar,
      headerBackVisible: false,
    },
  },
  ManageDocuments: {
    screen: ManageDocumentsScreen,
    options: {
      title: 'Manage Documents',
      headerTintColor: black,
      headerStyle: {
        backgroundColor: white,
      },
      headerTitleStyle: {
        color: black,
      },
    } as NativeStackNavigationOptions,
  },
  DocumentDataInfo: {
    screen: DocumentDataInfoScreen,
    options: {
      title: 'Document Data Info',
      headerTintColor: black,
      headerStyle: {
        backgroundColor: white,
      },
    } as NativeStackNavigationOptions,
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
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      errorType: 'general',
    },
  },
  RegistrationFallbackMRZ: {
    screen: RegistrationFallbackMRZScreen,
    options: {
      title: 'REGISTRATION',
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: '',
    },
  },
  RegistrationFallbackNFC: {
    screen: RegistrationFallbackNFCScreen,
    options: {
      title: 'REGISTRATION',
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: '',
    },
  },
  KycFailure: {
    screen: KycFailureScreen,
    options: {
      headerShown: false,
      animation: 'fade',
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: '',
      canRetry: true,
    },
  },
  KycConnectionError: {
    screen: KycConnectionErrorScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      countryCode: '',
    },
  },
};

export default documentsScreens;
