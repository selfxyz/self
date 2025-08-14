// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
import type { PassportData } from '@selfxyz/common/types';
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

// Mock the analytics module to avoid side effects in tests
jest.mock('@/utils/analytics', () => ({
  __esModule: true,
  default: () => ({
    trackEvent: jest.fn(),
  }),
}));

// Mock the passport data provider to avoid database operations
jest.mock('@/providers/passportDataProvider', () => ({
  getAllDocuments: jest.fn(),
  loadDocumentCatalog: jest.fn(),
  loadPassportDataAndSecret: jest.fn(),
  loadSelectedDocument: jest.fn(),
  setSelectedDocument: jest.fn(),
  storePassportData: jest.fn(),
  updateDocumentRegistrationState: jest.fn(),
}));

// Mock the protocol store to avoid complex state management
jest.mock('@/stores/protocolStore', () => ({
  useProtocolStore: {
    getState: jest.fn(() => ({
      passport: {
        fetch_all: jest.fn(),
        deployed_circuits: {
          REGISTER: ['test_register'],
          REGISTER_ID: ['test_register_id'],
          DSC: ['test_dsc'],
          DSC_ID: ['test_dsc_id'],
        },
        commitment_tree: 'test_tree',
        alternative_csca: {},
      },
      id_card: {
        fetch_all: jest.fn(),
        deployed_circuits: {
          REGISTER: ['test_register'],
          REGISTER_ID: ['test_register_id'],
          DSC: ['test_dsc'],
          DSC_ID: ['test_dsc_id'],
        },
        commitment_tree: 'test_tree',
        alternative_csca: {},
      },
    })),
  },
}));

describe('validateDocument - Real mobile-sdk-alpha Integration (PII-safe)', () => {
  it('should use the real isPassportDataValid function with synthetic passport data', () => {
    // This test verifies that we're using the real function, not a mock
    expect(typeof isPassportDataValid).toBe('function');

    // The real function should be callable
    expect(typeof isPassportDataValid).toBe('function');

    // Test with realistic, synthetic passport data (NEVER real user data)
    const mockPassportData: PassportData = {
      documentCategory: 'passport',
      mock: true,
      mrz: 'P<UTOD23145890<1233<6831101169<9408125F2206304<<<<<6',
      dsc: 'mock_dsc_data',
      eContent: [1, 2, 3, 4],
      passportMetadata: {
        cscaFound: true,
        eContentHashFunction: 'sha256',
        dg1HashFunction: 'sha256',
        signedAttrHashFunction: 'sha256',
      },
      dsc_parsed: {
        authorityKeyIdentifier: 'test_key_id',
        subjectPublicKeyInfo: {
          algorithm: { algorithm: '1.2.840.113549.1.1.1' },
          subjectPublicKey: new Uint8Array([1, 2, 3, 4]),
        },
      },
      csca_parsed: {
        subjectPublicKeyInfo: {
          algorithm: { algorithm: '1.2.840.113549.1.1.1' },
          subjectPublicKey: new Uint8Array([1, 2, 3, 4]),
        },
      },
    };

    const callbacks = {
      onPassportDataNull: jest.fn(),
      onPassportMetadataNull: jest.fn(),
      onDg1HashFunctionNull: jest.fn(),
      onEContentHashFunctionNull: jest.fn(),
      onSignedAttrHashFunctionNull: jest.fn(),
      onDg1HashMismatch: jest.fn(),
      onUnsupportedHashAlgorithm: jest.fn(),
      onDg1HashMissing: jest.fn(),
    };

    // This should call the real function and not throw
    expect(() => {
      isPassportDataValid(mockPassportData, callbacks);
    }).not.toThrow();
  });

  it('should handle validation errors through callbacks', () => {
    const invalidPassportData = {
      documentCategory: 'passport',
      mock: true,
      // Missing required fields to trigger validation errors
    } as PassportData;

    const callbacks = {
      onPassportDataNull: jest.fn(),
      onPassportMetadataNull: jest.fn(),
      onDg1HashFunctionNull: jest.fn(),
      onEContentHashFunctionNull: jest.fn(),
      onSignedAttrHashFunctionNull: jest.fn(),
      onDg1HashMismatch: jest.fn(),
      onUnsupportedHashAlgorithm: jest.fn(),
      onDg1HashMissing: jest.fn(),
    };

    // This should call the real validation function and trigger callbacks
    const result = isPassportDataValid(invalidPassportData, callbacks);

    // The real function should return false for invalid data
    expect(result).toBe(false);

    // Some callbacks should have been called due to missing data
    expect(callbacks.onPassportMetadataNull).toHaveBeenCalled();
  });

  it('should import and use real mobile-sdk-alpha exports', () => {
    // Verify that we can import other exports from the real package (using synthetic data)
    const {
      createSelfClient,
      defaultConfig,
      extractMRZInfo,
    } = require('@selfxyz/mobile-sdk-alpha');

    expect(typeof createSelfClient).toBe('function');
    expect(typeof defaultConfig).toBe('object');
    expect(typeof extractMRZInfo).toBe('function');
  });
});
