// Browser-safe exports with explicit tree-shaking friendly imports

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

// Core functions
export type { SdkErrorCategory } from './errors';
export { type DG1, type DG2, type NFCScanOptions, type ParsedNFCResponse, parseNFCResponse, scanNFC } from './nfc';
export { type MRZScanOptions, extractMRZInfo, formatDateToYYMMDD, scanMRZ } from './mrz';
export { type QRProofOptions, scanQRProof } from './qr';
export { SCANNER_ERROR_CODES, notImplemented, sdkError } from './errors';

export { createSelfClient } from './client';
export { defaultConfig } from './config/defaults';
export { mergeConfig } from './config/merge';
// Error handling
export { webScannerShim } from './adapters/web/shims';
