// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common/utils/types';

import type { ModalNavigationParams } from '@/screens/app/ModalScreen';
import type { WebViewScreenParams } from '@/screens/shared/WebViewScreen';
import type { ProofHistory } from '@/stores/proofTypes';

// =============================================================================
// Aadhaar Screens
// =============================================================================

export type AadhaarRoutesParamList = {
  AadhaarUpload: {
    countryCode: string;
  };
  AadhaarUploadSuccess: undefined;
  AadhaarUploadError: {
    errorType: string;
  };
};

// =============================================================================
// Account/Recovery Screens
// =============================================================================

export type AccountRoutesParamList = {
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
};

// =============================================================================
// App Screens
// =============================================================================

export type AppRoutesParamList = {
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
};

// =============================================================================
// Dev Screens
// =============================================================================

export type DevRoutesParamList = {
  CreateMock: undefined;
  MockDataDeepLink: undefined;
  DevCardShowcase: undefined;
};

// =============================================================================
// Document Screens
// =============================================================================

export type DocumentRoutesParamList = {
  IDPicker: {
    countryCode: string;
    documentTypes: string[];
  };
  LogoConfirmation: {
    documentType: string;
    countryCode: string;
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
  IdDetails: undefined;
};

// =============================================================================
// Combined Types
// =============================================================================
/**
 * All route param types that need to be explicitly defined (not inferred from initialParams).
 * This is used to compose RootStackParamList in index.tsx.
 */
export type ExplicitRouteParams = AadhaarRoutesParamList &
  AccountRoutesParamList &
  AppRoutesParamList &
  DevRoutesParamList &
  DocumentRoutesParamList &
  HomeRoutesParamList &
  OnboardingRoutesParamList &
  RegistrationRoutesParamList &
  SharedRoutesParamList &
  VerificationRoutesParamList;

// =============================================================================
// Home Screens
// =============================================================================
export type HomeRoutesParamList = {
  Home: {
    testReferralFlow?: boolean;
  };
  Points: undefined;
  PointsInfo:
    | {
        showNextButton?: boolean;
        callbackId?: number;
      }
    | undefined;
};

/**
 * Keys that need to be omitted from BaseRootStackParamList before merging with ExplicitRouteParams.
 * These are routes whose params are explicitly defined rather than inferred.
 */
export type OmittedRouteKeys = keyof ExplicitRouteParams;

// =============================================================================
// Onboarding Screens
// =============================================================================
export type OnboardingRoutesParamList = {
  Disclaimer: undefined;
  KycSuccess:
    | {
        userId?: string;
      }
    | undefined;
  KYCVerified:
    | {
        status?: string;
        userId?: string;
        documentId?: string;
      }
    | undefined;
  KycFailure: {
    countryCode?: string;
    canRetry?: boolean;
  };
  KycConnectionError: {
    countryCode?: string;
  };
};

// =============================================================================
// Registration Fallback Screens
// =============================================================================
export type RegistrationRoutesParamList = {
  RegistrationFallbackMRZ: {
    countryCode: string;
  };
  RegistrationFallbackNFC: {
    countryCode: string;
  };
};

// =============================================================================
// Shared Screens
// =============================================================================
export type SharedRoutesParamList = {
  ComingSoon: {
    countryCode?: string;
    documentCategory?: string;
  };
  WebView: WebViewScreenParams;
};

// =============================================================================
// Verification/Proof Screens
// =============================================================================
export type VerificationRoutesParamList = {
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
};
