// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

import { useSelfAppStore } from '@/stores/selfAppStore';
import { useProvingStore } from '@/utils/proving/provingMachine';

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate') as any;
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

jest.mock('@/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));

// Mock the proving inputs to return predictable data
jest.mock('@/utils/proving/provingInputs', () => ({
  generateTEEInputsDisclose: jest.fn(() => ({
    inputs: { s: 1 },
    circuitName: 'vc_and_disclose',
    endpointType: 'https',
    endpoint: 'https://dis',
  })),
}));

// Mock the common register/dsc inputs where provingMachine actually imports from
jest.mock('@selfxyz/common/utils/circuits/registerInputs', () => ({
  generateTEEInputsRegister: jest.fn(() => ({
    inputs: { r: 1 },
    circuitName: 'reg',
    endpointType: 'celo',
    endpoint: 'https://reg',
  })),
  generateTEEInputsDSC: jest.fn(() => ({
    inputs: { d: 1 },
    circuitName: 'dsc',
    endpointType: 'celo',
    endpoint: 'https://dsc',
  })),
}));

// Mock the proving utils
jest.mock('@selfxyz/common/utils/proving', () => {
  const actual = jest.requireActual('@selfxyz/common/utils/proving') as any;
  return {
    ...actual,
    getPayload: jest.fn(() => ({ mocked: true })),
    encryptAES256GCM: jest.fn(() => ({
      nonce: [0],
      cipher_text: [1],
      auth_tag: [2],
    })),
  };
});

// Mock the tree utils to avoid CSCA tree issues
jest.mock('@selfxyz/common/utils/trees', () => {
  const actual = jest.requireActual('@selfxyz/common/utils/trees') as any;
  return {
    ...actual,
    getCscaTreeInclusionProof: jest.fn(() => [
      '123', // root as string (BigInt toString)
      ['0', '1', '0'], // path indices as strings
      ['10', '20', '30'], // siblings as strings
    ]),
  };
});

// Mock the passport utils to avoid signature processing issues
jest.mock('@selfxyz/common/utils/passports/passport', () => {
  const actual = jest.requireActual(
    '@selfxyz/common/utils/passports/passport',
  ) as any;
  return {
    ...actual,
    getPassportSignatureInfos: jest.fn(() => ({
      pubKey: [1, 2, 3, 4],
      signature: [5, 6, 7, 8],
      signatureAlgorithmFullName: 'rsa_pss_rsae_sha256_65537_2048',
    })),
  };
});

const {
  getPayload,
  encryptAES256GCM,
} = require('@selfxyz/common/utils/proving');
const { generateTEEInputsDisclose } = require('@/utils/proving/provingInputs');
const {
  generateTEEInputsRegister,
  generateTEEInputsDSC,
} = require('@selfxyz/common/utils/circuits/registerInputs');

describe('_generatePayload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProvingStore.setState({
      circuitType: 'register',
      passportData: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: {
          hashAlgorithm: 'sha256',
          tbsBytes: [1, 2, 3, 4],
          serialNumber: '123',
          issuer: 'Test Issuer',
          subject: 'Test Subject',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2030-01-01'),
          publicKey: new Uint8Array([5, 6, 7, 8]),
          signature: new Uint8Array([9, 10, 11, 12]),
          signatureAlgorithm: 'sha256WithRSAEncryption',
          publicKeyDetails: {
            bits: 2048,
            exponent: 65537,
            modulus:
              'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        },
        csca_parsed: {
          tbsBytes: [13, 14, 15, 16],
          hashAlgorithm: 'sha256',
          serialNumber: '456',
          issuer: 'Test CSCA Issuer',
          subject: 'Test CSCA Subject',
          validFrom: new Date('2019-01-01'),
          validTo: new Date('2031-01-01'),
          publicKey: new Uint8Array([17, 18, 19, 20]),
          signature: new Uint8Array([21, 22, 23, 24]),
          signatureAlgorithm: 'sha256WithRSAEncryption',
        },
        dsc: new Uint8Array([25, 26, 27, 28]),
        csca: new Uint8Array([29, 30, 31, 32]),
        passportMetadata: {
          signatureAlgorithm: 'rsa_pss_rsae_sha256',
          signedAttrHashFunction: 'sha256',
          issuer: 'Test Country',
          validFrom: new Date('2020-01-01'),
          validTo: new Date('2030-01-01'),
        },
      },
      secret: 'sec',
      uuid: '123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });
    useSelfAppStore.setState({
      selfApp: {
        chainID: 42220,
        userId: '12345678-1234-1234-1234-123456789abc', // Valid UUID format
        userDefinedData: '0x0',
        endpointType: 'https',
        endpoint: 'https://e',
        scope: 's',
        sessionId: '',
        appName: '',
        logoBase64: '',
        header: '',
        userIdType: 'uuid',
        devMode: false,
        disclosures: {},
        version: 1,
        deeplinkCallback: '', // Required property
      },
    });
    useProtocolStore.setState({
      passport: {
        dsc_tree: 'tree',
        csca_tree: [[new Uint8Array([29, 30, 31, 32])]],
        commitment_tree: null,
        deployed_circuits: null,
        circuits_dns_mapping: null,
        alternative_csca: {},
        fetch_deployed_circuits: jest.fn(),
        fetch_circuits_dns_mapping: jest.fn(),
        fetch_csca_tree: jest.fn(),
        fetch_dsc_tree: jest.fn(),
        fetch_identity_tree: jest.fn(),
        fetch_alternative_csca: jest.fn(),
        fetch_all: jest.fn(),
      },
      id_card: {
        commitment_tree: null,
        dsc_tree: null,
        csca_tree: null,
        deployed_circuits: null,
        circuits_dns_mapping: null,
        alternative_csca: {},
        fetch_deployed_circuits: jest.fn(),
        fetch_circuits_dns_mapping: jest.fn(),
        fetch_csca_tree: jest.fn(),
        fetch_dsc_tree: jest.fn(),
        fetch_identity_tree: jest.fn(),
        fetch_alternative_csca: jest.fn(),
        fetch_all: jest.fn(),
      },
    } as any);
  });

  it('register circuit', async () => {
    useProvingStore.setState({ circuitType: 'register' });
    const payload = await useProvingStore.getState()._generatePayload();
    expect(generateTEEInputsRegister).toHaveBeenCalled();
    expect(getPayload).toHaveBeenCalled();
    expect(encryptAES256GCM).toHaveBeenCalled();
    expect(useProvingStore.getState().endpointType).toBe('celo');
    expect(payload.params).toEqual({
      uuid: '123',
      nonce: [0],
      cipher_text: [1],
      auth_tag: [2],
    });
  });

  it('dsc circuit', async () => {
    useProvingStore.setState({ circuitType: 'dsc' });
    const payload = await useProvingStore.getState()._generatePayload();
    expect(generateTEEInputsDSC).toHaveBeenCalled();
    expect(useProvingStore.getState().endpointType).toBe('celo');
    expect(payload.params.uuid).toBe('123');
  });

  it('disclose circuit', async () => {
    useProvingStore.setState({ circuitType: 'disclose' });
    const payload = await useProvingStore.getState()._generatePayload();
    expect(generateTEEInputsDisclose).toHaveBeenCalled();
    expect(useProvingStore.getState().endpointType).toBe('https');
    expect(payload.params.uuid).toBe('123');
  });
});
