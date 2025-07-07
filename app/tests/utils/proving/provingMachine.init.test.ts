// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

import { useProvingStore } from '../../../src/utils/proving/provingMachine';
import { emitState } from './actorMock';

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate') as any;
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

jest.mock('../../../src/providers/passportDataProvider', () => ({
  loadSelectedDocument: jest.fn(),
}));

jest.mock('../../../src/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(),
}));

jest.mock('../../../src/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));

// Mock uuid v4 function
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid'),
}));

const {
  loadSelectedDocument,
} = require('../../../src/providers/passportDataProvider');
const { unsafe_getPrivateKey } = require('../../../src/providers/authProvider');
const { actorMock } = require('./actorMock');

describe('provingMachine init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProvingStore.setState({});

    // Mock WebSocket
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any;
    useProvingStore.setState({ wsConnection: mockWebSocket });
  });

  it('handles missing document', async () => {
    loadSelectedDocument.mockResolvedValue(null);
    await useProvingStore.getState().init('register');
    expect(actorMock.send).toHaveBeenCalledWith({
      type: 'PASSPORT_DATA_NOT_FOUND',
    });
    emitState('passport_data_not_found');
    expect(useProvingStore.getState().currentState).toBe(
      'passport_data_not_found',
    );
  });

  it('initializes state with document and secret', async () => {
    loadSelectedDocument.mockResolvedValue({
      data: { documentCategory: 'passport', mock: false },
    });
    unsafe_getPrivateKey.mockResolvedValue('mysecret');
    await useProvingStore.getState().init('register');
    expect(useProvingStore.getState().passportData).toEqual({
      documentCategory: 'passport',
      mock: false,
    });
    expect(useProvingStore.getState().secret).toBe('mysecret');
    expect(useProvingStore.getState().env).toBe('prod');
    expect(useProvingStore.getState().circuitType).toBe('register');
  });

  it('handles document loading error', async () => {
    loadSelectedDocument.mockRejectedValue(new Error('Network error'));
    await expect(useProvingStore.getState().init('register')).rejects.toThrow(
      'Network error',
    );
  });

  it('handles invalid document structure', async () => {
    loadSelectedDocument.mockResolvedValue({ data: null });
    await expect(useProvingStore.getState().init('register')).rejects.toThrow();
  });

  it('initializes state with document and secret for different circuit types', async () => {
    const circuitTypes = ['register', 'dsc', 'disclose'] as const;

    for (const circuitType of circuitTypes) {
      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      unsafe_getPrivateKey.mockResolvedValue('mysecret');

      await useProvingStore.getState().init(circuitType);

      expect(useProvingStore.getState().circuitType).toBe(circuitType);
      // Add more assertions for circuit-specific initialization
    }
  });

  it('_handleWsClose handles different close codes', () => {
    const closeCodes = [1000, 1001, 1006, 1011];
    closeCodes.forEach(code => {
      jest.clearAllMocks();
      useProvingStore.setState({ currentState: 'proving' });
      const event: any = { code, reason: `Close code ${code}`, type: 'close' };
      useProvingStore.getState()._handleWsClose(event);
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_ERROR' });
    });
  });

  it('_handleWsClose ignores close during non-proving states', () => {
    (['idle', 'completed', 'error'] as const).forEach(state => {
      jest.clearAllMocks();
      useProvingStore.setState({ currentState: state });
      const event: any = { code: 1000, reason: '', type: 'close' };
      useProvingStore.getState()._handleWsClose(event);
      expect(actorMock.send).not.toHaveBeenCalled();
    });
  });

  it('_handleWsOpen sends hello', () => {
    // Verify initial state
    expect(useProvingStore.getState().uuid).toBeNull();

    useProvingStore.getState()._handleWsOpen();
    const ws = useProvingStore.getState().wsConnection as any;
    expect(ws.send).toHaveBeenCalled();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);

    // Verify complete message structure
    expect(sent).toEqual({
      jsonrpc: '2.0',
      method: 'openpassport_hello',
      id: 1,
      params: {
        user_pubkey: expect.any(Array),
        uuid: 'uuid',
      },
    });
    expect(sent.params.uuid).toBe('uuid');
    expect(useProvingStore.getState().uuid).toBe('uuid');
  });

  it('_handleWebSocketMessage handles malformed JSON', async () => {
    const message = new MessageEvent('message', {
      data: 'invalid json{',
    });
    await useProvingStore.getState()._handleWebSocketMessage(message);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_ERROR' });
  });

  it('_handleWebSocketMessage handles missing attestation field', async () => {
    const message = new MessageEvent('message', {
      data: JSON.stringify({ result: {} }),
    });
    await useProvingStore.getState()._handleWebSocketMessage(message);
    // This should just log a warning, not send PROVE_ERROR
    expect(actorMock.send).not.toHaveBeenCalled();
  });
});
