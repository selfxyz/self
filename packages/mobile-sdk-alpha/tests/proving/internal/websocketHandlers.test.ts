// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../../src';
import * as documentUtils from '../../../src/documents/utils';
import { useProvingStore } from '../../../src/proving/provingMachine';
import { useProtocolStore } from '../../../src/stores/protocolStore';
import { useSelfAppStore } from '../../../src/stores/selfAppStore';
import { actorMock } from '../actorMock';

vitest.mock('uuid', () => ({
  v4: vitest.fn(() => 'uuid-123'),
}));

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

vitest.mock('@selfxyz/common/utils/attest', () => {
  return {
    validatePKIToken: vitest.fn(() => ({
      userPubkey: Buffer.from('abcd', 'hex'),
      serverPubkey: 'server-key',
      imageHash: 'hash',
      verified: true,
    })),
    checkPCR0Mapping: vitest.fn(async () => true),
  };
});

vitest.mock('@selfxyz/common/utils/proving', async () => {
  const actual = await vitest.importActual<typeof import('@selfxyz/common/utils/proving')>(
    '@selfxyz/common/utils/proving',
  );
  return {
    ...actual,
    clientPublicKeyHex: 'abcd',
    clientKey: {
      derive: vitest.fn(() => ({
        toArray: () => Array(32).fill(7),
      })),
    },
    ec: {
      keyFromPublic: vitest.fn(() => ({
        getPublic: vitest.fn(() => 'server-public'),
      })),
    },
  };
});

describe('websocket handlers (refactor guardrail via proving store)', () => {
  const selfClient: SelfClient = {
    trackEvent: vitest.fn(),
    emit: vitest.fn(),
    logProofEvent: vitest.fn(),
    getPrivateKey: vitest.fn().mockResolvedValue('secret'),
    getSelfAppState: () => useSelfAppStore.getState(),
    getProvingState: () => useProvingStore.getState(),
    getProtocolState: () => useProtocolStore.getState(),
  } as unknown as SelfClient;
  let loadSelectedDocumentSpy: any;

  beforeEach(() => {
    vitest.clearAllMocks();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    useSelfAppStore.setState({ selfApp: null, sessionId: null, socket: null });
    if (!loadSelectedDocumentSpy) {
      loadSelectedDocumentSpy = vitest.spyOn(documentUtils, 'loadSelectedDocument');
    }
    loadSelectedDocumentSpy.mockResolvedValue({
      data: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'aki' },
      } as any,
    } as any);
  });

  it('does nothing when actor is missing or wsConnection is null', () => {
    useProvingStore.setState({ wsConnection: null } as any);

    useProvingStore.getState()._handleWsOpen(selfClient);

    expect(actorMock.send).not.toHaveBeenCalled();
  });

  it('does nothing when wsConnection is null even if actor exists', async () => {
    await useProvingStore.getState().init(selfClient, 'register');
    actorMock.send.mockClear();
    useProvingStore.setState({ wsConnection: null } as any);

    useProvingStore.getState()._handleWsOpen(selfClient);

    expect(actorMock.send).not.toHaveBeenCalled();
  });

  it('sends hello message and stores uuid on open', async () => {
    const wsConnection = {
      send: vitest.fn(),
    } as unknown as WebSocket;

    await useProvingStore.getState().init(selfClient, 'register');
    useProvingStore.setState({ wsConnection });

    useProvingStore.getState()._handleWsOpen(selfClient);

    expect(useProvingStore.getState().uuid).toBe('uuid-123');
    const [sentMessage] = (wsConnection.send as unknown as { mock: { calls: string[][] } }).mock.calls[0];
    const parsedMessage = JSON.parse(sentMessage);
    expect(parsedMessage).toMatchObject({
      jsonrpc: '2.0',
      method: 'openpassport_hello',
      id: 1,
      params: {
        uuid: 'uuid-123',
        user_pubkey: expect.any(Array),
      },
    });
  });

  it('handles attestation messages by deriving shared key and emitting CONNECT_SUCCESS', async () => {
    const { clientPublicKeyHex } = await import('@selfxyz/common/utils/proving');
    const { validatePKIToken } = await import('@selfxyz/common/utils/attest');

    await useProvingStore.getState().init(selfClient, 'register');
    useProvingStore.setState({ currentState: 'init_tee_connexion' } as any);

    const event = { data: JSON.stringify({ result: { attestation: [1, 2, 3] } }) } as MessageEvent;

    await useProvingStore.getState()._handleWebSocketMessage(event, selfClient);

    expect(clientPublicKeyHex).toBe('abcd');
    expect(validatePKIToken).toHaveBeenCalled();
    expect(useProvingStore.getState().sharedKey).toEqual(Buffer.from(Array(32).fill(7)));
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'CONNECT_SUCCESS' });
  });

  it('starts socket listener on hello ack', async () => {
    await useProvingStore.getState().init(selfClient, 'register');
    const startListener = vitest.fn();
    useProvingStore.setState({
      endpointType: 'https',
      uuid: 'uuid-123',
      _startSocketIOStatusListener: startListener,
    } as any);

    const event = new MessageEvent('message', {
      data: JSON.stringify({ id: 2, result: 'status-uuid' }),
    });

    await useProvingStore.getState()._handleWebSocketMessage(event, selfClient);

    expect(startListener).toHaveBeenCalledWith('status-uuid', 'https', selfClient);
  });

  it('uses hello ack uuid when it differs from stored uuid', async () => {
    await useProvingStore.getState().init(selfClient, 'register');
    const startListener = vitest.fn();
    useProvingStore.setState({
      endpointType: 'https',
      uuid: 'uuid-123',
      _startSocketIOStatusListener: startListener,
    } as any);

    const event = new MessageEvent('message', {
      data: JSON.stringify({ id: 2, result: 'uuid-456' }),
    });

    await useProvingStore.getState()._handleWebSocketMessage(event, selfClient);

    expect(startListener).toHaveBeenCalledWith('uuid-456', 'https', selfClient);
  });

  it('emits PROVE_ERROR on websocket error payloads', async () => {
    await useProvingStore.getState().init(selfClient, 'register');

    const event = new MessageEvent('message', {
      data: JSON.stringify({ error: 'bad' }),
    });

    await useProvingStore.getState()._handleWebSocketMessage(event, selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_ERROR' });
  });

  it.each([
    { state: 'init_tee_connexion', expected: 'PROVE_ERROR' },
    { state: 'proving', expected: 'PROVE_ERROR' },
    { state: 'listening_for_status', expected: 'PROVE_ERROR' },
  ])('emits $expected when websocket closes during $state', async ({ state, expected }) => {
    await useProvingStore.getState().init(selfClient, 'register');
    useProvingStore.setState({ currentState: state } as any);

    const event = { code: 1000, reason: 'closed' } as CloseEvent;

    useProvingStore.getState()._handleWsClose(event, selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: expected });
  });

  it.each([
    { state: 'init_tee_connexion', expected: 'PROVE_ERROR' },
    { state: 'proving', expected: 'PROVE_ERROR' },
  ])('emits $expected when websocket errors during $state', async ({ state, expected }) => {
    await useProvingStore.getState().init(selfClient, 'register');
    useProvingStore.setState({ currentState: state } as any);

    useProvingStore.getState()._handleWsError(new Event('error'), selfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: expected });
  });
});
