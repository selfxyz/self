// Add ErrorOptions interface for TypeScript compatibility
interface ErrorOptions {
  cause?: unknown;
}

export type SdkErrorCategory = 'scanner' | 'network' | 'protocol' | 'proof' | 'crypto' | 'validation' | 'config';

export const SCANNER_ERROR_CODES = {
  UNAVAILABLE: 'SELF_ERR_SCANNER_UNAVAILABLE',
  NFC_NOT_SUPPORTED: 'SELF_ERR_NFC_NOT_SUPPORTED',
  INVALID_MODE: 'SELF_ERR_SCANNER_MODE',
} as const;

export class SdkError extends Error {
  readonly code: string;
  readonly category: SdkErrorCategory;
  readonly retryable: boolean;
  declare cause?: Error;

  constructor(message: string, code: string, category: SdkErrorCategory, retryable = false, options?: ErrorOptions) {
    super(message);
    this.name = 'SdkError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    if (options?.cause) {
      this.cause = options.cause as Error;
    }
  }
}

export function notImplemented(name: string) {
  return new SdkError(`${name} adapter not provided`, 'SELF_ERR_ADAPTER_MISSING', 'config', false);
}

export function sdkError(message: string, code: string, category: SdkErrorCategory, retryable = false) {
  return new SdkError(message, code, category, retryable);
}
