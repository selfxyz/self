// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { POINTS_API_BASE_URL } from '@/services/points/constants';

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Fetches a one-time push code for the specified wallet address.
 * The code has a TTL of 30 minutes and refreshes with each call.
 *
 * @param walletAddress - The wallet address to generate a push code for
 * @returns The 4-digit push code as a string
 * @throws Error if the API request fails or times out
 */
export async function fetchPushCode(walletAddress: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${POINTS_API_BASE_URL}/push/wallet/${walletAddress}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      },
    );

    // Clear timeout on successful response
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch push code: ${response.status} ${response.statusText}`,
      );
    }

    const code = await response.json();

    // The API returns a JSON string like "5932"
    if (typeof code !== 'string' || code.length !== 4) {
      throw new Error('Invalid push code format received from API');
    }

    return code;
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Handle abort/timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Push code request timed out');
      throw new Error(
        'Request timed out. Please check your connection and try again.',
      );
    }

    console.error('Error fetching push code:', error);
    throw error;
  }
}
