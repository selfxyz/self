// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { io } from 'socket.io-client';
import { act } from '@testing-library/react-native';

import { database } from '@/stores/database';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { ProofStatus } from '@/stores/proofTypes';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock database
jest.mock('@/stores/database', () => ({
  database: {
    init: jest.fn(),
    insertProof: jest.fn(),
    updateProofStatus: jest.fn(),
    getHistory: jest.fn(),
    getPendingProofs: jest.fn(),
    updateStaleProofs: jest.fn(),
  },
}));

const mockDatabase = database as any;
const mockIo = io as any;

describe('proofHistoryStore', () => {
  let mockSocket: any;

  // Suppress console errors during testing to avoid cluttering output
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    act(() => {
      useProofHistoryStore.setState({
        proofHistory: [],
        isLoading: false,
        hasMore: true,
        currentPage: 1,
      });
    });

    mockSocket = {
      emit: jest.fn(),
      on: jest.fn().mockImplementation(function (this: any) {
        return this;
      }),
      timeout: jest.fn().mockImplementation(function (this: any) {
        return this;
      }),
      disconnect: jest.fn(),
      active: false,
      connected: false,
    };
    mockIo.mockReturnValue(mockSocket);
  });

  describe('initDatabase', () => {
    it('initializes database and loads initial data', async () => {
      const mockHistoryResult = {
        rows: [
          {
            id: '1',
            sessionId: 'session-123',
            appName: 'TestApp',
            endpointType: 'celo',
            status: ProofStatus.SUCCESS,
            errorCode: null,
            errorReason: null,
            timestamp: Date.now(),
            disclosures: '{"test": "data"}',
            logoBase64: 'base64-logo',
            userId: 'user-456',
            userIdType: 'uuid',
          },
        ],
        total_count: 1,
      };

      mockDatabase.init.mockResolvedValue();
      mockDatabase.getHistory.mockResolvedValue(mockHistoryResult);
      mockDatabase.getPendingProofs.mockResolvedValue({ rows: [] });

      await act(async () => {
        await useProofHistoryStore.getState().initDatabase();
      });

      expect(mockDatabase.init).toHaveBeenCalled();
      expect(mockDatabase.getHistory).toHaveBeenCalledWith(1);
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(1);
    });

    it('handles initialization errors gracefully', async () => {
      mockDatabase.init.mockRejectedValue(new Error('Database error'));

      await act(async () => {
        await useProofHistoryStore.getState().initDatabase();
      });

      expect(mockDatabase.init).toHaveBeenCalled();
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(0);
    });
  });

  describe('addProofHistory', () => {
    it('adds a new proof to the store', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'celo',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
        logoBase64: 'base64-logo',
      } as const;

      const mockInsertResult = {
        id: '1',
        timestamp: Date.now(),
        rowsAffected: 1,
      };

      mockDatabase.insertProof.mockResolvedValue(mockInsertResult);

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      expect(mockDatabase.insertProof).toHaveBeenCalledWith(mockProof);
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(1);
    });

    it('handles insertion errors gracefully', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'celo',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
      } as const;

      mockDatabase.insertProof.mockRejectedValue(new Error('Insert error'));

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      expect(mockDatabase.insertProof).toHaveBeenCalledWith(mockProof);
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(0);
    });

    it('handles duplicate insertion gracefully (rowsAffected = 0)', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'celo',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
      } as const;

      // Simulate INSERT OR IGNORE skipping the insertion due to duplicate sessionId
      const mockInsertResult = {
        id: '0',
        timestamp: Date.now(),
        rowsAffected: 0,
      };

      mockDatabase.insertProof.mockResolvedValue(mockInsertResult);

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      expect(mockDatabase.insertProof).toHaveBeenCalledWith(mockProof);
      // Should not add to store when rowsAffected is 0
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(0);
    });
  });

  describe('updateProofStatus', () => {
    it('updates proof status in database and store', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'celo',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
      } as const;

      mockDatabase.insertProof.mockResolvedValue({
        id: '1',
        timestamp: Date.now(),
        rowsAffected: 1,
      });

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      await act(async () => {
        await useProofHistoryStore
          .getState()
          .updateProofStatus(
            'session-123',
            ProofStatus.SUCCESS,
            'SUCCESS_001',
            'Operation completed',
          );
      });

      expect(mockDatabase.updateProofStatus).toHaveBeenCalledWith(
        ProofStatus.SUCCESS,
        'SUCCESS_001',
        'Operation completed',
        'session-123',
      );
    });

    it('handles status update errors gracefully', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'https',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
      } as const;

      mockDatabase.insertProof.mockResolvedValue({
        id: '1',
        timestamp: Date.now(),
        rowsAffected: 1,
      });

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      mockDatabase.updateProofStatus.mockRejectedValue(
        new Error('Update failed'),
      );

      await act(async () => {
        await useProofHistoryStore
          .getState()
          .updateProofStatus(
            'session-123',
            ProofStatus.SUCCESS,
            'SUCCESS_001',
            'Operation completed',
          );
      });

      expect(mockDatabase.updateProofStatus).toHaveBeenCalled();
      // Store should handle the error gracefully without crashing
    });
  });

  describe('loadMoreHistory', () => {
    it('loads more history successfully', async () => {
      const mockHistoryResult = {
        rows: [
          {
            id: '1',
            sessionId: 'session-1',
            appName: 'TestApp1',
            endpointType: 'celo',
            status: ProofStatus.SUCCESS,
            errorCode: null,
            errorReason: null,
            timestamp: Date.now(),
            disclosures: '{"test": "data1"}',
            logoBase64: 'base64-logo1',
            userId: 'user-1',
            userIdType: 'uuid',
          },
        ],
        total_count: 5,
      };

      mockDatabase.getHistory.mockResolvedValue(mockHistoryResult);

      await act(async () => {
        await useProofHistoryStore.getState().loadMoreHistory();
      });

      expect(mockDatabase.getHistory).toHaveBeenCalledWith(1);
      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(1);
      expect(useProofHistoryStore.getState().currentPage).toBe(2);
      expect(useProofHistoryStore.getState().hasMore).toBe(true);
      expect(useProofHistoryStore.getState().isLoading).toBe(false);
    });

    it('prevents loading when already loading', async () => {
      act(() => {
        useProofHistoryStore.setState({ isLoading: true });
      });

      await act(async () => {
        await useProofHistoryStore.getState().loadMoreHistory();
      });

      expect(mockDatabase.getHistory).not.toHaveBeenCalled();
    });
  });

  describe('syncProofHistoryStatus (via initDatabase)', () => {
    const pendingProof = {
      id: '1',
      sessionId: 'session-abc',
      appName: 'TestApp',
      endpointType: 'celo',
      status: ProofStatus.PENDING,
      errorCode: null,
      errorReason: null,
      timestamp: Date.now(),
      disclosures: '{}',
      logoBase64: null,
      userId: 'u',
      userIdType: 'uuid',
    };

    const getHandler = (event: string) => {
      const call = (mockSocket.on as jest.Mock).mock.calls.find(
        ([name]) => name === event,
      );
      return call?.[1] as ((...args: any[]) => void) | undefined;
    };

    let nowSpy: jest.SpyInstance;
    let testClock = Date.now();

    beforeEach(() => {
      testClock += 10 * 60 * 1000;
      nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => testClock);

      mockDatabase.init.mockResolvedValue(undefined);
      mockDatabase.updateStaleProofs.mockResolvedValue(undefined);
      mockDatabase.getHistory.mockResolvedValue({ rows: [], total_count: 0 });
      mockDatabase.getPendingProofs.mockResolvedValue({ rows: [pendingProof] });
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it('does not unsubscribe on non-terminal status', async () => {
      await act(async () => {
        await useProofHistoryStore.getState().initDatabase();
      });

      const statusHandler = getHandler('status');
      expect(statusHandler).toBeDefined();

      (mockSocket.emit as jest.Mock).mockClear();
      statusHandler!({ status: 1, request_id: 'session-abc' });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'unsubscribe',
        expect.anything(),
      );
      expect(mockDatabase.updateProofStatus).not.toHaveBeenCalled();
    });

    it('unsubscribes on terminal status', async () => {
      await act(async () => {
        await useProofHistoryStore.getState().initDatabase();
      });

      const statusHandler = getHandler('status');
      (mockSocket.emit as jest.Mock).mockClear();
      statusHandler!({ status: 4, request_id: 'session-abc' });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'unsubscribe',
        'session-abc',
      );
    });

    it('ignores terminal status updates for unknown request ids', async () => {
      await act(async () => {
        await useProofHistoryStore.getState().initDatabase();
      });

      const statusHandler = getHandler('status');
      (mockSocket.emit as jest.Mock).mockClear();
      mockDatabase.updateProofStatus.mockClear();

      statusHandler!({ status: 4, request_id: 'session-other' });

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'unsubscribe',
        expect.anything(),
      );
      expect(mockDatabase.updateProofStatus).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'Proof history status message for unknown request_id',
      );
    });

    it('keeps the timeout active across reconnectable disconnects', async () => {
      nowSpy.mockRestore();
      jest.useFakeTimers();
      jest.setSystemTime(testClock);

      try {
        await act(async () => {
          await useProofHistoryStore.getState().initDatabase();
        });

        const disconnectHandler = getHandler('disconnect');
        expect(disconnectHandler).toBeDefined();

        mockSocket.active = true;
        disconnectHandler!();

        await jest.advanceTimersByTimeAsync(30 * 1000 * 4);

        expect(mockSocket.disconnect).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
        nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => testClock);
      }
    });

    it('disconnects after timeout even when never connected', async () => {
      nowSpy.mockRestore();
      jest.useFakeTimers();
      jest.setSystemTime(testClock);

      try {
        await act(async () => {
          await useProofHistoryStore.getState().initDatabase();
        });

        mockSocket.connected = false;
        expect(mockSocket.disconnect).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(30 * 1000 * 4);

        expect(mockSocket.disconnect).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
        nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => testClock);
      }
    });
  });

  describe('resetHistory', () => {
    it('resets history state to initial values', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid',
        endpointType: 'celo',
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
      } as const;

      mockDatabase.insertProof.mockResolvedValue({
        id: '1',
        timestamp: Date.now(),
        rowsAffected: 1,
      });

      await act(async () => {
        await useProofHistoryStore.getState().addProofHistory(mockProof);
      });

      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(1);

      act(() => {
        useProofHistoryStore.getState().resetHistory();
      });

      expect(useProofHistoryStore.getState().proofHistory).toHaveLength(0);
      expect(useProofHistoryStore.getState().currentPage).toBe(1);
      expect(useProofHistoryStore.getState().hasMore).toBe(true);
    });
  });
});
