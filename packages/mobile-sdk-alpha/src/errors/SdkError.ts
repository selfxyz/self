interface ErrorOptions {
  cause?: unknown;
}

export type SdkErrorCategory =
  | 'scanner'
  | 'network'
  | 'protocol'
  | 'proof'
  | 'crypto'
  | 'validation'
  | 'config'
  | 'init'
  | 'liveness';

/**
 * Base class for all SDK errors.
 */
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
