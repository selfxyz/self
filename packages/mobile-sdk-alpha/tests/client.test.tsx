import { describe, expect, it } from 'vitest';

import { createSelfClient } from '../src/index';
import { expectedMRZResult, mockAdapters, sampleMRZ } from './utils/testHelpers';

describe('createSelfClient API', () => {
  it('creates a client instance with expected methods', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters });

    expect(typeof client.extractMRZInfo).toBe('function');
    expect(typeof client.registerDocument).toBe('function');
    expect(typeof client.validateDocument).toBe('function');
  });

  it('parses MRZ data correctly', () => {
    const client = createSelfClient({ config: {}, adapters: mockAdapters });
    const info = client.extractMRZInfo(sampleMRZ);

    expect(info.passportNumber).toBe(expectedMRZResult.passportNumber);
    expect(info.validation.overall).toBe(expectedMRZResult.validation.overall);
  });

  it('accepts different adapter configurations', () => {
    const clientWithAllAdapters = createSelfClient({
      config: {},
      adapters: mockAdapters,
    });

    expect(clientWithAllAdapters).toBeDefined();
    expect(typeof clientWithAllAdapters.extractMRZInfo).toBe('function');
  });
});
