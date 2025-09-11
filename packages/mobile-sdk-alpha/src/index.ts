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
  ProofHandle,
  ProofRequest,
  RegistrationInput,
  RegistrationStatus,
  ScanMode,
  ScanOpts,
  ScanResult,
  ScannerAdapter,
  SelfClient,
  StorageAdapter,
  TrackEventParams,
  Unsubscribe,
  ValidationInput,
  ValidationResult,
  WsAdapter,
  WsConn,
} from './types/public';

// MRZ module
export type { DG1, DG2, NFCScanOptions, ParsedNFCResponse } from './nfc';

export type { DocumentData, DocumentMetadata, PassportCameraProps, ScreenProps } from './types/ui';

export type { MRZScanOptions } from './mrz';

// QR module
export type { PassportValidationCallbacks } from './validation/document';

export type { QRProofOptions } from './qr';
// Error handling
export type { SdkErrorCategory } from './errors';

// UI Types
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

// Screen Components
export { PassportCameraScreen } from './components/screens/PassportCameraScreen';

export { QRCodeScannerView } from './components/QRCodeScannerView';

export { QRCodeScreen } from './components/screens/QRCodeScreen';

export { SdkEvents } from './types/events';

// Context and Client
export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

// Components
export { SelfMobileSdk } from './entry';

export { createListenersMap, createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo } from './mrz';

export { formatDateToYYMMDD, scanMRZ } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

// Documents utils
export { getAllDocuments, hasAnyValidRegisteredDocument, loadSelectedDocument } from './documents/utils';

// Core functions
export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

// Document validation
export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/scanner';

export { scanQRProof } from './qr';

export { useProtocolStore } from './stores/protocolStore';

// Error handling
export { webScannerShim } from './adapters/web/shims';
