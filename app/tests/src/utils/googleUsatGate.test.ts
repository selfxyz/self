// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getAllDocuments,
  isGoogleUsatProofRequest,
} from '@selfxyz/mobile-sdk-alpha';

import {
  evaluateGoogleUsatEntryGate,
  evaluateGoogleUsatGate,
  evaluateGoogleUsatGateForDocument,
  FORCE_GOOGLE_USAT_FOR_TESTING,
} from '@/utils/googleUsatGate';

jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  const policy = {
    id: 'google-usat-faucet',
    match: {
      endpoint: 'https://example/api/verify',
      scope: 'celo-mainnet-tether-usat',
      appName: 'Google Cloud Web3 Portal',
    },
    // Mirror GOOGLE_USAT_FAUCET_POLICY defaults to avoid drift.
    allowedCategories: ['passport', 'id_card', 'aadhaar'],
    allowMock: false,
  };
  return {
    getAllDocuments: jest.fn(),
    isGoogleUsatProofRequest: jest.fn(),
    GOOGLE_USAT_FAUCET_POLICY: policy,
    isDocumentEligibleForPolicy: (
      p: typeof policy,
      category: string,
      isMock: boolean | undefined,
    ) =>
      p.allowedCategories.includes(category) &&
      !(isMock === true && !p.allowMock),
    hasEligibleAlternativeDocumentForPolicy: (
      p: typeof policy,
      docs: Record<
        string,
        { data: { documentCategory: string; mock?: boolean } }
      >,
      excludedDocumentId: string,
    ) =>
      Object.entries(docs).some(([id, doc]) => {
        if (id === excludedDocumentId) return false;
        const { documentCategory, mock } = doc.data;
        return (
          p.allowedCategories.includes(documentCategory) &&
          !(mock === true && !p.allowMock)
        );
      }),
  };
});

const mockGetAllDocuments = getAllDocuments as jest.MockedFunction<
  typeof getAllDocuments
>;
const mockIsGoogleUsatProofRequest =
  isGoogleUsatProofRequest as jest.MockedFunction<
    typeof isGoogleUsatProofRequest
  >;

describe('evaluateGoogleUsatGate', () => {
  const selfClient = {
    loadDocumentCatalog: jest.fn(),
  } as any;
  const app = {
    sessionId: 'session-id',
    endpointType: 'celo',
    chainID: 42220,
    endpoint: '0xabc',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGoogleUsatProofRequest.mockReturnValue(false);
    mockGetAllDocuments.mockResolvedValue({});
    selfClient.loadDocumentCatalog.mockResolvedValue({});
  });

  it('treats non Google USAT requests according to the force-test toggle', async () => {
    const result = await evaluateGoogleUsatGate(selfClient, app);
    expect(result).toBe('allow');
    expect(mockGetAllDocuments).toHaveBeenCalledTimes(
      FORCE_GOOGLE_USAT_FOR_TESTING ? 1 : 0,
    );
  });

  it('blocks Google USAT when selected document is not found in docs', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'missing',
    });
    mockGetAllDocuments.mockResolvedValue({});
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('allows Google USAT when selected document is real and non-kyc', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'b',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('blocks Google USAT when selected document is kyc even if another real non-kyc exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('blocks Google USAT when selected non-kyc document is a mock', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'b',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'id_card', mock: true } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('blocks Google USAT when selected document is missing from loaded docs', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'missing',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('allows Google USAT when no selected document exists and defers to downstream selection checks', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({});
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('allows Google USAT when selected real document is aadhaar', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'aadhaar', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('fails open when getAllDocuments throws', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockRejectedValue(new Error('network down'));
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('exposes testing force toggle', () => {
    expect(typeof FORCE_GOOGLE_USAT_FOR_TESTING).toBe('boolean');
  });

  it('reuses prefetched docs for per-document gate checks', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    const docs = {
      selected: { data: { documentCategory: 'passport', mock: false } } as any,
    };
    await expect(
      evaluateGoogleUsatGateForDocument(selfClient, app, 'selected', docs),
    ).resolves.toBe('allow');
    expect(mockGetAllDocuments).not.toHaveBeenCalled();
  });
});

describe('evaluateGoogleUsatEntryGate', () => {
  const selfClient = {
    loadDocumentCatalog: jest.fn(),
  } as any;
  const app = {
    sessionId: 'session-id',
    endpointType: 'celo',
    chainID: 42220,
    endpoint: '0xabc',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGoogleUsatProofRequest.mockReturnValue(false);
    mockGetAllDocuments.mockResolvedValue({});
    selfClient.loadDocumentCatalog.mockResolvedValue({});
  });

  it('allows non Google USAT requests without loading documents', async () => {
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
    expect(selfClient.loadDocumentCatalog).not.toHaveBeenCalled();
  });

  it('allows when no document is selected (defers to downstream selection)', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({});
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('allows when the selected document is eligible', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'b',
    });
    mockGetAllDocuments.mockResolvedValue({
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('allows (defers to selector) when selected is kyc but an eligible alternative exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'aadhaar', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('blocks when selected is kyc and no eligible alternative exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('blocks when the only alternative is a mock document', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: true } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('allows (defers) when the selected document is missing but an eligible alternative exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'missing',
    });
    mockGetAllDocuments.mockResolvedValue({
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('fails open when getAllDocuments throws', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockRejectedValue(new Error('network down'));
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });
});
