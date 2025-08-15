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

export type { MRZScanOptions } from './mrz';

// QR module
export type { PassportValidationCallbacks } from './validation/document';

export type { QRProofOptions } from './qr';
// NFC module
export type { SdkErrorCategory } from './errors';

export { SCANNER_ERROR_CODES, notImplemented, sdkError } from './errors';

export { createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

export { extractMRZInfo, formatDateToYYMMDD, scanMRZ } from './mrz';

// Core functions
export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

// Document validation
export { parseNFCResponse, scanNFC } from './nfc';

export { scanQRProof } from './qr';
// Error handling
export { webScannerShim } from './adapters/web/shims';
