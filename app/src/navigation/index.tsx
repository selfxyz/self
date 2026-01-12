// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { StaticParamList } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  createStaticNavigation,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { DocumentCategory } from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { DefaultNavBar } from '@/components/navbar';
import useRecoveryPrompts from '@/hooks/useRecoveryPrompts';
import AppLayout from '@/layouts/AppLayout';
import accountScreens from '@/navigation/account';
import appScreens from '@/navigation/app';
import { setupUniversalLinkListenerInNavigation } from '@/navigation/deeplinks';
import devScreens from '@/navigation/devTools';
import documentsScreens from '@/navigation/documents';
import homeScreens from '@/navigation/home';
import onboardingScreens from '@/navigation/onboarding';
import sharedScreens from '@/navigation/shared';
import starfallScreens from '@/navigation/starfall';
import verificationScreens from '@/navigation/verification';
import type { ModalNavigationParams } from '@/screens/app/ModalScreen';
import type { WebViewScreenParams } from '@/screens/shared/WebViewScreen';
import { trackScreenView } from '@/services/analytics';
import type { ProofHistory } from '@/stores/proofTypes';

export const navigationScreens = {
  ...appScreens,
  ...onboardingScreens,
  ...homeScreens,
  ...documentsScreens,
  ...verificationScreens,
  ...accountScreens,
  ...sharedScreens,
  ...starfallScreens,
  ...devScreens, // allow in production for testing
};

const AppNavigation = createNativeStackNavigator({
  id: undefined,
  initialRouteName: Platform.OS === 'web' ? 'Home' : 'Splash',
  screenOptions: {
    header: DefaultNavBar,
  },
  layout: AppLayout,
  screens: navigationScreens,
});

type BaseRootStackParamList = StaticParamList<typeof AppNavigation>;

// Explicitly declare route params that are not inferred from initialParams
export type RootStackParamList = Omit<
  BaseRootStackParamList,
  | 'AadhaarUpload'
  | 'AadhaarUploadError'
  | 'AadhaarUploadSuccess'
  | 'AccountRecovery'
  | 'AccountVerifiedSuccess'
  | 'CloudBackupSettings'
  | 'ComingSoon'
  | 'ConfirmBelonging'
  | 'CreateMock'
  | 'Disclaimer'
  | 'DocumentNFCScan'
  | 'DocumentOnboarding'
  | 'DocumentSelectorForProving'
  | 'ProvingScreenRouter'
  | 'Gratification'
  | 'Home'
  | 'IDPicker'
  | 'IdDetails'
  | 'Loading'
  | 'Modal'
  | 'MockDataDeepLink'
  | 'Points'
  | 'PointsInfo'
  | 'ProofHistoryDetail'
  | 'Prove'
  | 'SaveRecoveryPhrase'
  | 'WebView'
> & {
  // Shared screens
  ComingSoon: {
    countryCode?: string;
    documentCategory?: string;
  };
  WebView: WebViewScreenParams;

  // Document screens
  IDPicker: {
    countryCode: string;
    documentTypes: string[];
  };
  ConfirmBelonging:
    | {
        documentCategory?: DocumentCategory;
        signatureAlgorithm?: string;
        curveOrExponent?: string;
      }
    | undefined;
  DocumentNFCScan:
    | {
        passportNumber?: string;
        dateOfBirth?: string;
        dateOfExpiry?: string;
      }
    | undefined;
  DocumentCameraTrouble: undefined;
  DocumentOnboarding: undefined;

  // Aadhaar screens
  AadhaarUpload: {
    countryCode: string;
  };
  AadhaarUploadSuccess: undefined;
  AadhaarUploadError: {
    errorType: string;
  };

  // Account/Recovery screens
  AccountRecovery:
    | {
        nextScreen?: string;
      }
    | undefined;
  SaveRecoveryPhrase:
    | {
        nextScreen?: string;
      }
    | undefined;
  CloudBackupSettings:
    | {
        nextScreen?: 'SaveRecoveryPhrase';
        returnToScreen?: 'Points';
      }
    | undefined;
  ProofSettings: undefined;
  AccountVerifiedSuccess: undefined;

  // Proof/Verification screens
  ProofHistoryDetail: {
    data: ProofHistory;
  };
  Prove:
    | {
        scrollOffset?: number;
      }
    | undefined;
  ProvingScreenRouter: undefined;
  DocumentSelectorForProving:
    | {
        documentType?: string;
      }
    | undefined;

  // App screens
  Loading: {
    documentCategory?: DocumentCategory;
    signatureAlgorithm?: string;
    curveOrExponent?: string;
  };
  Modal: ModalNavigationParams;
  Gratification: {
    points?: number;
  };
  StarfallPushCode: undefined;

  // Home screens
  Home: {
    testReferralFlow?: boolean;
  };
  Points: undefined;
  PointsInfo:
    | {
        showNextButton?: boolean;
        onNextButtonPress?: () => void;
      }
    | undefined;
  IdDetails: undefined;

  // Onboarding screens
  Disclaimer: undefined;

  // Dev screens
  CreateMock: undefined;
  MockDataDeepLink: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Create a ref that we can use to access the navigation state
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

declare global {
  namespace ReactNavigation {
    // Allow React Navigation helpers to infer route params from our stack
    // Use interface merging to avoid duplicate identifier errors
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

const Navigation = createStaticNavigation(AppNavigation);

const NavigationWithTracking = () => {
  useRecoveryPrompts();
  const selfClient = useSelfClient();
  const trackScreen = () => {
    const currentRoute = navigationRef.getCurrentRoute();
    if (currentRoute) {
      if (__DEV__) console.log(`Screen View: ${currentRoute.name}`);
      trackScreenView(`${currentRoute.name}`, {
        screenName: currentRoute.name,
      });
    }
  };

  // Setup universal link handling at the navigation level
  useEffect(() => {
    const cleanup = setupUniversalLinkListenerInNavigation(selfClient);

    return () => {
      cleanup();
    };
  }, [selfClient]);

  return (
    <GestureHandlerRootView>
      <Navigation ref={navigationRef} onStateChange={trackScreen} />
    </GestureHandlerRootView>
  );
};

export default NavigationWithTracking;
