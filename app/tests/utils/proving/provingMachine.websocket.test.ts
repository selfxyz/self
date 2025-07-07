// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

import { useProvingStore } from '../../../src/utils/proving/provingMachine';

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate') as any;
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

jest.mock('../../../src/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid') }));

jest.mock('../../../src/utils/proving/attest', () => ({
  getPublicKey: jest.fn(() => '04' + 'a'.repeat(128)),
  verifyAttestation: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../../src/utils/proving/provingUtils', () => ({
  ec: { keyFromPublic: jest.fn(() => ({ getPublic: jest.fn() })) },
  clientKey: { derive: jest.fn(() => ({ toArray: () => Array(32).fill(1) })) },
  clientPublicKeyHex: '00',
}));

jest.mock('../../../src/providers/passportDataProvider', () => ({
  loadSelectedDocument: jest.fn(() =>
    Promise.resolve({ data: { documentCategory: 'passport', mock: false } }),
  ),
}));

jest.mock('../../../src/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(() => Promise.resolve('sec')),
}));

const { actorMock } = require('./actorMock');

const { verifyAttestation } = require('../../../src/utils/proving/attest');

describe('websocket handlers', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useProvingStore.setState({
      wsConnection: {
        send: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      } as any,
    });
    await useProvingStore.getState().init('register');
    useProvingStore.setState({
      wsConnection: {
        send: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      } as any,
    });
  });

  it('_handleWsOpen sends hello', () => {
    useProvingStore.getState()._handleWsOpen();
    const ws = useProvingStore.getState().wsConnection as any;
    expect(ws.send).toHaveBeenCalled();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.params.uuid).toBe('uuid');
    expect(useProvingStore.getState().uuid).toBe('uuid');
  });

  it('_handleWebSocketMessage processes attestation', async () => {
    const message = new MessageEvent('message', {
      data: JSON.stringify({ result: { attestation: 'a' } }),
    });
    await useProvingStore.getState()._handleWebSocketMessage(message);
    expect(verifyAttestation).toHaveBeenCalled();
    expect(
      actorMock.send.mock.calls.some(
        (c: any) => c[0].type === 'CONNECT_SUCCESS',
      ),
    ).toBe(true);
  });

  it('_handleWebSocketMessage handles error', async () => {
    const message = new MessageEvent('message', {
      data: JSON.stringify({ error: 'oops' }),
    });
    await useProvingStore.getState()._handleWebSocketMessage(message);
    const lastCall = actorMock.send.mock.calls.pop();
    expect(lastCall[0]).toEqual({ type: 'PROVE_ERROR' });
  });

  it('_handleWsClose triggers failure during proving', () => {
    useProvingStore.setState({ currentState: 'proving' });
    const event: any = { code: 1000, reason: '', type: 'close' };
    useProvingStore.getState()._handleWsClose(event);
    const last = actorMock.send.mock.calls.pop();
    expect(last[0]).toEqual({ type: 'PROVE_ERROR' });
  });
});
