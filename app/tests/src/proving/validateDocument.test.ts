// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common/types';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

// Import functions to test AFTER mocks are set up
import {
  checkAndUpdateRegistrationStates,
  getAlternativeCSCA,
} from '@/proving/validateDocument';
import { trackEvent } from '@/services/analytics';

// Mock the analytics module to avoid side effects in tests
jest.mock('@/services/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    flush: jest.fn(),
  })),
  trackEvent: jest.fn(),
  trackScreenView: jest.fn(),
  flush: jest.fn(),
}));

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

// Reusable default deployed circuits for initial store state
const defaultDeployedCircuits: {
  REGISTER: string[];
  REGISTER_ID: string[];
  DSC: string[];
  DSC_ID: string[];
} = {
  REGISTER: ['test_register'],
  REGISTER_ID: ['test_register_id'],
  DSC: ['test_dsc'],
  DSC_ID: ['test_dsc_id'],
};

// Mock the protocol store to avoid complex state management
const mockGetState = jest.fn(() => ({
  passport: {
    fetch_all: jest.fn(),
    deployed_circuits: { ...defaultDeployedCircuits },
    commitment_tree: 'test_tree',
    alternative_csca: {},
  },
  id_card: {
    fetch_all: jest.fn(),
    deployed_circuits: { ...defaultDeployedCircuits },
    commitment_tree: 'test_tree',
    alternative_csca: {},
  },
  aadhaar: {
    public_keys: [] as string[] | null,
    commitment_tree: 'test_tree',
  },
}));

const mockFetchAllTreesAndCircuits = jest.fn();
const mockGetCommitmentTree = jest.fn();

jest.mock('@selfxyz/mobile-sdk-alpha/stores', () => ({
  useProtocolStore: {
    getState: jest.fn(() => mockGetState()),
  },
  fetchAllTreesAndCircuits: jest.fn((...args: unknown[]) =>
    mockFetchAllTreesAndCircuits(...args),
  ),
  getCommitmentTree: jest.fn((...args: unknown[]) =>
    mockGetCommitmentTree(...args),
  ),
}));

// DRY helpers for repeated protocol state shapes in tests
const emptyDeployedCircuits = {
  REGISTER: [] as string[],
  REGISTER_ID: [] as string[],
  DSC: [] as string[],
  DSC_ID: [] as string[],
};

function buildModuleState(alternative: Record<string, unknown> = {}) {
  return {
    fetch_all: jest.fn(),
    deployed_circuits: { ...emptyDeployedCircuits },
    commitment_tree: 'test_tree',
    alternative_csca: alternative,
  };
}

function buildState(params?: {
  passportAlt?: Record<string, unknown>;
  idAlt?: Record<string, unknown>;
  aadhaarKeys?: string[] | null;
}) {
  return {
    passport: buildModuleState(params?.passportAlt ?? {}),
    id_card: buildModuleState(params?.idAlt ?? {}),
    aadhaar: {
      public_keys: (params?.aadhaarKeys ?? []) as string[] | null,
      commitment_tree: 'test_tree',
    },
  };
}

// Mock the validation utilities
const mockIsUserRegisteredWithAlternativeCSCA = jest.fn();
jest.mock('@selfxyz/common/utils/passports/validate', () => ({
  isUserRegisteredWithAlternativeCSCA: jest.fn((...args: unknown[]) =>
    mockIsUserRegisteredWithAlternativeCSCA(...args),
  ),
}));

// Get reference to the mocked trackEvent function
let mockTrackEvent: jest.Mock;

describe('getAlternativeCSCA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked trackEvent from the analytics module
    mockTrackEvent = jest.mocked(trackEvent) as jest.Mock;
  });

  it('should return public keys in Record format for Aadhaar with valid public keys', () => {
    const mockPublicKeys = ['key1', 'key2', 'key3'];
    mockGetState.mockReturnValue(buildState({ aadhaarKeys: mockPublicKeys }));

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'aadhaar');

    expect(result).toEqual({
      public_key_0: 'key1',
      public_key_1: 'key2',
      public_key_2: 'key3',
    });
  });

  it('should return empty object for Aadhaar with no public keys', () => {
    mockGetState.mockReturnValue(buildState({ aadhaarKeys: null }));

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'aadhaar');

    expect(result).toEqual({});
  });

  it('should return empty object for Aadhaar with empty public keys array', () => {
    mockGetState.mockReturnValue(buildState({ aadhaarKeys: [] }));

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'aadhaar');

    expect(result).toEqual({});
  });

  it('should return alternative_csca for passport', () => {
    const mockAlternativeCSCA = { csca1: 'cert1', csca2: 'cert2' };
    mockGetState.mockReturnValue(
      buildState({ passportAlt: mockAlternativeCSCA }),
    );

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'passport');

    expect(result).toEqual(mockAlternativeCSCA);
  });

  it('should return alternative_csca for id_card', () => {
    const mockAlternativeCSCA = { csca1: 'id_cert1', csca2: 'id_cert2' };
    mockGetState.mockReturnValue(buildState({ idAlt: mockAlternativeCSCA }));

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'id_card');

    expect(result).toEqual(mockAlternativeCSCA);
  });

  it('should return empty object for passport with no alternative_csca', () => {
    mockGetState.mockReturnValue(buildState());

    const mockUseProtocolStore = { getState: mockGetState } as any;
    const result = getAlternativeCSCA(mockUseProtocolStore, 'passport');

    expect(result).toEqual({});
  });
});

describe('checkAndUpdateRegistrationStates', () => {
  let mockSelfClient: SelfClient;
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
    // Get the mocked trackEvent from the analytics module
    mockTrackEvent = jest.mocked(trackEvent) as jest.Mock;

    mockGetState.mockReturnValue(
      buildState({
        passportAlt: { csca1: 'cert1' },
        idAlt: { csca1: 'cert1' },
        aadhaarKeys: ['key1', 'key2'],
      }),
    );

    mockSelfClient = {
      useProtocolStore: { getState: mockGetState },
    } as unknown as SelfClient;

    mockFetchAllTreesAndCircuits.mockResolvedValue(undefined);
    mockGetCommitmentTree.mockReturnValue('mock_tree');
  });

  it('should call reStorePassportDataWithRightCSCA when document is registered with alternative CSCA (passport)', async () => {
    const mockCSCA =
      '-----BEGIN CERTIFICATE-----\nMOCK_CSCA_CERT_DATA\n-----END CERTIFICATE-----';
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
      DocumentEvents.DOCUMENT_VALIDATED,
      expect.objectContaining({
        documentId: 'doc1',
        documentCategory: 'passport',
        mock: true,
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
      DocumentEvents.DOCUMENT_VALIDATED,
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
      DocumentEvents.VALIDATE_DOCUMENT_FAILED,
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
      DocumentEvents.VALIDATE_DOCUMENT_FAILED,
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
      .mockResolvedValueOnce({
        isRegistered: true,
        csca: '-----BEGIN CERTIFICATE-----\nMOCK_CSCA_CERT_DATA_1\n-----END CERTIFICATE-----',
      })
      .mockResolvedValueOnce({ isRegistered: false, csca: null })
      .mockResolvedValueOnce({
        isRegistered: true,
        csca: '-----BEGIN CERTIFICATE-----\nMOCK_CSCA_CERT_DATA_3\n-----END CERTIFICATE-----',
      });

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
      DocumentEvents.VALIDATE_DOCUMENT_FAILED,
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
      csca: '-----BEGIN CERTIFICATE-----\nMOCK_CSCA_CERT_DATA\n-----END CERTIFICATE-----',
    });

    await checkAndUpdateRegistrationStates(mockSelfClient);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      DocumentEvents.DOCUMENT_VALIDATED,
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
