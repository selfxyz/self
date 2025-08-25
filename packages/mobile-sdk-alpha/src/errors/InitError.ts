// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { SdkError } from './SdkError';

/**
 * Error thrown when the SDK fails to initialize correctly.
 *
 * @param message - description of the initialization failure.
 * @param options - optional underlying error details.
 */
export class InitError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_INIT', 'init', false, options);
    this.name = 'InitError';
  }
}
