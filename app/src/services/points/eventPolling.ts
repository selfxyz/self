// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { checkEventProcessingStatus } from '@/services/points/jobStatus';

/**
 * Polls the server to check if an event has been processed.
 * Checks at: 2s, 4s, 8s, 16s, 32s, 32s, 32s, 32s
 * Returns 'completed' if completed, 'failed' if failed, or null if max attempts reached
 */
export async function pollEventProcessingStatus(
  id: string,
): Promise<'completed' | 'failed' | null> {
  let delay = 2000; // Start at 2 seconds
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await sleep(delay);

    try {
      const status = await checkEventProcessingStatus(id);
      if (status === 'completed') {
        return 'completed';
      }
      if (status === 'failed') {
        return 'failed';
      }
      // If status is 'pending' or null, continue polling
    } catch (error) {
      console.error(`Error checking event ${id} status:`, error);
      // Continue polling even on error
    }

    // Exponential backoff, max 32 seconds
    delay = Math.min(delay * 2, 32000);
  }

  return null; // Gave up after max attempts
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
