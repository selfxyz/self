// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
