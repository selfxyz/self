// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common/types';
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

// Import functions to test AFTER mocks are set up
import {
  checkAndUpdateRegistrationStates,
  getAlternativeCSCA,
} from '@/utils/proving/validateDocument';

// Mock the analytics module to avoid side effects in tests
let mockTrackEvent: jest.Mock;
jest.mock('@/utils/analytics', () => {
  mockTrackEvent = jest.fn();
  return () => ({
    trackEvent: mockTrackEvent,
  });
});

// Mock the passport data provider to avoid database operations
const mockGetAllDocumentsDirectlyFromKeychain = jest.fn();
const mockLoadSelectedDocumentDirectlyFromKeychain = jest.fn();
const mockLoadPassportDataAndSecret = jest.fn();
const mockSetSelectedDocument = jest.fn();
const mockStorePassportData = jest.fn();
const mockUpdateDocumentRegistrationState = jest.fn();
const mockReStorePassportDataWithRightCSCA = jest.fn();

jest.mock('@/providers/passportDataProvider', () => ({
  getAllDocuments: jest.fn(),
  getAllDocumentsDirectlyFromKeychain: jest.fn((...args: unknown[]) =>
    mockGetAllDocumentsDirectlyFromKeychain(...args),
  ),
  loadDocumentCatalog: jest.fn(),
  loadPassportDataAndSecret: jest.fn((...args: unknown[]) =>
    mockLoadPassportDataAndSecret(...args),
  ),
  loadSelectedDocument: jest.fn(),
  loadSelectedDocumentDirectlyFromKeychain: jest.fn((...args: unknown[]) =>
    mockLoadSelectedDocumentDirectlyFromKeychain(...args),
  ),
  setSelectedDocument: jest.fn((...args: unknown[]) =>
    mockSetSelectedDocument(...args),
  ),
  storePassportData: jest.fn((...args: unknown[]) =>
    mockStorePassportData(...args),
  ),
  updateDocumentRegistrationState: jest.fn((...args: unknown[]) =>
    mockUpdateDocumentRegistrationState(...args),
  ),
  reStorePassportDataWithRightCSCA: jest.fn((...args: unknown[]) =>
    mockReStorePassportDataWithRightCSCA(...args),
  ),
}));

// Mock the protocol store to avoid complex state management
const mockGetState = jest.fn(() => ({
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
  aadhaar: {
    public_keys: [],
    commitment_tree: 'test_tree',
  },
}));

const mockFetchAllTreesAndCircuits = jest.fn();
const mockGetCommitmentTree = jest.fn();

jest.mock('@selfxyz/mobile-sdk-alpha/stores', () => ({
  useProtocolStore: {
    getState: jest.fn((...args: unknown[]) => mockGetState(...args)),
  },
  fetchAllTreesAndCircuits: jest.fn((...args: unknown[]) =>
    mockFetchAllTreesAndCircuits(...args),
  ),
  getCommitmentTree: jest.fn((...args: unknown[]) =>
    mockGetCommitmentTree(...args),
  ),
}));

// Mock the validation utilities
const mockIsUserRegisteredWithAlternativeCSCA = jest.fn();
jest.mock('@selfxyz/common/utils/passports/validate', () => ({
  isUserRegisteredWithAlternativeCSCA: jest.fn((...args: unknown[]) =>
    mockIsUserRegisteredWithAlternativeCSCA(...args),
  ),
}));

/**
 * Creates a Self SDK client with minimal mock adapters for tests.
 */
function createTestClient() {
  const { createSelfClient } = require('@selfxyz/mobile-sdk-alpha');
  return createSelfClient({
    config: {},
    adapters: {
      auth: { getPrivateKey: jest.fn() },
      scanner: { scan: jest.fn() },
      network: {
        http: { fetch: jest.fn() },
        ws: {
          connect: jest.fn(() => ({
            send: jest.fn(),
            close: jest.fn(),
            onMessage: jest.fn(),
            onError: jest.fn(),
            onClose: jest.fn(),
          })),
        },
      },
      crypto: {
        hash: jest.fn(),
        sign: jest.fn(),
      },
      documents: {
        loadDocumentCatalog: jest.fn(),
        loadDocumentById: jest.fn(),
      },
    },
  });
}

/** Sample ICAO-compliant MRZ string for parsing tests. */
const validMrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;

/** Intentionally malformed MRZ string to exercise error handling. */
const invalidMrz = 'NOT_A_VALID_MRZ';

describe('validateDocument - Real mobile-sdk-alpha Integration (PII-safe)', () => {
  it('should use the real isPassportDataValid function with synthetic passport data', () => {
    // This test verifies that we're using the real function, not a mock
    expect(typeof isPassportDataValid).toBe('function');

    // The real function should be callable
    expect(typeof isPassportDataValid).toBe('function');

    // Test with realistic, synthetic passport data (NEVER real user data)
    const mockPassportData = {
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
      },
      csca_parsed: {},
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

  it('should expose extractMRZInfo via a self client instance', () => {
    const client = createTestClient();
    expect(typeof client.extractMRZInfo).toBe('function');
  });

  it('parses a valid MRZ string', () => {
    const client = createTestClient();
    const info = client.extractMRZInfo(validMrz);
    expect(info.documentNumber).toBe('L898902C3');
    expect(info.validation).toBeDefined();
    expect(info.validation?.overall).toBe(true);
  });

  it('throws on malformed MRZ input', () => {
    const client = createTestClient();
    expect(() => client.extractMRZInfo(invalidMrz)).toThrow();
  });
});

describe('getAlternativeCSCA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return public keys in Record format for Aadhaar with valid public keys', () => {
    const mockPublicKeys = ['key1', 'key2', 'key3'];
    mockGetState.mockReturnValue({
      passport: { alternative_csca: {} },
      id_card: { alternative_csca: {} },
      aadhaar: { public_keys: mockPublicKeys, commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'aadhaar',
    );

    expect(result).toEqual({
      public_key_0: 'key1',
      public_key_1: 'key2',
      public_key_2: 'key3',
    });
  });

  it('should return empty object for Aadhaar with no public keys', () => {
    mockGetState.mockReturnValue({
      passport: { alternative_csca: {} },
      id_card: { alternative_csca: {} },
      aadhaar: { public_keys: null, commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'aadhaar',
    );

    expect(result).toEqual({});
  });

  it('should return empty object for Aadhaar with empty public keys array', () => {
    mockGetState.mockReturnValue({
      passport: { alternative_csca: {} },
      id_card: { alternative_csca: {} },
      aadhaar: { public_keys: [], commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'aadhaar',
    );

    expect(result).toEqual({});
  });

  it('should return alternative_csca for passport', () => {
    const mockAlternativeCSCA = { csca1: 'cert1', csca2: 'cert2' };
    mockGetState.mockReturnValue({
      passport: { alternative_csca: mockAlternativeCSCA },
      id_card: { alternative_csca: {} },
      aadhaar: { public_keys: [], commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'passport',
    );

    expect(result).toEqual(mockAlternativeCSCA);
  });

  it('should return alternative_csca for id_card', () => {
    const mockAlternativeCSCA = { csca1: 'id_cert1', csca2: 'id_cert2' };
    mockGetState.mockReturnValue({
      passport: { alternative_csca: {} },
      id_card: { alternative_csca: mockAlternativeCSCA },
      aadhaar: { public_keys: [], commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'id_card',
    );

    expect(result).toEqual(mockAlternativeCSCA);
  });

  it('should return empty object for passport with no alternative_csca', () => {
    mockGetState.mockReturnValue({
      passport: { alternative_csca: {} },
      id_card: { alternative_csca: {} },
      aadhaar: { public_keys: [], commitment_tree: 'test_tree' },
    });

    const mockUseProtocolStore = { getState: mockGetState };
    const result = getAlternativeCSCA(
      mockUseProtocolStore as unknown,
      'passport',
    );

    expect(result).toEqual({});
  });
});

describe('checkAndUpdateRegistrationStates', () => {
  let mockSelfClient: unknown;
  const mockPassportData = {
    documentCategory: 'passport',
    documentType: 'passport',
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
    },
    csca_parsed: {},
  } as PassportData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      passport: { alternative_csca: { csca1: 'cert1' } },
      id_card: { alternative_csca: { csca1: 'cert1' } },
      aadhaar: { public_keys: ['key1', 'key2'] },
    });

    mockSelfClient = {
      useProtocolStore: { getState: mockGetState },
    };

    mockFetchAllTreesAndCircuits.mockResolvedValue(undefined);
    mockGetCommitmentTree.mockReturnValue('mock_tree');
  });

  it('should call reStorePassportDataWithRightCSCA when document is registered with alternative CSCA (passport)', async () => {
    const mockCSCA = { cert: 'alternative_csca_cert' };
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockPassportData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: true,
      csca: mockCSCA,
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockIsUserRegisteredWithAlternativeCSCA).toHaveBeenCalledWith(
      mockPassportData,
      'test_secret',
      expect.objectContaining({
        getCommitmentTree: expect.any(Function),
        getAltCSCA: expect.any(Function),
      }),
    );
    expect(mockReStorePassportDataWithRightCSCA).toHaveBeenCalledWith(
      mockPassportData,
      mockCSCA,
    );
    expect(mockUpdateDocumentRegistrationState).toHaveBeenCalledWith(
      'doc1',
      true,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Document Validated',
      expect.objectContaining({
        documentId: 'doc1',
        documentCategory: 'passport',
        mock: true,
      }),
    );
  });

  it('should NOT call reStorePassportDataWithRightCSCA when document is registered with public key (Aadhaar)', async () => {
    const mockAadhaarData = {
      ...mockPassportData,
      documentCategory: 'aadhaar' as const,
    };
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockAadhaarData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockAadhaarData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockAadhaarData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: true,
      csca: 'public_key_string', // Aadhaar returns a string
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockIsUserRegisteredWithAlternativeCSCA).toHaveBeenCalled();
    expect(mockReStorePassportDataWithRightCSCA).not.toHaveBeenCalled();
    expect(mockUpdateDocumentRegistrationState).toHaveBeenCalledWith(
      'doc1',
      true,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Document Validated',
      expect.objectContaining({
        documentId: 'doc1',
        documentCategory: 'aadhaar',
      }),
    );
  });

  it('should update registration state to false when document is not registered', async () => {
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockPassportData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockUpdateDocumentRegistrationState).toHaveBeenCalledWith(
      'doc1',
      false,
    );
    expect(mockReStorePassportDataWithRightCSCA).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'document_validated',
      expect.anything(),
    );
  });

  it('should skip invalid passport data and track validation failure', async () => {
    const invalidData = {
      documentCategory: 'passport',
      mock: true,
    } as PassportData;
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: invalidData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: invalidData,
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockIsUserRegisteredWithAlternativeCSCA).not.toHaveBeenCalled();
    expect(mockUpdateDocumentRegistrationState).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Validate Document Failed',
      expect.objectContaining({
        error: 'Passport data is not valid',
        documentId: 'doc1',
      }),
    );
  });

  it('should skip document with missing authority key identifier', async () => {
    const dataWithoutKeyId = {
      ...mockPassportData,
      dsc_parsed: {
        ...mockPassportData.dsc_parsed,
        authorityKeyIdentifier: undefined,
      },
    };
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: dataWithoutKeyId },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: dataWithoutKeyId,
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockFetchAllTreesAndCircuits).not.toHaveBeenCalled();
    expect(mockIsUserRegisteredWithAlternativeCSCA).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Validate Document Failed',
      expect.objectContaining({
        error: 'Authority key identifier is null',
        documentId: 'doc1',
      }),
    );
  });

  it('should handle multiple documents with mixed registration states', async () => {
    const doc1Data = { ...mockPassportData };
    const doc2Data = {
      ...mockPassportData,
      documentCategory: 'id_card' as const,
    };
    const doc3Data = { ...mockPassportData };

    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: doc1Data },
      doc2: { data: doc2Data },
      doc3: { data: doc3Data },
    });

    mockLoadSelectedDocumentDirectlyFromKeychain
      .mockResolvedValueOnce({ data: doc1Data })
      .mockResolvedValueOnce({ data: doc2Data })
      .mockResolvedValueOnce({ data: doc3Data });

    mockLoadPassportDataAndSecret
      .mockResolvedValueOnce(
        JSON.stringify({ data: doc1Data, secret: 'secret1' }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ data: doc2Data, secret: 'secret2' }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ data: doc3Data, secret: 'secret3' }),
      );

    mockIsUserRegisteredWithAlternativeCSCA
      .mockResolvedValueOnce({ isRegistered: true, csca: { cert: 'csca1' } })
      .mockResolvedValueOnce({ isRegistered: false, csca: null })
      .mockResolvedValueOnce({ isRegistered: true, csca: { cert: 'csca3' } });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockUpdateDocumentRegistrationState).toHaveBeenCalledTimes(3);
    expect(mockUpdateDocumentRegistrationState).toHaveBeenNthCalledWith(
      1,
      'doc1',
      true,
    );
    expect(mockUpdateDocumentRegistrationState).toHaveBeenNthCalledWith(
      2,
      'doc2',
      false,
    );
    expect(mockUpdateDocumentRegistrationState).toHaveBeenNthCalledWith(
      3,
      'doc3',
      true,
    );

    expect(mockReStorePassportDataWithRightCSCA).toHaveBeenCalledTimes(2);
  });

  it('should handle errors during registration check gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockPassportData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockRejectedValue(
      new Error('Network error'),
    );

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error checking registration state for document doc1',
      ),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Validate Document Failed',
      expect.objectContaining({
        error: 'Network error',
        documentId: 'doc1',
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it('should track analytics events correctly for registered documents', async () => {
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockPassportData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: true,
      csca: { cert: 'csca_cert' },
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'Document: Document Validated',
      {
        documentId: 'doc1',
        documentCategory: 'passport',
        mock: true,
      },
    );
  });

  it('should skip document when no passport data and secret is available', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(null);

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipping document doc1 - no passport data and secret',
      ),
    );
    expect(mockIsUserRegisteredWithAlternativeCSCA).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('should verify correct callbacks are passed to isUserRegisteredWithAlternativeCSCA', async () => {
    mockGetAllDocumentsDirectlyFromKeychain.mockResolvedValue({
      doc1: { data: mockPassportData },
    });
    mockLoadSelectedDocumentDirectlyFromKeychain.mockResolvedValue({
      data: mockPassportData,
    });
    mockLoadPassportDataAndSecret.mockResolvedValue(
      JSON.stringify({ data: mockPassportData, secret: 'test_secret' }),
    );
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    // Verify the callbacks object structure
    expect(mockIsUserRegisteredWithAlternativeCSCA).toHaveBeenCalledWith(
      expect.any(Object),
      'test_secret',
      expect.objectContaining({
        getCommitmentTree: expect.any(Function),
        getAltCSCA: expect.any(Function),
      }),
    );

    // Verify the callbacks work correctly
    const callArgs = mockIsUserRegisteredWithAlternativeCSCA.mock.calls[0];
    const callbacks = callArgs[2];

    // Test getCommitmentTree callback
    callbacks.getCommitmentTree('passport');
    expect(mockGetCommitmentTree).toHaveBeenCalledWith(
      mockSelfClient,
      'passport',
    );

    // Test getAltCSCA callback
    const altCSCA = callbacks.getAltCSCA('passport');
    expect(mockGetState).toHaveBeenCalled();
    expect(altCSCA).toEqual({ csca1: 'cert1' });
  });
});
