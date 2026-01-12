// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Unit tests for WebSocket message handling
 * Tests real business logic without mocking
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProvingStore } from '../../../src/proving/provingMachine';

vi.mock('../../../src/constants/analytics', () => ({
  ProofEvents: {
    CONNECTION_UUID_GENERATED: 'CONNECTION_UUID_GENERATED',
    WS_HELLO_ACK: 'WS_HELLO_ACK',
    WS_HELLO_SENT: 'WS_HELLO_SENT',
    SOCKETIO_CONN_STARTED: 'SOCKETIO_CONN_STARTED',
    SOCKETIO_SUBSCRIBED: 'SOCKETIO_SUBSCRIBED',
    SOCKETIO_STATUS_RECEIVED: 'SOCKETIO_STATUS_RECEIVED',
    SOCKETIO_PROOF_FAILURE: 'SOCKETIO_PROOF_FAILURE',
    SOCKETIO_PROOF_SUCCESS: 'SOCKETIO_PROOF_SUCCESS',
    REGISTER_COMPLETED: 'REGISTER_COMPLETED',
    PROOF_FAILED: 'PROOF_FAILED',
  },
  PassportEvents: {},
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
    PROVING_PASSPORT_DATA_NOT_FOUND: 'PROVING_PASSPORT_DATA_NOT_FOUND',
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

const mockActor = {
  send: vi.fn(),
  getSnapshot: vi.fn(() => ({ value: 'ready_to_prove' })),
  stop: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  start: vi.fn(),
};

vi.mock('xstate', () => ({
  createActor: vi.fn(() => mockActor),
  createMachine: vi.fn(() => ({})),
}));

describe('websocketHandlers', () => {
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

  beforeEach(async () => {
    vi.clearAllMocks();

    useProvingStore.setState({
      socketConnection: null,
      error_code: null,
      reason: null,
      circuitType: 'register',
    } as any);

    const store = useProvingStore.getState();
    await store.init(mockSelfClient, 'register', true);

    useProvingStore.setState({
      endpointType: 'https',
      uuid: 'stored-uuid',
    } as any);
  });

  it('uses the received UUID from hello-ack when starting Socket.IO listener', async () => {
    const store = useProvingStore.getState();
    const startListenerSpy = vi.spyOn(store, '_startSocketIOStatusListener');

    const message = new MessageEvent('message', {
      data: JSON.stringify({ id: 2, result: 'received-uuid' }),
    });

    await store._handleWebSocketMessage(message, mockSelfClient);

    expect(startListenerSpy).toHaveBeenCalledWith('received-uuid', 'https', mockSelfClient);
  });
});
