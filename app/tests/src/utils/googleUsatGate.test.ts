// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getAllDocuments,
  isGoogleUsatProofRequest,
} from '@selfxyz/mobile-sdk-alpha';

import {
  evaluateGoogleUsatEligibilityForDocument,
  evaluateGoogleUsatEntryGate,
  evaluateGoogleUsatGate,
  evaluateGoogleUsatGateForDocument,
  FORCE_GOOGLE_USAT_FOR_TESTING,
  getGoogleUsatPolicyForApp,
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
    allowedCategories: ['passport', 'id_card'],
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

  it('allows Google USAT when selected document is a real passport', async () => {
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

  it('blocks Google USAT when selected document is kyc even if a real passport exists', async () => {
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

  it('blocks Google USAT when selected id_card document is a mock', async () => {
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

  it('blocks Google USAT when selected real document is aadhaar', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'aadhaar', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatGate(selfClient, app)).resolves.toBe(
      'block',
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
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('blocks when selected is kyc and the only alternative is aadhaar', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc', mock: false } } as any,
      b: { data: { documentCategory: 'aadhaar', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'block',
    );
  });

  it('allows (defers to selector) when selected is aadhaar and a passport exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'aadhaar', mock: false } } as any,
      b: { data: { documentCategory: 'passport', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'allow',
    );
  });

  it('blocks when aadhaar is the only document', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'a',
    });
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'aadhaar', mock: false } } as any,
    });
    await expect(evaluateGoogleUsatEntryGate(selfClient, app)).resolves.toBe(
      'block',
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

describe('evaluateGoogleUsatEligibilityForDocument', () => {
  const app = {} as any;
  const doc = (documentCategory: string, mock = false) =>
    ({ data: { documentCategory, mock } }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
  });

  it('marks passport and id_card as eligible', () => {
    expect(
      evaluateGoogleUsatEligibilityForDocument(app, doc('passport')),
    ).toEqual({ eligible: true });
    expect(
      evaluateGoogleUsatEligibilityForDocument(app, doc('id_card')),
    ).toEqual({ eligible: true });
  });

  it('marks aadhaar as ineligible with needs_nfc', () => {
    expect(
      evaluateGoogleUsatEligibilityForDocument(app, doc('aadhaar')),
    ).toEqual({ eligible: false, reason: 'needs_nfc' });
  });

  it('marks kyc as ineligible with unsupported_id_type', () => {
    expect(evaluateGoogleUsatEligibilityForDocument(app, doc('kyc'))).toEqual({
      eligible: false,
      reason: 'unsupported_id_type',
    });
  });

  it('treats every document as eligible for non Google USAT requests', () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(false);
    expect(
      evaluateGoogleUsatEligibilityForDocument(app, doc('aadhaar')),
    ).toEqual({ eligible: true });
  });
});

describe('staging endpoint types', () => {
  const selfClient = {
    loadDocumentCatalog: jest.fn(),
  } as any;
  const appWith = (endpointType?: string) =>
    ({ sessionId: 'session-id', endpointType }) as any;
  const doc = (documentCategory: string, mock = false) =>
    ({ data: { documentCategory, mock } }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
  });

  it.each(['staging_https', 'staging_celo'])(
    'allows a mock passport and mock id_card on %s',
    async endpointType => {
      const docs = { p: doc('passport', true), i: doc('id_card', true) };
      await expect(
        evaluateGoogleUsatGateForDocument(
          selfClient,
          appWith(endpointType),
          'p',
          docs,
        ),
      ).resolves.toBe('allow');
      await expect(
        evaluateGoogleUsatGateForDocument(
          selfClient,
          appWith(endpointType),
          'i',
          docs,
        ),
      ).resolves.toBe('allow');
    },
  );

  it.each(['https', 'celo', undefined, 'staging'])(
    'still blocks a mock passport when endpointType is %s',
    async endpointType => {
      await expect(
        evaluateGoogleUsatGateForDocument(
          selfClient,
          appWith(endpointType),
          'p',
          { p: doc('passport', true) },
        ),
      ).resolves.toBe('block');
    },
  );

  it('keeps the category rule on staging for mock and real documents', async () => {
    const docs = {
      k: doc('kyc', true),
      a: doc('aadhaar', true),
      r: doc('aadhaar', false),
    };
    for (const id of Object.keys(docs)) {
      await expect(
        evaluateGoogleUsatGateForDocument(
          selfClient,
          appWith('staging_https'),
          id,
          docs,
        ),
      ).resolves.toBe('block');
    }
  });

  it('entry gate defers to the selector on staging when a mock passport is the alternative', async () => {
    selfClient.loadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'k',
    });
    mockGetAllDocuments.mockResolvedValue({
      k: doc('kyc'),
      p: doc('passport', true),
    });
    await expect(
      evaluateGoogleUsatEntryGate(selfClient, appWith('staging_https')),
    ).resolves.toBe('allow');
    await expect(
      evaluateGoogleUsatEntryGate(selfClient, appWith('https')),
    ).resolves.toBe('block');
  });

  it('picker eligibility accepts a mock passport on staging only', () => {
    expect(
      evaluateGoogleUsatEligibilityForDocument(
        appWith('staging_https'),
        doc('passport', true),
      ),
    ).toEqual({ eligible: true });
    expect(
      evaluateGoogleUsatEligibilityForDocument(
        appWith('https'),
        doc('passport', true),
      ),
    ).toEqual({ eligible: false, reason: 'unsupported_id_type' });
  });

  it('resolves a mock-allowing policy for staging without changing categories', () => {
    const production = getGoogleUsatPolicyForApp(appWith('https'));
    const staging = getGoogleUsatPolicyForApp(appWith('staging_https'));
    expect(production.allowMock).toBe(false);
    expect(staging.allowMock).toBe(true);
    expect(staging.allowedCategories).toEqual(production.allowedCategories);
  });
});
