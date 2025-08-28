// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useProtocolStore } from '@/stores/protocolStore';
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

const {
  getPayload,
  encryptAES256GCM,
} = require('@selfxyz/common/utils/proving');
const {
  generateTEEInputsRegister,
  generateTEEInputsDSC,
  generateTEEInputsDisclose,
} = require('@/utils/proving/provingInputs');

describe('_generatePayload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProvingStore.setState({
      circuitType: 'register',
      passportData: { documentCategory: 'passport', mock: false },
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
        csca_tree: [['a']],
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
