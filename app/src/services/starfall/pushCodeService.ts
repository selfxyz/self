// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { POINTS_API_BASE_URL } from '@/services/points/constants';

/**
 * Fetches a one-time push code for the specified wallet address.
 * The code has a TTL of 30 minutes and refreshes with each call.
 *
 * @param walletAddress - The wallet address to generate a push code for
 * @returns The 4-digit push code as a string
 * @throws Error if the API request fails
 */
export async function fetchPushCode(walletAddress: string): Promise<string> {
  try {
    const response = await fetch(
      `${POINTS_API_BASE_URL}/push/wallet/${walletAddress}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

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
    console.error('Error fetching push code:', error);
    throw error;
  }
}
