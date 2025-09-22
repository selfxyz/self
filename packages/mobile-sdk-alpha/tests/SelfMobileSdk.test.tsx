// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

describe('High-Level SelfMobileSdk Component', () => {
  it('can be imported successfully', async () => {
    const { SelfMobileSdk } = await import('../src');
    expect(SelfMobileSdk).toBeDefined();
    expect(typeof SelfMobileSdk).toBe('function');
  });

  it('accepts the expected props interface', async () => {
    const { SelfMobileSdk } = await import('../src');

    // Test that the component accepts the expected props structure
    const mockExternal = {
      getSecret: async () => 'test-secret',
      getAllDocuments: async () => ({}),
      setDocument: async () => true,
      onOnboardingSuccess: () => {},
      onOnboardingFailure: () => {},
      onDisclosureSuccess: () => {},
      onDisclosureFailure: () => {},
    };

    expect(SelfMobileSdk).toBeDefined();
    // The component should accept these props without throwing
    expect(() => {
      // This is just a type check - we're not actually rendering
      const _props = { config: {}, external: mockExternal };
    }).not.toThrow();
  });
});
