// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDDocument } from '@selfxyz/common/utils/types';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';

import {
  checkRestoredDocumentRegistration,
  ProtocolDataUnavailableError,
} from '@/proving/checkRestoredDocumentRegistration';

jest.mock('@/services/analytics', () => ({
  __esModule: true,
  default: jest.fn(),
  trackEvent: jest.fn(),
  trackScreenView: jest.fn(),
  flush: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  getAllDocumentsDirectlyFromKeychain: jest.fn(),
  loadPassportDataAndSecret: jest.fn(),
  loadSelectedDocumentDirectlyFromKeychain: jest.fn(),
  reStorePassportDataWithRightCSCA: jest.fn(),
  setSelectedDocument: jest.fn(),
  storePassportData: jest.fn(),
  updateDocumentRegistrationState: jest.fn(),
}));

const mockFetchAllTreesAndCircuits = jest.fn();
const mockGetCommitmentTree = jest.fn();

jest.mock('@selfxyz/mobile-sdk-alpha/stores', () => ({
  useProtocolStore: { getState: jest.fn() },
  fetchAllTreesAndCircuits: jest.fn((...args: unknown[]) =>
    mockFetchAllTreesAndCircuits(...args),
  ),
  getCommitmentTree: jest.fn((...args: unknown[]) =>
    mockGetCommitmentTree(...args),
  ),
}));

const mockIsUserRegisteredWithAlternativeCSCA = jest.fn();
const mockIsUserRegistered = jest.fn();

jest.mock('@selfxyz/common/utils/passports/validate', () => ({
  isUserRegisteredWithAlternativeCSCA: jest.fn((...args: unknown[]) =>
    mockIsUserRegisteredWithAlternativeCSCA(...args),
  ),
  isUserRegistered: jest.fn((...args: unknown[]) =>
    mockIsUserRegistered(...args),
  ),
}));

const TREE = 'serialized_tree';

let callOrder: string[];
let protocolState: Record<string, Record<string, unknown>>;
let selfClient: SelfClient;

function mrzSlice() {
  return {
    commitment_tree: null as string | null,
    alternative_csca: {} as Record<string, string>,
    fetch_all: jest.fn(),
    fetch_identity_tree: jest.fn(),
  };
}

function keySlice() {
  return {
    commitment_tree: null as string | null,
    public_keys: null as string[] | null,
    fetch_all: jest.fn(),
  };
}

/** Mirrors the real store: the fetchers are what put data in place. */
function populates(category: string) {
  return jest.fn(async () => {
    callOrder.push('fetch');
    protocolState[category].commitment_tree = TREE;
  });
}

function documentFixture(overrides: Record<string, unknown> = {}): IDDocument {
  return {
    documentCategory: 'passport',
    mock: false,
    dsc_parsed: { authorityKeyIdentifier: 'aki-123' },
    ...overrides,
  } as unknown as IDDocument;
}

beforeEach(() => {
  jest.clearAllMocks();
  callOrder = [];
  protocolState = {
    passport: mrzSlice(),
    id_card: mrzSlice(),
    aadhaar: keySlice(),
    kyc: keySlice(),
  };
  selfClient = {
    getProtocolState: () => protocolState,
    useProtocolStore: { getState: () => protocolState },
  } as unknown as SelfClient;

  mockGetCommitmentTree.mockImplementation(
    (_client: unknown, category: string) =>
      protocolState[category].commitment_tree,
  );
  mockFetchAllTreesAndCircuits.mockImplementation(async () => {
    callOrder.push('fetch');
    protocolState.passport.commitment_tree = TREE;
  });
  mockIsUserRegisteredWithAlternativeCSCA.mockImplementation(async () => {
    callOrder.push('check');
    return { isRegistered: true, csca: 'matched-csca' };
  });
  mockIsUserRegistered.mockImplementation(async () => {
    callOrder.push('fallback');
    return true;
  });
});

describe('checkRestoredDocumentRegistration', () => {
  it('fetches protocol data before running the registration check', async () => {
    protocolState.passport.alternative_csca = { a: 'pem' };

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    expect(mockFetchAllTreesAndCircuits).toHaveBeenCalledWith(
      selfClient,
      'passport',
      'prod',
      'aki-123',
    );
    // The check must see the fetched tree, not the null it started with.
    expect(callOrder).toEqual(['fetch', 'check']);
    expect(result).toEqual({ isRegistered: true, csca: 'matched-csca' });
  });

  it('passes the fetched tree through to the validator', async () => {
    protocolState.passport.alternative_csca = { a: 'pem' };

    await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    const callbacks = mockIsUserRegisteredWithAlternativeCSCA.mock.calls[0][2];
    expect(callbacks.getCommitmentTree('passport')).toBe(TREE);
  });

  it('serializes a structured tree rather than rejecting it', async () => {
    // The endpoint returns `data` as a JSON string today and LeanIMT.import
    // requires that, but the store types the field `any`. An already-parsed
    // tree must not read as "missing".
    const parsedTree = [['1', '2'], ['3']];
    protocolState.passport.alternative_csca = { a: 'pem' };
    mockFetchAllTreesAndCircuits.mockImplementation(async () => {
      protocolState.passport.commitment_tree = parsedTree;
    });

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    const callbacks = mockIsUserRegisteredWithAlternativeCSCA.mock.calls[0][2];
    expect(callbacks.getCommitmentTree('passport')).toBe(
      JSON.stringify(parsedTree),
    );
    expect(result).toEqual({ isRegistered: true, csca: 'matched-csca' });
  });

  it('throws ProtocolDataUnavailableError when the tree is still missing after fetching', async () => {
    // The real passport fetchers swallow their errors and null the field, so a
    // resolved fetch is not proof the tree arrived.
    mockFetchAllTreesAndCircuits.mockResolvedValue(undefined);

    await expect(
      checkRestoredDocumentRegistration(
        selfClient,
        documentFixture(),
        'secret',
      ),
    ).rejects.toBeInstanceOf(ProtocolDataUnavailableError);

    expect(mockIsUserRegisteredWithAlternativeCSCA).not.toHaveBeenCalled();
    expect(mockIsUserRegistered).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty string', ''],
    ['a number', 42],
    ['a boolean', true],
  ])('rejects %s as a commitment tree', async (_label, value) => {
    mockFetchAllTreesAndCircuits.mockImplementation(async () => {
      protocolState.passport.commitment_tree = value;
    });

    await expect(
      checkRestoredDocumentRegistration(
        selfClient,
        documentFixture(),
        'secret',
      ),
    ).rejects.toBeInstanceOf(ProtocolDataUnavailableError);
  });

  it('falls back to the document own keys when alternative CSCA is empty', async () => {
    protocolState.passport.alternative_csca = {};

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    expect(mockIsUserRegisteredWithAlternativeCSCA).not.toHaveBeenCalled();
    expect(mockIsUserRegistered).toHaveBeenCalled();
    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('falls back when the alternative CSCA sweep reports not registered', async () => {
    protocolState.passport.alternative_csca = { a: 'pem' };
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('reports not registered when neither path matches', async () => {
    protocolState.passport.alternative_csca = { a: 'pem' };
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });
    mockIsUserRegistered.mockResolvedValue(false);

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture(),
      'secret',
    );

    expect(result).toEqual({ isRegistered: false, csca: null });
  });

  it('fetches only the identity tree when the document has no authority key identifier', async () => {
    protocolState.passport.fetch_identity_tree = populates('passport');

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ dsc_parsed: undefined }),
      'secret',
    );

    expect(mockFetchAllTreesAndCircuits).not.toHaveBeenCalled();
    expect(protocolState.passport.fetch_identity_tree).toHaveBeenCalledWith(
      'prod',
    );
    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('treats an empty authority key identifier as missing', async () => {
    protocolState.passport.fetch_identity_tree = populates('passport');

    await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ dsc_parsed: { authorityKeyIdentifier: '' } }),
      'secret',
    );

    expect(mockFetchAllTreesAndCircuits).not.toHaveBeenCalled();
    expect(protocolState.passport.fetch_identity_tree).toHaveBeenCalledWith(
      'prod',
    );
  });

  it('uses the staging environment for mock documents', async () => {
    protocolState.passport.alternative_csca = { a: 'pem' };

    await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ mock: true }),
      'secret',
    );

    expect(mockFetchAllTreesAndCircuits).toHaveBeenCalledWith(
      selfClient,
      'passport',
      'stg',
      'aki-123',
    );
  });

  it('checks aadhaar documents without an AKI and without stored public keys', async () => {
    // The validator seeds the document own public key, so a null public_keys
    // list must not block the check.
    protocolState.aadhaar.fetch_all = populates('aadhaar');

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'aadhaar', dsc_parsed: undefined }),
      'secret',
    );

    expect(protocolState.aadhaar.fetch_all).toHaveBeenCalledWith('prod');
    expect(protocolState.aadhaar.fetch_all).toHaveBeenCalledTimes(1);
    expect(mockFetchAllTreesAndCircuits).not.toHaveBeenCalled();
    expect(mockIsUserRegisteredWithAlternativeCSCA).toHaveBeenCalled();
    // csca must stay null for aadhaar: the validator returns the matched public
    // key there, and callers feed this field to reStorePassportDataWithRightCSCA,
    // which parses it as an X.509 certificate.
    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('proceeds when an unrelated aadhaar fetch fails but the tree arrived', async () => {
    // fetch_all batches deployed circuits, DNS mapping and OFAC alongside the
    // identity tree and rejects for the whole batch. Recovery must not be
    // blocked by an endpoint this check does not use.
    protocolState.aadhaar.fetch_all = jest.fn(async () => {
      protocolState.aadhaar.commitment_tree = TREE;
      throw new Error('ofac endpoint down');
    });

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'aadhaar', dsc_parsed: undefined }),
      'secret',
    );

    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('falls back to the document commitment when aadhaar public keys are empty', async () => {
    // validate.ts returns early for an empty public key map, before it can seed
    // the document's own key, so the single-commitment path has to cover it.
    protocolState.aadhaar.fetch_all = populates('aadhaar');
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'aadhaar', dsc_parsed: undefined }),
      'secret',
    );

    expect(mockIsUserRegistered).toHaveBeenCalled();
    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('checks kyc documents even though public keys are always null', async () => {
    protocolState.kyc.fetch_all = populates('kyc');

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'kyc', dsc_parsed: undefined }),
      'secret',
    );

    expect(mockIsUserRegisteredWithAlternativeCSCA).toHaveBeenCalled();
    expect(result).toEqual({ isRegistered: true, csca: null });
  });

  it('does not run a redundant fallback for kyc documents', async () => {
    // The validator already routes kyc through isUserRegistered.
    protocolState.kyc.fetch_all = populates('kyc');
    mockIsUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    const result = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'kyc', dsc_parsed: undefined }),
      'secret',
    );

    expect(mockIsUserRegistered).not.toHaveBeenCalled();
    expect(result).toEqual({ isRegistered: false, csca: null });
  });

  it('wraps an aadhaar fetch rejection in ProtocolDataUnavailableError', async () => {
    const cause = new Error('network down');
    protocolState.aadhaar.fetch_all = jest.fn().mockRejectedValue(cause);

    const error = await checkRestoredDocumentRegistration(
      selfClient,
      documentFixture({ documentCategory: 'aadhaar', dsc_parsed: undefined }),
      'secret',
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProtocolDataUnavailableError);
    expect((error as ProtocolDataUnavailableError).documentCategory).toBe(
      'aadhaar',
    );
    expect((error as ProtocolDataUnavailableError).cause).toBe(cause);
  });
});
