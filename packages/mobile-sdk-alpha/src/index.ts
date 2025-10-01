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
  NetworkAdapter,
  Progress,
  ScanMode,
  ScanOpts,
  ScanResult,
  ScannerAdapter,
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
export type { DG1, DG2, NFCScanOptions, ParsedNFCResponse } from './nfc';

export type { DocumentData, DocumentMetadata, PassportCameraProps, ScreenProps } from './types/ui';

export type { MRZScanOptions } from './mrz';

// QR module
export type { PassportValidationCallbacks } from './validation/document';

export type { QRProofOptions } from './qr';

// Error handling
export type { SdkErrorCategory } from './errors';

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

// Screen Components (React Native-based)
export { NFCScannerScreen } from './components/screens/NFCScannerScreen';
export { PassportCameraScreen } from './components/screens/PassportCameraScreen';
export { QRCodeScreen } from './components/screens/QRCodeScreen';

// Context and Client
export { SdkEvents } from './types/events';

// Components
export { SelfClientContext, SelfClientProvider, usePrepareDocumentProof, useSelfClient } from './context';

// Documents utils
export { SelfMobileSdk } from './entry';

export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
} from './documents/utils';

export { createListenersMap, createSelfClient } from './client';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { defaultConfig } from './config/defaults';

export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD, scanMRZ } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

// Core functions
export { isPassportDataValid } from './validation/document';

// Document validation
export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/scanner';

export { scanQRProof } from './qr';

export { webScannerShim } from './adapters/web/shims';
