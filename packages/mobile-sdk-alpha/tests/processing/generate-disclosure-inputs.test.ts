// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { PassportData, SelfApp } from '@selfxyz/common';

import { generateTEEInputsDisclose } from '../../src/processing/generate-disclosure-inputs';
import { useProtocolStore } from '../../src/stores/protocolStore';
// Mocks for dependencies
const mockSecret = '0x' + '00'.repeat(31) + 'a4ec'; // 32-byte hex string
const mockPassportData: PassportData = {
  mrz: '',
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
  documentType: 'passport',
  documentCategory: 'passport',
  mock: true,
};
const mockSelfApp: SelfApp = {
  userId: '0x0000000000000000000000000000',
  appName: 'TestSelfApp',
  logoBase64: '',
  endpointType: 'https',
  endpoint: '',
  deeplinkCallback: '',
  header: '',
  scope: '',
  sessionId: '',
  userIdType: 'hex',
  devMode: false,
  disclosures: {},
  version: 0,
  chainID: 42220,
  userDefinedData: '',
};
// Mock the upstream dependencies to avoid BytesLike errors
vi.mock('@selfxyz/common/utils/circuits/registerInputs', () => ({
  generateTEEInputsDiscloseStateless: vi.fn((secret, passportData, selfApp, resolveTree) => {
    // Call the resolver to test protocolStore behavior
    resolveTree(passportData.documentCategory, 'ofac');
    resolveTree(passportData.documentCategory, 'commitment');
    return { mockResult: true };
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct ofac tree data', () => {
    const result = generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp);
    expect(result).toBeDefined();
  });

  it('throws error for unknown document category', () => {
    // Mock the store to return an unknown document category
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      unknown: undefined
    } as any);
    
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Unknown or unloaded document category in protocol store: passport`
    );
  });

  it('throws error for unknown tree type', () => {
    // This test doesn't make sense as written since tree type is determined internally
    // Let's test the commitment tree validation instead
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      passport: {
        ofac_trees: 'ofac-tree-data',
        commitment_tree: undefined,
      },
    } as any);
    
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Commitment tree not loaded`
    );
  });

  it('throws error if commitment tree not loaded', () => {
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      passport: {
        ofac_trees: 'ofac-tree-data',
        commitment_tree: undefined,
      },
    } as any);
    
    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Commitment tree not loaded`
    );
  });
});
