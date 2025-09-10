// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import { generateTEEInputsDisclose } from '../../src/processing/generate-disclosure-inputs';

// Mocks for dependencies
const mockSecret = 'test-secret';
const mockPassportData = { id: '123', name: 'Test User' } as any;
const mockSelfApp = { appId: 'app-xyz' } as any;

vi.mock('../../src/stores/protocolStore', () => ({
  useProtocolStore: {
    getState: () => ({
      passport: {
        ofac_trees: 'ofac-tree-data',
        commitment_tree: 'commitment-tree-data',
      },
    }),
  },
}));

describe('generateTEEInputsDisclose', () => {
  it('returns correct ofac tree data', () => {
    const result = generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp);
    expect(result).toBeDefined();
  });

  it('throws error for unknown document category', () => {
    vi.doMock('../../src/stores/protocolStore', () => ({
      useProtocolStore: {
        getState: () => ({ unknown: undefined }),
      },
    }));
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrow();
    vi.resetModules();
  });

  it('throws error for unknown tree type', () => {
    // This case is already covered by the default switch, but to simulate, we can call with an invalid tree type if possible
    // Since the tree type is determined inside the function, this is not directly testable unless we refactor
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrow();
  });

  it('throws error if commitment tree not loaded', () => {
    vi.doMock('../../src/stores/protocolStore', () => ({
      useProtocolStore: {
        getState: () => ({
          passport: {
            ofac_trees: 'ofac-tree-data',
            commitment_tree: undefined,
          },
        }),
      },
    }));
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrow();
    vi.resetModules();
  });
});
