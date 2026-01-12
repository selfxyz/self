// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { EventEmitter } from 'events';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProvingStore } from '../../../src/proving/provingMachine';
import { actorMock } from '../actorMock';

vi.mock('socket.io-client');
vi.mock('../../../src/constants/analytics', () => ({
  ProofEvents: {
    SOCKETIO_CONN_STARTED: 'SOCKETIO_CONN_STARTED',
    SOCKETIO_SUBSCRIBED: 'SOCKETIO_SUBSCRIBED',
    SOCKETIO_STATUS_RECEIVED: 'SOCKETIO_STATUS_RECEIVED',
    SOCKETIO_PROOF_FAILURE: 'SOCKETIO_PROOF_FAILURE',
    SOCKETIO_PROOF_SUCCESS: 'SOCKETIO_PROOF_SUCCESS',
    REGISTER_COMPLETED: 'REGISTER_COMPLETED',
  },
  PassportEvents: {},
}));

vi.mock('../../../src/proving/internal/logging', () => ({
  logProofEvent: vi.fn(),
  createProofContext: vi.fn(() => ({})),
}));
vi.mock('@selfxyz/common/utils/proving', () => ({
  getWSDbRelayerUrl: vi.fn(() => 'ws://test-url'),
  getPayload: vi.fn(),
  encryptAES256GCM: vi.fn(),
  clientKey: {},
  clientPublicKeyHex: 'test-key',
  ec: {},
}));

vi.mock('../../../src/documents/utils', () => ({
  loadSelectedDocument: vi.fn(() =>
    Promise.resolve({
      data: { mockData: true },
      version: '1.0.0',
    }),
  ),
  hasAnyValidRegisteredDocument: vi.fn(() => Promise.resolve(true)),
  clearPassportData: vi.fn(),
  markCurrentDocumentAsRegistered: vi.fn(),
  reStorePassportDataWithRightCSCA: vi.fn(),
}));

vi.mock('../../../src/types/events', () => ({
  SdkEvents: {
    PASSPORT_DATA_NOT_FOUND: 'PASSPORT_DATA_NOT_FOUND',
  },
}));

vi.mock('@selfxyz/common/utils', () => ({
  getCircuitNameFromPassportData: vi.fn(() => 'register'),
  getSolidityPackedUserContextData: vi.fn(() => '0x123'),
}));

vi.mock('@selfxyz/common/utils/attest', () => ({
  getPublicKey: vi.fn(),
  verifyAttestation: vi.fn(),
}));

vi.mock('@selfxyz/common/utils/circuits/registerInputs', () => ({
  generateTEEInputsDSC: vi.fn(),
  generateTEEInputsRegister: vi.fn(),
}));

vi.mock('@selfxyz/common/utils/passports/validate', () => ({
  checkDocumentSupported: vi.fn(() => Promise.resolve(true)),
  checkIfPassportDscIsInTree: vi.fn(() => Promise.resolve(true)),
  isDocumentNullified: vi.fn(() => Promise.resolve(false)),
  isUserRegistered: vi.fn(() => Promise.resolve(false)),
  isUserRegisteredWithAlternativeCSCA: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('xstate', () => ({
  createActor: vi.fn(() => actorMock),
  createMachine: vi.fn(() => ({})),
}));

describe('Socket.IO status handler wiring', () => {
  const mockSelfClient = {
    trackEvent: vi.fn(),
    emit: vi.fn(),
    getPrivateKey: vi.fn(() => Promise.resolve('mock-private-key')),
    logProofEvent: vi.fn(),
    getSelfAppState: () => ({
      selfApp: {},
    }),
    getProtocolState: () => ({
      isUserLoggedIn: true,
    }),
    getProvingState: () => useProvingStore.getState(),
  } as any;

  let mockSocket: EventEmitter & Partial<Socket>;
  let socketIoMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    useProvingStore.setState({
      socketConnection: null,
      error_code: null,
      reason: null,
      circuitType: 'register',
    } as any);

    mockSocket = new EventEmitter() as EventEmitter & Partial<Socket>;
    vi.spyOn(mockSocket as any, 'emit');
    mockSocket.disconnect = vi.fn();

    const socketIo = await import('socket.io-client');
    socketIoMock = vi.mocked(socketIo.default || socketIo);
    socketIoMock.mockReturnValue(mockSocket);

    const store = useProvingStore.getState();
    await store.init(mockSelfClient, 'register', true);
    actorMock.send.mockClear();
  });

  it('applies success updates and emits PROVE_SUCCESS', async () => {
    const store = useProvingStore.getState();
    store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

    await new Promise(resolve => setImmediate(resolve));

    (mockSocket as any).emit('status', { status: 4 });

    const finalState = useProvingStore.getState();
    expect(finalState.socketConnection).toBe(null);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_SUCCESS' });
  });

  it('applies failure updates and emits PROVE_FAILURE', async () => {
    const store = useProvingStore.getState();
    store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

    await new Promise(resolve => setImmediate(resolve));

    (mockSocket as any).emit('status', {
      status: 5,
      error_code: 'E001',
      reason: 'TEE failed',
    });

    const finalState = useProvingStore.getState();
    expect(finalState.error_code).toBe('E001');
    expect(finalState.reason).toBe('TEE failed');
    expect(finalState.socketConnection).toBe(null);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_FAILURE' });
  });

  it('emits PROVE_ERROR without updating state for retryable errors', async () => {
    const store = useProvingStore.getState();
    store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

    await new Promise(resolve => setImmediate(resolve));

    (mockSocket as any).emit('status', '{"invalid": json}');

    const finalState = useProvingStore.getState();
    expect(finalState.socketConnection).toBe(mockSocket);
    expect(finalState.error_code).toBe(null);
    expect(finalState.reason).toBe(null);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PROVE_ERROR' });
  });
});
