// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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
  SelfClient,
  StorageAdapter,
  TrackEventParams,
  Unsubscribe,
  WsAdapter,
  WsConn,
} from './types/public';

export type { BaseContext, NFCScanContext, ProofContext } from './proving/internal/logging';

export type { DG1, DG2, ParsedNFCResponse } from './nfc';

export type { DocumentAttributes } from './documents/validation';

export type { DocumentData, DocumentMetadata, PassportCameraProps, ScreenProps } from './types/ui';

export type { HapticOptions, HapticType } from './haptic/shared';

export type { MRZScanOptions } from './mrz';

export type { PassportValidationCallbacks } from './validation/document';

export type { SDKEvent, SDKEventMap } from './types/events';

export type { SdkErrorCategory } from './errors';

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

export { QRCodeScreen } from './components/screens/QRCodeScreen';

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

export { createListenersMap, createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

export { defaultOptions } from './haptic/shared';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo } from './mrz';
export { extractNameFromDocument } from './documents/utils';
export { extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/nfc-scanner';
export { sanitizeErrorMessage } from './utils/utils';
export { useCountries } from './documents/useCountries';

export { webNFCScannerShim } from './adapters/web/shims';
