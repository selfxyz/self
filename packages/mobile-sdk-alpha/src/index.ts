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

export type { DG1, DG2, ParsedNFCResponse } from './processing/nfc';

export type { PassportValidationError, PassportValidationOptions } from './validation/document';
// Core functions
export type { SdkErrorCategory } from './errors';
export { SCANNER_ERROR_CODES, notImplemented, sdkError } from './errors';
export { createSelfClient } from './client';
export { defaultConfig } from './config/defaults';
export { extractMRZInfo, formatDateToYYMMDD } from './processing/mrz';
export { isPassportDataValid } from './validation/document';
export { parseNFCResponse } from './processing/nfc';
// Error handling
export { webScannerShim } from './adapters/web/shims';
