// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type {
  Adapters,
  AnalyticsAdapter,
  AuthAdapter,
  ClockAdapter,
  Config,
  CryptoAdapter,
  DocumentsAdapter,
  HttpAdapter,
  LogLevel,
  LoggerAdapter,
  MRZInfo,
  MRZValidation,
  NFCScanResult,
  NFCScannerAdapter,
  NavigationAdapter,
  NetworkAdapter,
  Progress,
  RouteName,
  SdkInitialConfig,
  SelfClient,
  StorageAdapter,
  TrackEventParams,
  Unsubscribe,
  VerificationRequest,
  WsAdapter,
  WsConn,
} from './types/public';

export type { BaseContext, NFCScanContext, ProofContext } from './proving/internal/logging';

export type {
  BottomSectionProps,
  FullSectionProps,
  LayoutProps,
  TopSectionProps,
} from './layouts/ExpandableBottomLayout';

export type { CreateReactNativeAdaptersOptions } from './adapters/react-native/factory';

export type { DG1, DG2, ParsedNFCResponse } from './nfc';

export type { DocumentAttributes } from './documents/validation';

export type { DocumentData, DocumentMetadata, PassportCameraProps, ScreenProps } from './types/ui';

export type { HapticOptions, HapticType } from './haptic/shared';

export type { KnownEventName } from './constants/analytics';

export type { MRZScanOptions } from './mrz';

export type { OnboardingBranch, OnboardingFailureStage, OnboardingStage } from './analytics/onboardingFunnel';

export type { PassportValidationCallbacks } from './validation/document';
export type { Perk, PerkRailContent } from './flows/onboarding/perks';
export type { PerkId, PerkRecord } from './data/perks';

export type { ProvingStateType } from './proving/provingMachine';

export type { RecoveryValidationResult } from './proving/recoveryValidation';

export type { SDKEvent, SDKEventMap } from './types/events';
export type { SdkErrorCategory } from './errors';

export type { provingMachineCircuitType } from './proving/provingMachine';

export { DelayedLottieView } from './components/DelayedLottieView';
export { ExpandableBottomLayout } from './layouts/ExpandableBottomLayout';

export {
  GOOGLE_USAT_FAUCET_APP_NAME,
  GOOGLE_USAT_FAUCET_ENDPOINT,
  GOOGLE_USAT_FAUCET_SCOPE,
} from './constants/googleUsat';

export { GOOGLE_USAT_FAUCET_POLICY } from './constants/restrictedApps';

export {
  InitError,
  LivenessError,
  MrzParseError,
  NfcParseError,
  SCANNER_ERROR_CODES,
  SdkError,
  notImplemented,
  sdkError,
} from './errors';
export { default as LogoConfirmationScreen } from './flows/onboarding/logo-confirmation-screen';
export { NFCScannerScreen } from './components/screens/NFCScannerScreen';
export {
  PERKS,
  getEligiblePerksForIdType,
  getPerkRailContent,
  getPerkRailLabel,
  getPerksForIdType,
} from './flows/onboarding/perks';
export { QRCodeScreen } from './components/screens/QRCodeScreen';
export { PERKS as SHARED_PERKS, getPerkRecordsForIdType } from './data/perks';
export { SdkEvents } from './types/events';
export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

export { advercase, dinot, dinotBold, plexMono } from './constants/fonts';
export {
  buttonTap,
  cancelTap,
  confirmTap,
  feedbackProgress,
  feedbackSuccess,
  feedbackUnsuccessful,
  impactLight,
  impactMedium,
  loadingScreenProgress,
  notificationError,
  notificationSuccess,
  notificationWarning,
  selectionChange,
  triggerFeedback,
} from './haptic';

export {
  checkDocumentExpiration,
  getDocumentAttributes,
  isDocumentValidForProving,
  pickBestDocumentToSelect,
} from './documents/validation';

export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
} from './documents/utils';

export {
  completeOnboardingAttempt,
  failOnboardingAttempt,
  incrementAttemptRetryCount,
  recoverOnboardingAttempt,
  resolveOnboardingBranch,
  setOnboardingBranch,
  trackBranchEvent,
  trackOnboardingRetry,
  trackOnboardingStep,
} from './analytics/onboardingFunnel';

export { createAuthAdapter } from './adapters/react-native/auth';

export { createCryptoAdapter } from './adapters/react-native/crypto';

export { createDocumentsAdapter, createInMemoryDocumentsAdapter } from './adapters/react-native/documents';

export { createListenersMap, createSelfClient } from './client';

export { createNetworkAdapter } from './adapters/react-native/network';
export { createReactNativeAdapters } from './adapters/react-native/factory';
export { defaultConfig } from './config/defaults';

export { defaultOptions } from './haptic/shared';
/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo } from './mrz';

export { extractNameFromDocument } from './documents/utils';
export { extractNameFromMRZ, formatDateToYYMMDD, parseMRZBirthDate, parseMRZExpiryDate } from './mrz';

export { finalizeRecoveredDocumentRegistration, validateRecoverySecretForDocument } from './proving/recoveryValidation';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';
export { hasEligibleAlternativeDocumentForPolicy, isDocumentEligibleForPolicy } from './utils/restrictedApps';
export { isGoogleUsatProofRequest } from './utils/googleUsat';

export { isPassportDataValid } from './validation/document';
export { mergeConfig } from './config/merge';
export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/nfc-scanner';

export { sanitizeErrorMessage } from './utils/utils';

export { useCountries } from './documents/useCountries';
export { useMRZStore } from './stores/mrzStore';
export { webNFCScannerShim } from './adapters/web/shims';
