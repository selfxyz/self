export { InitError } from './InitError';

export { LivenessError } from './LivenessError';
export { MrzParseError } from './MrzParseError';
export { NfcParseError } from './NfcParseError';
export const SCANNER_ERROR_CODES = {
  UNAVAILABLE: 'SELF_ERR_SCANNER_UNAVAILABLE',
  NFC_NOT_SUPPORTED: 'SELF_ERR_NFC_NOT_SUPPORTED',
  INVALID_MODE: 'SELF_ERR_SCANNER_MODE',
} as const;

export { SdkError, type SdkErrorCategory, notImplemented, sdkError } from './SdkError';
