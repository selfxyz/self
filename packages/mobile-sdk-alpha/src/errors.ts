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

  constructor(
    message: string,
    code: string,
    category: SdkErrorCategory,
    retryable = false,
    options?: { cause?: Error },
  ) {
    super(message);
    this.name = 'SdkError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;

    // Handle cause if provided (for older TypeScript versions)
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }
}

export function notImplemented(name: string) {
  return new SdkError(`${name} adapter not provided`, 'SELF_ERR_ADAPTER_MISSING', 'config', false);
}

export function sdkError(message: string, code: string, category: SdkErrorCategory, retryable = false) {
  return new SdkError(message, code, category, retryable);
}
