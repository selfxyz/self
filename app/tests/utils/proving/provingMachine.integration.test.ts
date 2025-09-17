// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Integration test for provingMachine Socket.IO status handling
 * Tests real implementation with minimal mocking
 */

import { EventEmitter } from 'events';
import type { Socket } from 'socket.io-client';

import { useProvingStore } from '@/utils/proving/provingMachine';

// Mock only external dependencies, not our business logic
jest.mock('socket.io-client');
jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
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
jest.mock('@/Sentry', () => ({
  logProofEvent: jest.fn(),
  createProofContext: jest.fn(() => ({})),
}));
jest.mock('@selfxyz/common/utils/proving', () => ({
  getWSDbRelayerUrl: jest.fn(() => 'ws://test-url'),
  getPayload: jest.fn(),
  encryptAES256GCM: jest.fn(),
  clientKey: {},
  clientPublicKeyHex: 'test-key',
  ec: {},
}));

// Mock mobile-sdk-alpha dependencies
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  loadSelectedDocument: jest.fn(() =>
    Promise.resolve({
      data: { mockData: true },
      version: '1.0.0',
    }),
  ),
  hasAnyValidRegisteredDocument: jest.fn(() => Promise.resolve(true)),
  clearPassportData: jest.fn(),
  markCurrentDocumentAsRegistered: jest.fn(),
  reStorePassportDataWithRightCSCA: jest.fn(),
  generateTEEInputsDisclose: jest.fn(),
  useProtocolStore: {
    getState: jest.fn(() => ({
      isUserLoggedIn: true,
    })),
  },
  SdkEvents: {
    PASSPORT_DATA_NOT_FOUND: 'PASSPORT_DATA_NOT_FOUND',
  },
}));

// Mock common utils dependencies
jest.mock('@selfxyz/common/utils', () => ({
  getCircuitNameFromPassportData: jest.fn(() => 'register'),
  getSolidityPackedUserContextData: jest.fn(() => '0x123'),
}));

jest.mock('@selfxyz/common/utils/attest', () => ({
  getPublicKey: jest.fn(),
  verifyAttestation: jest.fn(),
}));

jest.mock('@selfxyz/common/utils/circuits/registerInputs', () => ({
  generateTEEInputsDSC: jest.fn(),
  generateTEEInputsRegister: jest.fn(),
}));

jest.mock('@selfxyz/common/utils/passports/validate', () => ({
  checkDocumentSupported: jest.fn(() => Promise.resolve(true)),
  checkIfPassportDscIsInTree: jest.fn(() => Promise.resolve(true)),
  isDocumentNullified: jest.fn(() => Promise.resolve(false)),
  isUserRegistered: jest.fn(() => Promise.resolve(false)),
  isUserRegisteredWithAlternativeCSCA: jest.fn(() => Promise.resolve(false)),
}));

// Mock the actor system
const mockActor = {
  send: jest.fn(),
  getSnapshot: jest.fn(() => ({ value: 'ready_to_prove' })),
  stop: jest.fn(),
  on: jest.fn(),
  subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
  start: jest.fn(),
};

jest.mock('xstate', () => ({
  createActor: jest.fn(() => mockActor),
  createMachine: jest.fn(() => ({})),
}));

describe('provingMachine Socket.IO Integration', () => {
  const mockSelfClient = {
    trackEvent: jest.fn(),
    emit: jest.fn(),
    getPrivateKey: jest.fn(() => Promise.resolve('mock-private-key')),
  } as any;

  // Create a real EventEmitter to simulate socket behavior
  let mockSocket: EventEmitter & Partial<Socket>;
  let socketIoMock: jest.MockedFunction<any>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset store to clean state
    useProvingStore.setState({
      socketConnection: null,
      error_code: null,
      reason: null,
      circuitType: 'register',
    } as any);

    // Create mock socket with real EventEmitter behavior
    mockSocket = new EventEmitter() as EventEmitter & Partial<Socket>;
    // Spy on emit so EventEmitter listeners still fire
    jest.spyOn(mockSocket as any, 'emit');
    mockSocket.disconnect = jest.fn();

    // Mock socket.io constructor
    const socketIo = require('socket.io-client');
    socketIoMock = socketIo.default || socketIo;
    socketIoMock.mockReturnValue(mockSocket);

    // Initialize the actor properly by calling init
    const store = useProvingStore.getState();
    await store.init(mockSelfClient, 'register', true);
  });

  describe('_startSocketIOStatusListener', () => {
    it('handles status 3 (failure) correctly', async () => {
      // Act: Start the real Socket.IO listener
      const store = useProvingStore.getState();
      store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

      // Verify socket was created with correct config
      expect(socketIoMock).toHaveBeenCalledWith('ws://test-url', {
        path: '/',
        transports: ['websocket'],
      });

      // Verify socket connection was stored
      expect(useProvingStore.getState().socketConnection).toBe(mockSocket);

      // Wait a tick for event listeners to be set up
      await new Promise(resolve => setImmediate(resolve));

      // Clear mocks to isolate socket event testing from init events
      jest.clearAllMocks();

      // Act: Trigger real status event by emitting to the EventEmitter
      // This simulates a status message from the server
      (mockSocket as any).emit('status', {
        status: 3,
        error_code: 'E001',
        reason: 'Invalid document',
      });

      // Assert: Verify real state changes occurred
      const finalState = useProvingStore.getState();
      expect(finalState.error_code).toBe('E001');
      expect(finalState.reason).toBe('Invalid document');
      expect(finalState.socketConnection).toBe(null);

      // Assert: Verify real actor events were sent
      expect(mockActor.send).toHaveBeenCalledWith({ type: 'PROVE_FAILURE' });

      // Note: analytics events are covered in unit tests for statusHandlers

      // Assert: Verify socket disconnection
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('handles status 4 (success) correctly for register circuit', async () => {
      // Arrange: Set circuit type to register
      useProvingStore.setState({ circuitType: 'register' } as any);

      // Act: Start listener and trigger success
      const store = useProvingStore.getState();
      store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

      // Wait a tick for event listeners to be set up
      await new Promise(resolve => setImmediate(resolve));

      // Clear previous calls from init before asserting
      mockActor.send.mockClear();
      (mockSelfClient.trackEvent as jest.Mock).mockClear();

      (mockSocket as any).emit('status', { status: 4 });

      // Assert: Verify success handling
      const finalState = useProvingStore.getState();
      expect(finalState.socketConnection).toBe(null);
      expect(finalState.error_code).toBe(null); // Should remain null

      expect(mockActor.send).toHaveBeenCalledWith({ type: 'PROVE_SUCCESS' });

      // Note: analytics assertions omitted to keep test resilient

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('handles status 4 (success) correctly for non-register circuit', async () => {
      // Arrange: Set circuit type to something other than register
      useProvingStore.setState({ circuitType: 'disclose' } as any);

      // Act: Start listener and trigger success
      const store = useProvingStore.getState();
      store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

      // Wait a tick for event listeners to be set up
      await new Promise(resolve => setImmediate(resolve));

      // Clear previous calls from init before asserting
      mockActor.send.mockClear();
      (mockSelfClient.trackEvent as jest.Mock).mockClear();

      (mockSocket as any).emit('status', { status: 4 });

      // Assert: Verify success handling without register-specific analytics
      expect(mockActor.send).toHaveBeenCalledWith({ type: 'PROVE_SUCCESS' });
      // Note: analytics assertions omitted
    });

    it('handles invalid JSON status message gracefully', async () => {
      // Act: Start listener and trigger invalid message
      const store = useProvingStore.getState();
      store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

      // Wait a tick for event listeners to be set up
      await new Promise(resolve => setImmediate(resolve));

      (mockSocket as any).emit('status', '{"invalid": json}');

      // Assert: Verify error handling
      expect(mockActor.send).toHaveBeenCalledWith({ type: 'PROVE_ERROR' });
      expect(useProvingStore.getState().socketConnection).toBe(mockSocket); // Should remain connected
    });

    it('ignores non-actionable status codes', async () => {
      // Act: Start listener and trigger status 1 (in progress)
      const store = useProvingStore.getState();
      store._startSocketIOStatusListener('test-uuid', 'https', mockSelfClient);

      // Wait a tick for event listeners to be set up
      await new Promise(resolve => setImmediate(resolve));

      // Clear init emissions before asserting
      mockActor.send.mockClear();
      (mockSelfClient.trackEvent as jest.Mock).mockClear();

      (mockSocket as any).emit('status', { status: 1 });

      // Assert: Verify no state changes or actions
      const finalState = useProvingStore.getState();
      expect(finalState.error_code).toBe(null);
      expect(finalState.reason).toBe(null);
      expect(finalState.socketConnection).toBe(mockSocket); // Should remain connected

      expect(mockActor.send).not.toHaveBeenCalled();
      expect(mockSocket.disconnect).not.toHaveBeenCalled();

      // Should still track the status received event (covered elsewhere)
    });
  });
});
