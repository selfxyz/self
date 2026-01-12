// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../../src';
import { useProvingStore } from '../../../src/proving/provingMachine';
import { useProtocolStore } from '../../../src/stores/protocolStore';
import { useSelfAppStore } from '../../../src/stores/selfAppStore';
import { actorMock } from '../actorMock';

vitest.mock('xstate', () => {
  return {
    createActor: vitest.fn(() => actorMock),
    createMachine: vitest.fn(),
    assign: vitest.fn(),
    send: vitest.fn(),
    spawn: vitest.fn(),
    interpret: vitest.fn(),
    fromPromise: vitest.fn(),
    fromObservable: vitest.fn(),
    fromEventObservable: vitest.fn(),
    fromCallback: vitest.fn(),
    fromTransition: vitest.fn(),
    fromReducer: vitest.fn(),
    fromRef: vitest.fn(),
  };
});

vitest.mock('@selfxyz/common/utils/proving', async () => {
  const actual = await vitest.importActual<typeof import('@selfxyz/common/utils/proving')>(
    '@selfxyz/common/utils/proving',
  );
  return {
    ...actual,
    getPayload: vitest.fn(() => ({ payload: true })),
    encryptAES256GCM: vitest.fn(() => ({
      nonce: [1],
      cipher_text: [2],
      auth_tag: [3],
    })),
  };
});

vitest.mock('@selfxyz/common/utils/circuits/registerInputs', async () => {
  const actual = (await vitest.importActual('@selfxyz/common/utils/circuits/registerInputs')) as any;
  return {
    ...actual,
    generateTEEInputsRegister: vitest.fn(async () => ({
      inputs: { reg: true },
      circuitName: 'register_circuit',
      endpointType: 'celo',
      endpoint: 'https://register',
    })),
    generateTEEInputsDSC: vitest.fn(() => ({
      inputs: { dsc: true },
      circuitName: 'dsc_circuit',
      endpointType: 'celo',
      endpoint: 'https://dsc',
    })),
    generateTEEInputsDiscloseStateless: vitest.fn(() => ({
      inputs: { disclose: true },
      circuitName: 'disclose_circuit',
      endpointType: 'https',
      endpoint: 'https://disclose',
    })),
  };
});

describe('payload generator (refactor guardrail via _generatePayload)', () => {
  const selfClient: SelfClient = {
    trackEvent: vitest.fn(),
    emit: vitest.fn(),
    logProofEvent: vitest.fn(),
    getPrivateKey: vitest.fn(),
    getSelfAppState: () => useSelfAppStore.getState(),
    getProvingState: () => useProvingStore.getState(),
    getProtocolState: () => useProtocolStore.getState(),
  } as unknown as SelfClient;

  beforeEach(() => {
    vitest.clearAllMocks();
    useSelfAppStore.setState({
      selfApp: {
        chainID: 42220,
        userId: '12345678-1234-1234-1234-123456789abc',
        userDefinedData: '0x0',
        selfDefinedData: '',
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

  it('builds a submit request payload with the encrypted payload', async () => {
    useProvingStore.setState({
      circuitType: 'register',
      passportData: { documentCategory: 'passport', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    const payload = await useProvingStore.getState()._generatePayload(selfClient);

    expect(payload).toEqual({
      jsonrpc: '2.0',
      method: 'openpassport_submit_request',
      id: 2,
      params: {
        uuid: 'uuid-123',
        nonce: [1],
        cipher_text: [2],
        auth_tag: [3],
      },
    });
  });

  it('throws when dsc is requested for aadhaar documents', async () => {
    useProvingStore.setState({
      circuitType: 'dsc',
      passportData: { documentCategory: 'aadhaar', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await expect(useProvingStore.getState()._generatePayload(selfClient)).rejects.toThrow(
      'DSC circuit type is not supported for Aadhaar documents',
    );
  });

  it('throws when disclose circuit is requested without a SelfApp', async () => {
    useSelfAppStore.setState({ selfApp: null });
    useProvingStore.setState({
      circuitType: 'disclose',
      passportData: { documentCategory: 'passport', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await expect(useProvingStore.getState()._generatePayload(selfClient)).rejects.toThrow(
      'SelfApp context not initialized',
    );
  });

  it('throws on invalid circuit types', async () => {
    useProvingStore.setState({
      circuitType: 'invalid' as any,
      passportData: { documentCategory: 'passport', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await expect(useProvingStore.getState()._generatePayload(selfClient)).rejects.toThrow(
      'Invalid circuit type:invalid',
    );
  });

  it('uses register_id for id cards', async () => {
    const { getPayload } = await import('@selfxyz/common/utils/proving');

    useProvingStore.setState({
      circuitType: 'register',
      passportData: { documentCategory: 'id_card', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await useProvingStore.getState()._generatePayload(selfClient);

    expect(getPayload).toHaveBeenCalledWith(
      { reg: true },
      'register_id',
      'register_circuit',
      'celo',
      'https://register',
      1,
      expect.any(String),
      '',
    );
  });

  it('keeps dsc circuit type for passport documents', async () => {
    const { getPayload } = await import('@selfxyz/common/utils/proving');

    useProvingStore.setState({
      circuitType: 'dsc',
      passportData: { documentCategory: 'passport', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await useProvingStore.getState()._generatePayload(selfClient);

    expect(getPayload).toHaveBeenCalledWith(
      { dsc: true },
      'dsc',
      'dsc_circuit',
      'celo',
      'https://dsc',
      1,
      expect.any(String),
      '',
    );
  });

  it('always uses disclose for disclosure flows', async () => {
    const { getPayload } = await import('@selfxyz/common/utils/proving');

    useProvingStore.setState({
      circuitType: 'disclose',
      passportData: { documentCategory: 'passport', mock: false } as any,
      secret: 'secret',
      uuid: 'uuid-123',
      sharedKey: Buffer.alloc(32, 1),
      env: 'prod',
    });

    await useProvingStore.getState()._generatePayload(selfClient);

    expect(getPayload).toHaveBeenCalledWith(
      { disclose: true },
      'disclose',
      'disclose_circuit',
      'https',
      'https://disclose',
      1,
      expect.any(String),
      '',
    );
  });
});
