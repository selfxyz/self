// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Types
export type {
  Adapters,
  ClockAdapter,
  Config,
  CryptoAdapter,
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
  SDKEvent,
  SDKEventMap,
  ScanMode,
  ScanOpts,
  ScanResult,
  ScannerAdapter,
  SelfClient,
  StorageAdapter,
  Unsubscribe,
  ValidationInput,
  ValidationResult,
  WsAdapter,
  WsConn,
} from './types/public';

// MRZ module
export type { DG1, DG2, NFCScanOptions, ParsedNFCResponse } from './nfc';

export type { DocumentData, DocumentMetadata, ExternalAdapter, PassportCameraProps, ScreenProps } from './types/ui';

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

// Flow Components
export { OnboardingFlow } from './components/flows/OnboardingFlow';

// Screen Components
export { PassportCameraScreen } from './components/screens/PassportCameraScreen';

export { QRCodeScreen } from './components/screens/QRCodeScreen';

// Context and Client
export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

// Components
export { SelfMobileSdk } from './entry';

export { createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo } from './mrz';

export { formatDateToYYMMDD, scanMRZ } from './mrz';

// Core functions
export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

// Document validation
export { parseNFCResponse, scanNFC } from './nfc';

export { scanQRProof } from './qr';

// Hooks
export { useDocumentManager } from './hooks/useDocumentManager';
// Error handling
export { webScannerShim } from './adapters/web/shims';
