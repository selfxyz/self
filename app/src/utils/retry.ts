// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { AppLogger } from '@/services/logging';

/**
 * Retries a promise-based operation with linear backoff
 * @param promiseBuilder Function that returns the promise to retry
 * @param retries Maximum number of retry attempts (default: 10)
 * @param delayMultiplier Backoff multiplier in ms (default: 200)
 * @returns The result of the successful promise
 * @throws The last error encountered after exhausting all retries
 */
export async function withRetries<T>(
  promiseBuilder: () => Promise<T>,
  retries = 10,
  delayMultiplier = 200,
): Promise<T> {
  let latestError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await promiseBuilder();
    } catch (e) {
      latestError = e as Error;
      if (i < retries - 1) {
        AppLogger.info('retry #', i);
        await new Promise(resolve => setTimeout(resolve, delayMultiplier * i));
      }
    }
  }
  throw new Error(
    `retry count exhausted (${retries})${
      latestError ? `, original error: ${latestError}` : ''
    }`,
  );
}
