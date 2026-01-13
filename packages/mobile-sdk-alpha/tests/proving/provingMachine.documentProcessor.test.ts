// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2 } from 'poseidon-lite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AadhaarData, PassportData } from '@selfxyz/common';
import {
  generateCommitment,
  genMockIdDoc,
  getCircuitNameFromPassportData,
  getLeafDscTree,
  isMRZDocument,
} from '@selfxyz/common/utils';
import * as commonUtils from '@selfxyz/common/utils';
import { generateCommitmentInAppAadhaar } from '@selfxyz/common/utils/passports/validate';
import { AttestationIdHex } from '@selfxyz/common/utils/types';

import { PassportEvents, ProofEvents } from '../../src/constants/analytics';
import * as documentUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';
import { fetchAllTreesAndCircuits } from '../../src/stores';
import type { SelfClient } from '../../src/types/public';
import { actorMock } from './actorMock';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';

vi.mock('xstate', async () => {
  const actual = await vi.importActual<typeof import('xstate')>('xstate');
  return {
    ...actual,
    createActor: vi.fn(() => actorMock),
  };
});

vi.mock('../../src/documents/utils', async () => {
  const actual = await vi.importActual<typeof import('../../src/documents/utils')>('../../src/documents/utils');
  return {
    ...actual,
    loadSelectedDocument: vi.fn(),
    storePassportData: vi.fn(),
    clearPassportData: vi.fn(),
    reStorePassportDataWithRightCSCA: vi.fn(),
    markCurrentDocumentAsRegistered: vi.fn(),
  };
});

vi.mock('../../src/stores', async () => {
  const actual = await vi.importActual<typeof import('../../src/stores')>('../../src/stores');
  return {
    ...actual,
    fetchAllTreesAndCircuits: vi.fn(),
  };
});

const createCommitmentTree = (commitments: string[]) => {
  const tree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]));
  if (commitments.length > 0) {
    tree.insertMany(commitments.map(commitment => BigInt(commitment)));
  }
  return tree.export();
};

const createDscTree = (leaves: string[]) => createCommitmentTree(leaves);

const buildPassportFixture = (): PassportData =>
  ({
    mrz: 'P<GBRSMITH<<BILL<<<<<<<<<<<<<<<<<<<<<<<<<<<<7475772739GBR6911111M1601013<<<<<<<<<<<<<<00',
    dsc: '-----BEGIN CERTIFICATE-----\nMIIBvTCCASagAwIBAgIJAJc1qz3hVp5NMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\nBAMMCFRlc3QgQ0EgMQ==\n-----END CERTIFICATE-----',
    eContent: [1, 2, 3, 4, 5],
    signedAttr: [6, 7, 8, 9, 10],
    encryptedDigest: [11, 12, 13, 14, 15],
    documentType: 'passport',
    documentCategory: 'passport',
    mock: true,
    passportMetadata: {
      dataGroups: '1,2,3',
      dg1Size: 88,
      dg1HashSize: 32,
      dg1HashFunction: 'sha256',
      dg1HashOffset: 0,
      dgPaddingBytes: 0,
      eContentSize: 5,
      eContentHashFunction: 'sha256',
      eContentHashOffset: 0,
      signedAttrSize: 5,
      signedAttrHashFunction: 'sha256',
      signatureAlgorithm: 'rsa',
      saltLength: 0,
      curveOrExponent: '65537',
      signatureAlgorithmBits: 2048,
      countryCode: 'GBR',
      cscaFound: true,
      cscaHashFunction: 'sha256',
      cscaSignatureAlgorithm: 'rsa',
      cscaSaltLength: 0,
      cscaCurveOrExponent: '65537',
      cscaSignatureAlgorithmBits: 2048,
      dsc: '-----BEGIN CERTIFICATE-----\nMIIBvTCCASagAwIBAgIJAJc1qz3hVp5NMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\nBAMMCFRlc3QgQ0EgMQ==\n-----END CERTIFICATE-----',
      csca: '-----BEGIN CERTIFICATE-----\nMIIBvTCCASagAwIBAgIJAJc1qz3hVp5NMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\nBAMMCFRlc3QgQ0EgMQ==\n-----END CERTIFICATE-----',
    },
    dsc_parsed: {
      id: 'test123',
      issuer: 'UTO',
      validity: {
        notBefore: '2020-01-01',
        notAfter: '2030-01-01',
      },
      subjectKeyIdentifier: 'test123456789',
      authorityKeyIdentifier: 'test987654321',
      signatureAlgorithm: 'rsa',
      hashAlgorithm: 'sha256',
      publicKeyDetails: undefined,
      tbsBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      tbsBytesLength: '10',
      rawPem:
        '-----BEGIN CERTIFICATE-----\nMIIBvTCCASagAwIBAgIJAJc1qz3hVp5NMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\nBAMMCFRlc3QgQ0EgMQ==\n-----END CERTIFICATE-----',
      rawTxt: '',
      publicKeyAlgoOID: '',
    },
    csca_parsed: {
      id: 'csca123',
      issuer: 'UTO',
      validity: {
        notBefore: '2020-01-01',
        notAfter: '2030-01-01',
      },
      subjectKeyIdentifier: 'csca123456789',
      authorityKeyIdentifier: 'csca987654321',
      signatureAlgorithm: 'rsa',
      hashAlgorithm: 'sha256',
      publicKeyDetails: undefined,
      tbsBytes: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      tbsBytesLength: '10',
      rawPem:
        '-----BEGIN CERTIFICATE-----\nMIIBvTCCASagAwIBAgIJAJc1qz3hVp5NMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\nBAMMCFRlc3QgQ0EgMQ==\n-----END CERTIFICATE-----',
      rawTxt: '',
      publicKeyAlgoOID: '',
    },
  }) as PassportData;

const buildProtocolState = ({
  commitmentTree,
  dscTree,
  deployedCircuits,
  alternativeCsca,
  publicKeys,
}: {
  commitmentTree: string | null;
  dscTree: string | null;
  deployedCircuits: {
    REGISTER: string[];
    REGISTER_ID: string[];
    REGISTER_AADHAAR: string[];
    DSC: string[];
    DSC_ID: string[];
  };
  alternativeCsca?: Record<string, string>;
  publicKeys?: string[];
}) => ({
  passport: {
    commitment_tree: commitmentTree,
    dsc_tree: dscTree,
    csca_tree: null,
    deployed_circuits: deployedCircuits,
    circuits_dns_mapping: null,
    alternative_csca: alternativeCsca ?? {},
    ofac_trees: null,
    fetch_all: vi.fn(),
    fetch_deployed_circuits: vi.fn(),
    fetch_circuits_dns_mapping: vi.fn(),
    fetch_csca_tree: vi.fn(),
    fetch_dsc_tree: vi.fn(),
    fetch_identity_tree: vi.fn(),
    fetch_alternative_csca: vi.fn(),
    fetch_ofac_trees: vi.fn(),
  },
  id_card: {
    commitment_tree: commitmentTree,
    dsc_tree: dscTree,
    csca_tree: null,
    deployed_circuits: deployedCircuits,
    circuits_dns_mapping: null,
    alternative_csca: alternativeCsca ?? {},
    ofac_trees: null,
    fetch_all: vi.fn(),
    fetch_deployed_circuits: vi.fn(),
    fetch_circuits_dns_mapping: vi.fn(),
    fetch_csca_tree: vi.fn(),
    fetch_dsc_tree: vi.fn(),
    fetch_identity_tree: vi.fn(),
    fetch_alternative_csca: vi.fn(),
    fetch_ofac_trees: vi.fn(),
  },
  aadhaar: {
    commitment_tree: commitmentTree,
    dsc_tree: null,
    csca_tree: null,
    deployed_circuits: deployedCircuits,
    circuits_dns_mapping: null,
    public_keys: publicKeys ?? [],
    ofac_trees: null,
    fetch_all: vi.fn(),
    fetch_deployed_circuits: vi.fn(),
    fetch_circuits_dns_mapping: vi.fn(),
    fetch_csca_tree: vi.fn(),
    fetch_dsc_tree: vi.fn(),
    fetch_identity_tree: vi.fn(),
    fetch_alternative_csca: vi.fn(),
    fetch_ofac_trees: vi.fn(),
  },
});

const createSelfClient = (protocolState: ReturnType<typeof buildProtocolState>) =>
  ({
    trackEvent: vi.fn(),
    logProofEvent: vi.fn(),
    emit: vi.fn(),
    getPrivateKey: vi.fn().mockResolvedValue('123456789'),
    getProvingState: () => useProvingStore.getState(),
    getSelfAppState: () => ({ selfApp: null }),
    getProtocolState: () => protocolState,
  }) as unknown as SelfClient;

describe('parseIDDocument', () => {
  const loadSelectedDocumentMock = vi.mocked(documentUtils.loadSelectedDocument);
  const storePassportDataMock = vi.mocked(documentUtils.storePassportData);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses passport data successfully and updates state with parsed result', async () => {
    const passportData = genMockIdDoc({ idType: 'mock_passport' }) as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    const getSKIPEMSpy = vi.spyOn(commonUtils, 'getSKIPEM').mockResolvedValue({});

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    await useProvingStore.getState().parseIDDocument(selfClient);

    const state = useProvingStore.getState();
    expect(getSKIPEMSpy).toHaveBeenCalledWith('staging');
    expect(storePassportDataMock).toHaveBeenCalledWith(selfClient, state.passportData);
    if (state.passportData && isMRZDocument(state.passportData)) {
      expect(state.passportData.passportMetadata).toBeDefined();
    }
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_SUCCESS' });
    if (state.passportData && isMRZDocument(state.passportData)) {
      expect(selfClient.trackEvent).toHaveBeenCalledWith(
        PassportEvents.PASSPORT_PARSED,
        expect.objectContaining({
          success: true,
          country_code: state.passportData.passportMetadata?.countryCode,
        }),
      );
    }
  });

  it('handles missing passport data with PARSE_ERROR and analytics event', async () => {
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: genMockIdDoc({ idType: 'mock_passport' }) } as any);

    vi.spyOn(commonUtils, 'getSKIPEM').mockResolvedValue({});

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: null });

    await useProvingStore.getState().parseIDDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(PassportEvents.PASSPORT_PARSE_FAILED, {
      error: 'PassportData is not available',
    });
  });

  it('surfaces parsing failures when the DSC cannot be parsed', async () => {
    const passportData = {
      ...(genMockIdDoc({ idType: 'mock_passport' }) as PassportData),
      dsc: 'invalid-certificate',
    } as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    vi.spyOn(commonUtils, 'getSKIPEM').mockResolvedValue({});

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    await useProvingStore.getState().parseIDDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(
      PassportEvents.PASSPORT_PARSE_FAILED,
      expect.objectContaining({
        error: expect.stringMatching(/asn\\.1|parsing/i),
      }),
    );
  });

  it('continues when DSC metadata cannot be read and logs empty dsc payload', async () => {
    const passportData = genMockIdDoc({ idType: 'mock_passport' }) as PassportData;
    let metadataProxy: PassportData['passportMetadata'];
    Object.defineProperty(passportData, 'passportMetadata', {
      get() {
        return metadataProxy;
      },
      set(value) {
        metadataProxy = new Proxy(value, {
          get(target, prop) {
            if (prop === 'dsc') {
              throw new Error('dsc parse failed');
            }
            return target[prop as keyof typeof target];
          },
        });
      },
      configurable: true,
    });

    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    vi.spyOn(commonUtils, 'getSKIPEM').mockResolvedValue({});

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    await useProvingStore.getState().parseIDDocument(selfClient);

    const parsedEvent = vi
      .mocked(selfClient.trackEvent)
      .mock.calls.find(([event]) => event === PassportEvents.PASSPORT_PARSED)?.[1];

    expect(parsedEvent).toEqual(
      expect.objectContaining({
        dsc: {},
      }),
    );
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_SUCCESS' });
  });

  it('emits PARSE_ERROR when storing parsed passport data fails', async () => {
    const passportData = genMockIdDoc({ idType: 'mock_passport' }) as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    vi.spyOn(commonUtils, 'getSKIPEM').mockResolvedValue({});

    storePassportDataMock.mockRejectedValue(new Error('storage unavailable'));

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    await useProvingStore.getState().parseIDDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(PassportEvents.PASSPORT_PARSE_FAILED, {
      error: 'storage unavailable',
    });
  });
});

describe('startFetchingData', () => {
  const loadSelectedDocumentMock = vi.mocked(documentUtils.loadSelectedDocument);
  const fetchAllTreesMock = vi.mocked(fetchAllTreesAndCircuits);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches trees and circuits for passport documents', async () => {
    const passportData = {
      ...(genMockIdDoc({ idType: 'mock_passport' }) as PassportData),
      dsc_parsed: { authorityKeyIdentifier: 'KEY123' } as any,
      documentCategory: 'passport',
    } as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, env: 'prod' });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(fetchAllTreesMock).toHaveBeenCalledWith(selfClient, 'passport', 'prod', 'KEY123');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_SUCCESS);
  });

  it('fetches trees and circuits for id cards', async () => {
    const idCardData = {
      ...(genMockIdDoc({ idType: 'mock_id_card' }) as PassportData),
      dsc_parsed: { authorityKeyIdentifier: 'IDKEY' } as any,
      documentCategory: 'id_card',
    } as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: idCardData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: idCardData, env: 'stg' });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(fetchAllTreesMock).toHaveBeenCalledWith(selfClient, 'id_card', 'stg', 'IDKEY');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
  });

  it('fetches aadhaar protocol data via aadhaar fetcher', async () => {
    const aadhaarData = genMockIdDoc({ idType: 'mock_aadhaar' }) as AadhaarData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: aadhaarData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: aadhaarData, env: 'prod' });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(protocolState.aadhaar.fetch_all).toHaveBeenCalledWith('prod');
    expect(fetchAllTreesMock).not.toHaveBeenCalled();
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
  });

  it('emits FETCH_ERROR when passport data is missing', async () => {
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: genMockIdDoc({ idType: 'mock_passport' }) } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: null });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'PassportData is not available',
    });
  });

  it('emits FETCH_ERROR when DSC data is missing for passports', async () => {
    const passportData = {
      ...(genMockIdDoc({ idType: 'mock_passport' }) as PassportData),
      dsc_parsed: undefined,
      documentCategory: 'passport',
    } as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, env: 'stg' });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'Missing parsed DSC in passport data',
    });
  });

  it('emits FETCH_ERROR when protocol fetch fails', async () => {
    const passportData = {
      ...(genMockIdDoc({ idType: 'mock_passport' }) as PassportData),
      dsc_parsed: { authorityKeyIdentifier: 'KEY123' } as any,
      documentCategory: 'passport',
    } as PassportData;
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);
    fetchAllTreesMock.mockRejectedValue(new Error('network down'));

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, env: 'prod' });

    await useProvingStore.getState().startFetchingData(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'network down',
    });
  });
});

describe('validatingDocument', () => {
  const loadSelectedDocumentMock = vi.mocked(documentUtils.loadSelectedDocument);
  const clearPassportDataMock = vi.mocked(documentUtils.clearPassportData);
  const reStorePassportDataWithRightCSCMock = vi.mocked(documentUtils.reStorePassportDataWithRightCSCA);
  const markCurrentDocumentAsRegisteredMock = vi.mocked(documentUtils.markCurrentDocumentAsRegistered);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears data and emits PASSPORT_NOT_SUPPORTED when document is unsupported', async () => {
    const passportData = buildPassportFixture();
    const unsupportedCircuits = {
      REGISTER: [],
      REGISTER_ID: [],
      REGISTER_AADHAAR: [],
      DSC: [],
      DSC_ID: [],
    };
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: unsupportedCircuits,
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, secret: '123456789', circuitType: 'register' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(clearPassportDataMock).toHaveBeenCalledWith(selfClient);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PASSPORT_NOT_SUPPORTED' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(
      PassportEvents.COMING_SOON,
      expect.objectContaining({ status: 'registration_circuit_not_supported' }),
    );
  });

  it('validates disclose when the user is registered', async () => {
    const passportData = buildPassportFixture();
    const secret = '123456789';
    const commitment = generateCommitment(secret, AttestationIdHex.passport, passportData);
    const commitmentTree = createCommitmentTree([commitment]);

    const registerCircuit = getCircuitNameFromPassportData(passportData, 'register');
    const dscCircuit = getCircuitNameFromPassportData(passportData, 'dsc');
    const deployedCircuits = {
      REGISTER: [registerCircuit],
      REGISTER_ID: [],
      REGISTER_AADHAAR: ['register_aadhaar'],
      DSC: [dscCircuit],
      DSC_ID: [],
    };

    const protocolState = buildProtocolState({
      commitmentTree,
      dscTree: null,
      deployedCircuits,
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'disclose');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, secret, circuitType: 'disclose' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'VALIDATION_SUCCESS' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.VALIDATION_SUCCESS);
  });

  it('emits PASSPORT_DATA_NOT_FOUND when disclose document is not registered', async () => {
    const passportData = buildPassportFixture();
    const secret = '123456789';
    const commitmentTree = createCommitmentTree([]);
    const registerCircuit = getCircuitNameFromPassportData(passportData, 'register');
    const dscCircuit = getCircuitNameFromPassportData(passportData, 'dsc');
    const deployedCircuits = {
      REGISTER: [registerCircuit],
      REGISTER_ID: [],
      REGISTER_AADHAAR: ['register_aadhaar'],
      DSC: [dscCircuit],
      DSC_ID: [],
    };

    const protocolState = buildProtocolState({
      commitmentTree,
      dscTree: null,
      deployedCircuits,
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    await useProvingStore.getState().init(selfClient, 'disclose');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, secret, circuitType: 'disclose' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PASSPORT_DATA_NOT_FOUND' });
  });

  it('restores data when aadhaar is already registered with alternative keys', async () => {
    const aadhaarData = genMockIdDoc({ idType: 'mock_aadhaar' }) as AadhaarData;
    const secret = '123456789';
    const { commitment_list: commitmentList } = generateCommitmentInAppAadhaar(
      secret,
      AttestationIdHex.aadhaar,
      aadhaarData,
      {
        public_key_0: aadhaarData.publicKey,
      },
    );
    const commitmentTree = createCommitmentTree([commitmentList[0]]);
    const deployedCircuits = {
      REGISTER: [],
      REGISTER_ID: [],
      REGISTER_AADHAAR: ['register_aadhaar'],
      DSC: [],
      DSC_ID: [],
    };

    const protocolState = buildProtocolState({
      commitmentTree,
      dscTree: null,
      deployedCircuits,
      publicKeys: [aadhaarData.publicKey],
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: aadhaarData } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: aadhaarData, secret, circuitType: 'register' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(reStorePassportDataWithRightCSCMock).toHaveBeenCalledWith(selfClient, aadhaarData, aadhaarData.publicKey);
    expect(markCurrentDocumentAsRegisteredMock).toHaveBeenCalledWith(selfClient);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'ALREADY_REGISTERED' });
  });

  it('routes to account recovery when nullifier is on chain', async () => {
    const passportData = buildPassportFixture();
    const secret = '123456789';
    const registerCircuit = getCircuitNameFromPassportData(passportData, 'register');
    const dscCircuit = getCircuitNameFromPassportData(passportData, 'dsc');
    const deployedCircuits = {
      REGISTER: [registerCircuit],
      REGISTER_ID: [],
      REGISTER_AADHAAR: ['register_aadhaar'],
      DSC: [dscCircuit],
      DSC_ID: [],
    };

    const protocolState = buildProtocolState({
      commitmentTree: createCommitmentTree([]),
      dscTree: null,
      deployedCircuits,
      alternativeCsca: {},
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: true }),
      } as Response),
    );

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, secret, circuitType: 'register' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'ACCOUNT_RECOVERY_CHOICE' });

    globalThis.fetch = originalFetch;
  });

  it('switches to register circuit when DSC is already in the tree', async () => {
    const passportData = buildPassportFixture();
    const secret = '123456789';
    const registerCircuit = getCircuitNameFromPassportData(passportData, 'register');
    const dscCircuit = getCircuitNameFromPassportData(passportData, 'dsc');
    const deployedCircuits = {
      REGISTER: [registerCircuit],
      REGISTER_ID: [],
      REGISTER_AADHAAR: ['register_aadhaar'],
      DSC: [dscCircuit],
      DSC_ID: [],
    };
    const dscLeaf = getLeafDscTree(passportData.dsc_parsed!, passportData.csca_parsed!);
    const dscTree = createDscTree([dscLeaf]);

    const protocolState = buildProtocolState({
      commitmentTree: createCommitmentTree([]),
      dscTree,
      deployedCircuits,
      alternativeCsca: {},
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: passportData } as any);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: false }),
      } as Response),
    );

    await useProvingStore.getState().init(selfClient, 'dsc');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData, secret, circuitType: 'dsc' });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(useProvingStore.getState().circuitType).toBe('register');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'VALIDATION_SUCCESS' });

    globalThis.fetch = originalFetch;
  });

  it('emits VALIDATION_ERROR when validation throws', async () => {
    const protocolState = buildProtocolState({
      commitmentTree: null,
      dscTree: null,
      deployedCircuits: {
        REGISTER: [],
        REGISTER_ID: [],
        REGISTER_AADHAAR: [],
        DSC: [],
        DSC_ID: [],
      },
    });
    const selfClient = createSelfClient(protocolState);

    loadSelectedDocumentMock.mockResolvedValue({ data: buildPassportFixture() } as any);

    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    vi.mocked(selfClient.trackEvent).mockClear();

    useProvingStore.setState({ passportData: null });

    await useProvingStore.getState().validatingDocument(selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'VALIDATION_ERROR' });
    expect(selfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.VALIDATION_FAILED, {
      message: 'PassportData is not available',
    });
  });
});
