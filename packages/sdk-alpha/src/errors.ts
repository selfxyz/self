export type SdkErrorCategory = 'scanner' | 'network' | 'protocol' | 'proof' | 'crypto' | 'validation' | 'config';

export const SCANNER_ERROR_CODES = {
  UNAVAILABLE: 'SELF_ERR_SCANNER_UNAVAILABLE',
  NFC_NOT_SUPPORTED: 'SELF_ERR_NFC_NOT_SUPPORTED',
  INVALID_MODE: 'SELF_ERR_SCANNER_MODE',
} as const;

export function sdkError(message: string, code: string, category: SdkErrorCategory, retryable = false) {
  return Object.assign(new Error(message), { code, category, retryable });
}

export function notImplemented(name: string) {
  return sdkError(`${name} adapter not provided`, 'SELF_ERR_ADAPTER_MISSING', 'config', false);
}
