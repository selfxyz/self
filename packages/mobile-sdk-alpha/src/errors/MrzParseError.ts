// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SdkError } from './SdkError';

/**
 * Error thrown when an MRZ string fails validation or parsing.
 *
 * @param message - description of the MRZ parsing failure.
 * @param options - optional underlying error details.
 */
export class MrzParseError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_MRZ_PARSE', 'validation', false, options);
    this.name = 'MrzParseError';
  }
}
