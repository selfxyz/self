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

export type { MRZScanOptions } from './mrz';

// QR module
export type { PassportValidationCallbacks } from './validation/document';

export type { SDKEvent, SDKEventMap } from './types/events';

// Error handling
export type { SdkErrorCategory } from './errors';

// Screen Components (React Native-based)
export type { provingMachineCircuitType } from './proving/provingMachine';
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
export { PassportCameraScreen } from './components/screens/PassportCameraScreen';

// Context and Client
export { type ProvingStateType } from './proving/provingMachine';

export { QRCodeScreen } from './components/screens/QRCodeScreen';
// Components
export { SdkEvents } from './types/events';
// Documents utils
export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
} from './documents/utils';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { createListenersMap, createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

// Document utils
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { extractNameFromDocument } from './documents/utils';

// Core functions
export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

// Document validation
export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/nfc-scanner';

export { useCountries } from './documents/useCountries';

export { webNFCScannerShim } from './adapters/web/shims';
