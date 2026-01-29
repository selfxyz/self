// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import countryDocumentTypesData from '../../src/data/country-document-types.json';

describe('Country data synchronization', () => {
  it('bundled data should match API response', async () => {
    // Fetch current data from staging API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch('https://api.staging.self.xyz/id-picker', {
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('API request timed out after 5 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    expect(response.ok).toBe(true);

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
