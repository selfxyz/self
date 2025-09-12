// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  useProtocolStore,
  useSelfAppStore,
} from '@selfxyz/mobile-sdk-alpha/stores';

// Do not import provingMachine here; we'll require it after setting up mocks per test

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate') as any;
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

// Mock proving utils for payload building
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

describe('_generatePayload disclose (stateless resolver)', () => {
  const selfClient: SelfClient = {
    trackEvent: jest.fn(),
  } as unknown as SelfClient;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    useSelfAppStore.setState({
      selfApp: {
        chainID: 42220,
        userId: '12345678-1234-1234-1234-123456789abc',
        userDefinedData: '0x0',
        endpointType: 'https',
        endpoint: 'https://endpoint',
        scope: 'scope',
        sessionId: '',
        appName: '',
        logoBase64: '',
        header: '',
        userIdType: 'uuid',
        devMode: false,
        disclosures: {},
        version: 1,
        deeplinkCallback: '',
      },
    });
  });

  it('uses resolver to fetch ofac and commitment trees', async () => {
    // Mock the stateless generator to assert resolver behavior
    const genMock = jest.fn((secret, passportData, selfApp, getTree) => {
      const ofac = getTree('passport', 'ofac');
      const commit = getTree('passport', 'commitment');
      expect(ofac).toEqual({
        passportNoAndNationality: { root: ['pp'] },
        nameAndDob: { root: ['dob'] },
        nameAndYob: { root: ['yob'] },
      });
      expect(commit).toBe('[[]]');
      return {
        inputs: { s: 1 },
        circuitName: 'vc_and_disclose',
        endpointType: 'https',
        endpoint: 'https://dis',
      };
    });
    jest.doMock('@selfxyz/common/utils/circuits/registerInputs', () => ({
      generateTEEInputsDiscloseStateless: genMock,
      generateTEEInputsRegister: jest.fn(),
      generateTEEInputsDSC: jest.fn(),
    }));

    // Act (reload module after doMock)
    let store: any;
    let protocolStore: any;
    jest.isolateModules(() => {
      // require after mocks are in place
      const mod = require('@/utils/proving/provingMachine');
      const {
        useProtocolStore: isolatedProtocolStore,
      } = require('@selfxyz/mobile-sdk-alpha/stores');
      store = mod.useProvingStore;
      protocolStore = isolatedProtocolStore;

      // Set protocol store state inside isolateModules
      protocolStore.setState({
        passport: {
          dsc_tree: 'tree',
          csca_tree: [[new Uint8Array([1])]],
          commitment_tree: '[[]]',
          deployed_circuits: null,
          circuits_dns_mapping: null,
          alternative_csca: {},
          ofac_trees: {
            passportNoAndNationality: { root: ['pp'] },
            nameAndDob: { root: ['dob'] },
            nameAndYob: { root: ['yob'] },
          },
          fetch_deployed_circuits: jest.fn(),
          fetch_circuits_dns_mapping: jest.fn(),
          fetch_csca_tree: jest.fn(),
          fetch_dsc_tree: jest.fn(),
          fetch_identity_tree: jest.fn(),
          fetch_alternative_csca: jest.fn(),
          fetch_ofac_trees: jest.fn(),
          fetch_all: jest.fn(),
        },
        id_card: {
          commitment_tree: null,
          dsc_tree: null,
          csca_tree: null,
          deployed_circuits: null,
          circuits_dns_mapping: null,
          alternative_csca: {},
          ofac_trees: null,
          fetch_deployed_circuits: jest.fn(),
          fetch_circuits_dns_mapping: jest.fn(),
          fetch_csca_tree: jest.fn(),
          fetch_dsc_tree: jest.fn(),
          fetch_identity_tree: jest.fn(),
          fetch_alternative_csca: jest.fn(),
          fetch_ofac_trees: jest.fn(),
          fetch_all: jest.fn(),
        },
      } as any);

      // Set proving store state inside isolateModules so it affects the isolated store instance
      store.setState({
        circuitType: 'disclose',
        passportData: {
          documentCategory: 'passport',
          mock: false,
          dsc_parsed: { authorityKeyIdentifier: 'abcd' },
          passportMetadata: {
            signatureAlgorithm: 'rsa_pss_rsae_sha256',
            signedAttrHashFunction: 'sha256',
            issuer: 'X',
            validFrom: new Date('2020-01-01'),
            validTo: new Date('2030-01-01'),
          },
          mrz: 'P<UTO...MOCKMRZ...',
          eContent: [],
          signedAttr: [],
          encryptedDigest: [],
        } as any,
        secret: 'sec',
        uuid: 'uuid-123',
        sharedKey: Buffer.alloc(32, 1),
        env: 'prod',
      });
    });
    const payload = await store.getState()._generatePayload(selfClient);

    // Assert
    expect(genMock).toHaveBeenCalled();
    expect(store.getState().endpointType).toBe('https');
    expect(payload.params).toEqual({
      uuid: 'uuid-123',
      nonce: [0],
      cipher_text: [1],
      auth_tag: [2],
    });
  });

  it('throws when commitment tree is missing', async () => {
    const genMock = jest.fn((secret, passportData, selfApp, getTree) => {
      // This should throw inside resolver when requesting commitment
      getTree('passport', 'commitment');
      return {
        inputs: {},
        circuitName: '',
        endpointType: 'https',
        endpoint: '',
      };
    });
    jest.doMock('@selfxyz/common/utils/circuits/registerInputs', () => ({
      generateTEEInputsDiscloseStateless: genMock,
      generateTEEInputsRegister: jest.fn(),
      generateTEEInputsDSC: jest.fn(),
    }));

    let store: any;
    let protocolStore: any;
    jest.isolateModules(() => {
      const mod = require('@/utils/proving/provingMachine');
      const {
        useProtocolStore: isolatedProtocolStore,
      } = require('@selfxyz/mobile-sdk-alpha/stores');
      store = mod.useProvingStore;
      protocolStore = isolatedProtocolStore;

      // Set protocol store state inside isolateModules - missing commitment tree
      protocolStore.setState({
        passport: {
          dsc_tree: 'tree',
          csca_tree: [[new Uint8Array([1])]],
          commitment_tree: null,
          deployed_circuits: null,
          circuits_dns_mapping: null,
          alternative_csca: {},
          ofac_trees: {
            passportNoAndNationality: { root: ['pp'] },
            nameAndDob: { root: ['dob'] },
            nameAndYob: { root: ['yob'] },
          },
          fetch_deployed_circuits: jest.fn(),
          fetch_circuits_dns_mapping: jest.fn(),
          fetch_csca_tree: jest.fn(),
          fetch_dsc_tree: jest.fn(),
          fetch_identity_tree: jest.fn(),
          fetch_alternative_csca: jest.fn(),
          fetch_ofac_trees: jest.fn(),
          fetch_all: jest.fn(),
        },
        id_card: {} as any,
      } as any);

      // Set store state inside isolateModules so it affects the isolated store instance
      store.setState({
        circuitType: 'disclose',
        passportData: {
          documentCategory: 'passport',
          mock: false,
          dsc_parsed: { authorityKeyIdentifier: 'abcd' },
          passportMetadata: {
            signatureAlgorithm: 'rsa_pss_rsae_sha256',
            signedAttrHashFunction: 'sha256',
            issuer: 'X',
            validFrom: new Date('2020-01-01'),
            validTo: new Date('2030-01-01'),
          },
          mrz: 'P<UTO...MOCKMRZ...',
          eContent: [],
          signedAttr: [],
          encryptedDigest: [],
        } as any,
        secret: 'sec',
        uuid: 'uuid-123',
        sharedKey: Buffer.alloc(32, 1),
        env: 'prod',
      });
    });
    await expect(store.getState()._generatePayload(selfClient)).rejects.toThrow(
      'Commitment tree not loaded',
    );
  });

  it('throws when OFAC trees are missing', async () => {
    const genMock = jest.fn((secret, passportData, selfApp, getTree) => {
      const ofac = getTree('passport', 'ofac');
      if (!ofac) {
        throw new Error('OFAC trees not loaded');
      }
      return {
        inputs: {},
        circuitName: '',
        endpointType: 'https',
        endpoint: '',
      };
    });
    jest.doMock('@selfxyz/common/utils/circuits/registerInputs', () => ({
      generateTEEInputsDiscloseStateless: genMock,
      generateTEEInputsRegister: jest.fn(),
      generateTEEInputsDSC: jest.fn(),
    }));

    let store: any;
    let protocolStore: any;
    jest.isolateModules(() => {
      const mod = require('@/utils/proving/provingMachine');
      const {
        useProtocolStore: isolatedProtocolStore,
      } = require('@selfxyz/mobile-sdk-alpha/stores');
      store = mod.useProvingStore;
      protocolStore = isolatedProtocolStore;

      // Set protocol store state inside isolateModules - missing OFAC trees
      protocolStore.setState({
        passport: {
          dsc_tree: 'tree',
          csca_tree: [[new Uint8Array([1])]],
          commitment_tree: '[[]]',
          deployed_circuits: null,
          circuits_dns_mapping: null,
          alternative_csca: {},
          ofac_trees: null,
          fetch_deployed_circuits: jest.fn(),
          fetch_circuits_dns_mapping: jest.fn(),
          fetch_csca_tree: jest.fn(),
          fetch_dsc_tree: jest.fn(),
          fetch_identity_tree: jest.fn(),
          fetch_alternative_csca: jest.fn(),
          fetch_ofac_trees: jest.fn(),
          fetch_all: jest.fn(),
        },
        id_card: {} as any,
      } as any);

      // Set store state inside isolateModules so it affects the isolated store instance
      store.setState({
        circuitType: 'disclose',
        passportData: {
          documentCategory: 'passport',
          mock: false,
          dsc_parsed: { authorityKeyIdentifier: 'abcd' },
          passportMetadata: {
            signatureAlgorithm: 'rsa_pss_rsae_sha256',
            signedAttrHashFunction: 'sha256',
            issuer: 'X',
            validFrom: new Date('2020-01-01'),
            validTo: new Date('2030-01-01'),
          },
          mrz: 'P<UTO...MOCKMRZ...',
          eContent: [],
          signedAttr: [],
          encryptedDigest: [],
        } as any,
        secret: 'sec',
        uuid: 'uuid-123',
        sharedKey: Buffer.alloc(32, 1),
        env: 'prod',
      });
    });
    await expect(store.getState()._generatePayload(selfClient)).rejects.toThrow(
      'OFAC trees not loaded',
    );
  });
});
