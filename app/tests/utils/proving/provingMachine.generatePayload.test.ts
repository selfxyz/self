// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

import { useProtocolStore } from '../../../src/stores/protocolStore';
import { useSelfAppStore } from '../../../src/stores/selfAppStore';
import { useProvingStore } from '../../../src/utils/proving/provingMachine';

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate') as any;
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

jest.mock('../../../src/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@selfxyz/common', () => {
  const actual = jest.requireActual('@selfxyz/common') as any;
  return {
    ...actual,
    getSolidityPackedUserContextData: jest.fn(() => '0x1234'),
  };
});

jest.mock('../../../src/utils/proving/provingInputs', () => ({
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
  generateTEEInputsDisclose: jest.fn(() => ({
    inputs: { s: 1 },
    circuitName: 'vc_and_disclose',
    endpointType: 'https',
    endpoint: 'https://dis',
  })),
}));

jest.mock('../../../src/utils/proving/provingUtils', () => {
  const actual = jest.requireActual(
    '../../../src/utils/proving/provingUtils',
  ) as any;
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

const {
  getPayload,
  encryptAES256GCM,
} = require('../../../src/utils/proving/provingUtils');
const {
  generateTEEInputsRegister,
  generateTEEInputsDSC,
  generateTEEInputsDisclose,
} = require('../../../src/utils/proving/provingInputs');

function setupDefaultStores() {
  useProvingStore.setState({
    circuitType: 'register',
    passportData: { documentCategory: 'passport', mock: false },
    secret: 'sec',
    uuid: '123',
    sharedKey: Buffer.alloc(32, 1),
    env: 'prod',
  });

  useSelfAppStore.setState({
    selfApp: createMockSelfApp(),
  });

  useProtocolStore.setState({
    passport: createMockProtocolState(),
    id_card: createMockProtocolState(),
  });
}

function createMockSelfApp() {
  return {
    chainID: 42220 as const,
    userId: 'u',
    userDefinedData: '0x0',
    endpointType: 'https' as const,
    endpoint: 'https://e',
    scope: 's',
    sessionId: '',
    appName: '',
    logoBase64: '',
    header: '',
    userIdType: 'uuid' as const,
    devMode: false,
    disclosures: {},
    version: 1,
  };
}

function createMockProtocolState() {
  return {
    dsc_tree: 'tree',
    csca_tree: [['a']],
    commitment_tree: null,
    deployed_circuits: null,
    circuits_dns_mapping: null,
    alternative_csca: {},
    fetch_deployed_circuits: jest.fn(() => Promise.resolve()),
    fetch_circuits_dns_mapping: jest.fn(() => Promise.resolve()),
    fetch_csca_tree: jest.fn(() => Promise.resolve()),
    fetch_dsc_tree: jest.fn(() => Promise.resolve()),
    fetch_identity_tree: jest.fn(() => Promise.resolve()),
    fetch_alternative_csca: jest.fn(() => Promise.resolve()),
    fetch_all: jest.fn(() => Promise.resolve()),
  };
}

describe('_generatePayload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultStores();
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
    expect(generateTEEInputsDSC).toHaveBeenCalledWith(
      expect.objectContaining({
        documentCategory: 'passport',
        mock: false,
      }),
      [['a']], // csca_tree
      'prod', // env
    );
    expect(useProvingStore.getState().endpointType).toBe('celo');
    expect(payload.params.uuid).toBe('123');
    expect(payload.params).toEqual({
      uuid: '123',
      nonce: [0],
      cipher_text: [1],
      auth_tag: [2],
    });
  });

  it('disclose circuit', async () => {
    useProvingStore.setState({ circuitType: 'disclose' });
    const payload = await useProvingStore.getState()._generatePayload();
    expect(generateTEEInputsDisclose).toHaveBeenCalled();
    expect(useProvingStore.getState().endpointType).toBe('https');
    expect(payload.params.uuid).toBe('123');
  });

  it('handles missing passport data', async () => {
    useProvingStore.setState({ passportData: null });
    await expect(
      useProvingStore.getState()._generatePayload(),
    ).rejects.toThrow();
  });

  it('handles input generation failure', async () => {
    // Reset all mocks first
    jest.clearAllMocks();
    setupDefaultStores();

    generateTEEInputsRegister.mockImplementation(() => {
      throw new Error('Input generation failed');
    });
    await expect(useProvingStore.getState()._generatePayload()).rejects.toThrow(
      'Input generation failed',
    );

    // Restore the mock to its original implementation
    generateTEEInputsRegister.mockRestore();
  });

  it('handles encryption failure', async () => {
    // Reset all mocks first
    jest.clearAllMocks();
    setupDefaultStores();

    // Restore all original implementations first
    generateTEEInputsRegister.mockImplementation(() => ({
      inputs: { r: 1 },
      circuitName: 'reg',
      endpointType: 'celo',
      endpoint: 'https://reg',
    }));

    encryptAES256GCM.mockImplementation(() => {
      throw new Error('Encryption failed');
    });
    await expect(useProvingStore.getState()._generatePayload()).rejects.toThrow(
      'Encryption failed',
    );
  });
});
