// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Types
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
  NetworkAdapter,
  Progress,
  SelfClient,
  StorageAdapter,
  TrackEventParams,
  Unsubscribe,
  WsAdapter,
  WsConn,
} from './types/public';

// LogEvent Types
export type { BaseContext, NFCScanContext, ProofContext } from './proving/internal/logging';

// MRZ module
export type { DG1, DG2, ParsedNFCResponse } from './nfc';

export type { DocumentData, DocumentMetadata, PassportCameraProps, ScreenProps } from './types/ui';

export type { HapticOptions, HapticType } from './haptic/shared';

export type { MRZScanOptions } from './mrz';

// QR module
export type { PassportValidationCallbacks } from './validation/document';

export type { SDKEvent, SDKEventMap } from './types/events';

// Error handling
export type { SdkErrorCategory } from './errors';
// Screen Components (React Native-based)
export type { provingMachineCircuitType } from './proving/provingMachine';

export {
  type BottomSectionProps,
  ExpandableBottomLayout,
  type FullSectionProps,
  type LayoutProps,
  type TopSectionProps,
} from './layouts/ExpandableBottomLayout';

export { DelayedLottieView } from './components/DelayedLottieView';

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

export { NFCScannerScreen } from './components/screens/NFCScannerScreen';

export { type ProvingStateType } from './proving/provingMachine';
// Components
export { QRCodeScreen } from './components/screens/QRCodeScreen';
// Documents utils
export { SdkEvents } from './types/events';

export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

// Haptic feedback utilities
export { advercase, dinot, plexMono } from './constants/fonts';

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

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
} from './documents/utils';

export { createListenersMap, createSelfClient } from './client';

// Document utils
export { defaultConfig } from './config/defaults';

export { defaultOptions } from './haptic/shared';

export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

// Core functions
export { extractNameFromDocument } from './documents/utils';

// Document validation
export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/nfc-scanner';
export { sanitizeErrorMessage } from './utils/utils';
export { useCountries } from './documents/useCountries';

export { webNFCScannerShim } from './adapters/web/shims';
