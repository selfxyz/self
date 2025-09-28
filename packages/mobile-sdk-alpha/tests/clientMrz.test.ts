// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { createSelfClient, MrzParseError } from '../src/index';
import { badCheckDigitsMRZ, expectedMRZResult, invalidMRZ, mockAdapters, sampleMRZ } from './utils/testHelpers';

describe('createSelfClient API', () => {
  it('creates a client instance with expected methods', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters, listeners: new Map() });

    expect(typeof client.extractMRZInfo).toBe('function');
  });

  it('parses MRZ data correctly', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters, listeners: new Map() });
    const info = client.extractMRZInfo(sampleMRZ);

    expect(info.documentNumber).toBe(expectedMRZResult.documentNumber);
    expect(info.validation?.overall).toBe(expectedMRZResult.validation.overall);
  });

  it('accepts different adapter configurations', () => {
    const clientWithAllAdapters = createSelfClient({
      config: {},
      adapters: mockAdapters,
      listeners: new Map(),
    });

    expect(clientWithAllAdapters).toBeDefined();
    expect(typeof clientWithAllAdapters.extractMRZInfo).toBe('function');
  });

  it('throws MrzParseError for malformed MRZ input', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters, listeners: new Map() });
    expect(() => client.extractMRZInfo(invalidMRZ)).toThrowError(MrzParseError);
  });

  it('flags invalid check digits', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters, listeners: new Map() });
    const info = client.extractMRZInfo(badCheckDigitsMRZ);
    expect(info.validation?.overall).toBe(false);
  });
});
