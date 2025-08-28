// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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

/**
 * Helper to create an SDK error for an adapter that has not been provided.
 *
 * @param name - human-readable adapter name.
 * @returns configured {@link SdkError} instance.
 */
export function notImplemented(name: string) {
  return new SdkError(`${name} adapter not provided`, 'SELF_ERR_ADAPTER_MISSING', 'config', false);
}

/**
 * Convenience factory for {@link SdkError}.
 *
 * @param message - error description.
 * @param code - unique error code.
 * @param category - high level error category.
 * @param retryable - whether the operation may be retried.
 * @returns configured {@link SdkError} instance.
 */
export function sdkError(message: string, code: string, category: SdkErrorCategory, retryable = false) {
  return new SdkError(message, code, category, retryable);
}
