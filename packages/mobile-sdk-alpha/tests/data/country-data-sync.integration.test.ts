// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Integration test for country data synchronization.
 *
 * This test verifies that the bundled country-document-types.json matches
 * the staging API response. It gracefully skips when network is unavailable
 * to avoid CI flakiness from transient network issues.
 *
 * To run integration tests only: yarn test --grep="integration"
 * To skip integration tests: yarn test --grep="^(?!.*integration)"
 */

import { describe, expect, it } from 'vitest';

import countryDocumentTypesData from '../../src/data/country-document-types.json';

/**
 * Helper to check if an error is a network-related error that should cause
 * the test to skip rather than fail.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const networkErrorPatterns = [
    'ENOTFOUND', // DNS resolution failed
    'ECONNREFUSED', // Connection refused
    'ECONNRESET', // Connection reset
    'ETIMEDOUT', // Connection timed out
    'EAI_AGAIN', // DNS temporary failure
    'ENETUNREACH', // Network unreachable
    'EHOSTUNREACH', // Host unreachable
    'fetch failed', // Generic fetch failure
    'network', // Generic network error
    'AbortError', // Request aborted (timeout)
    'AbortSignal', // AbortSignal compatibility issue in test environments
  ];

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name;

  return networkErrorPatterns.some(
    pattern =>
      errorMessage.includes(pattern.toLowerCase()) ||
      errorName === pattern ||
      ('cause' in error &&
        error.cause instanceof Error &&
        error.cause.message.toLowerCase().includes(pattern.toLowerCase())),
  );
}

describe('Country data synchronization [integration]', () => {
  it('bundled data should match API response', async ({ skip }) => {
    // Fetch current data from staging API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch('https://api.staging.self.xyz/id-picker', {
        signal: controller.signal,
      });
    } catch (error) {
      // Network errors should skip the test, not fail it
      if (isNetworkError(error)) {
        skip();
        return;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Non-2xx responses that aren't network errors should also skip
    // (e.g., 503 Service Unavailable, 502 Bad Gateway)
    if (!response.ok) {
      if (response.status >= 500) {
        skip();
        return;
      }
      // 4xx errors are likely real issues, so we let them fail
      expect.fail(`API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    expect(result.status).toBe('success');

    const apiData = result.data;
    const bundledData = countryDocumentTypesData;

    // Compare the data structures
    expect(bundledData).toEqual(apiData);

    // If this test fails, it means the API has been updated with new countries
    // or document types that aren't in the bundled data yet.
    // To fix: Update src/data/country-document-types.json with the latest API data.
  }, 10000); // 10s Vitest timeout
});
