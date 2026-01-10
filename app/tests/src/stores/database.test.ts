// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SQLite from 'react-native-sqlite-storage';

import { database } from '@/stores/database';
import { ProofStatus } from '@/stores/proofTypes';

// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
}));

const mockSQLite = SQLite as any;

describe('database (SQLite)', () => {
  let mockDb: any;

  // Suppress console errors during testing to avoid cluttering output
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock database
    mockDb = {
      executeSql: jest.fn(() => Promise.resolve()),
    };

    mockSQLite.openDatabase.mockResolvedValue(mockDb);
  });

  describe('init', () => {
    it('creates table and index if they do not exist', async () => {
      await database.init();

      expect(mockSQLite.openDatabase).toHaveBeenCalledWith({
        name: 'proof_history.db',
        location: 'default',
      });

      expect(mockDb.executeSql).toHaveBeenCalledTimes(2);

      // Check table creation
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(`CREATE TABLE IF NOT EXISTS proof_history`),
      );

      // Check index creation
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_proof_history_timestamp',
        ),
      );
    });

    it('handles initialization errors gracefully', async () => {
      const initError = new Error('Table creation failed');
      mockDb.executeSql.mockRejectedValueOnce(initError);

      await expect(database.init()).rejects.toThrow('Table creation failed');
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS proof_history'),
      );
    });
  });

  describe('insertProof', () => {
    it('inserts a new proof successfully', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid' as const,
        endpointType: 'https' as const,
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
        logoBase64: 'base64-logo',
        documentId: 'document-123',
        endpoint: 'https://example.com/endpoint',
      };

      const mockInsertResult = {
        insertId: 1,
        rowsAffected: 1,
      };

      mockDb.executeSql.mockResolvedValueOnce([mockInsertResult]);

      const result = await database.insertProof(mockProof);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO proof_history'),
        [
          mockProof.appName,
          mockProof.endpoint,
          mockProof.endpointType,
          mockProof.status,
          null, // errorCode
          null, // errorReason
          expect.any(Number), // timestamp
          mockProof.disclosures,
          mockProof.logoBase64,
          mockProof.userId,
          mockProof.userIdType,
          mockProof.sessionId,
          mockProof.documentId,
        ],
      );

      expect(result).toEqual({
        id: '1',
        timestamp: expect.any(Number),
        rowsAffected: 1,
      });
    });

    it('handles proof with error information', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid' as const,
        endpoint: 'https://example.com/endpoint',
        endpointType: 'https' as const,
        status: ProofStatus.FAILURE,
        errorCode: 'ERROR_001',
        errorReason: 'Test error',
        disclosures: '{"test": "data"}',
        documentId: 'document-123',
      };

      const mockInsertResult = {
        insertId: 2,
        rowsAffected: 1,
      };

      mockDb.executeSql.mockResolvedValueOnce([mockInsertResult]);

      const result = await database.insertProof(mockProof);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO proof_history'),
        [
          mockProof.appName,
          mockProof.endpoint,
          mockProof.endpointType,
          mockProof.status,
          mockProof.errorCode,
          mockProof.errorReason,
          expect.any(Number),
          mockProof.disclosures,
          null, // logoBase64
          mockProof.userId,
          mockProof.userIdType,
          mockProof.sessionId,
          mockProof.documentId,
        ],
      );

      expect(result).toEqual({
        id: '2',
        timestamp: expect.any(Number),
        rowsAffected: 1,
      });
    });

    it('handles duplicate sessionId gracefully (INSERT OR IGNORE skips)', async () => {
      const mockProof = {
        appName: 'TestApp',
        sessionId: 'session-123',
        userId: 'user-456',
        userIdType: 'uuid' as const,
        endpointType: 'https' as const,
        status: ProofStatus.PENDING,
        disclosures: '{"test": "data"}',
        logoBase64: 'base64-logo',
        documentId: 'document-123',
        endpoint: 'https://example.com/endpoint',
      };

      // Simulate INSERT OR IGNORE behavior when a duplicate sessionId exists
      const mockInsertResult = {
        insertId: 0, // SQLite returns 0 for ignored inserts
        rowsAffected: 0,
      };

      mockDb.executeSql.mockResolvedValueOnce([mockInsertResult]);

      const result = await database.insertProof(mockProof);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO proof_history'),
        expect.any(Array),
      );

      // Should handle undefined/0 insertId gracefully
      expect(result).toEqual({
        id: '0',
        timestamp: expect.any(Number),
        rowsAffected: 0,
      });
    });
  });

  describe('updateProofStatus', () => {
    it('updates proof status successfully', async () => {
      const sessionId = 'session-123';
      const status = ProofStatus.SUCCESS;
      const errorCode = 'SUCCESS_001';
      const errorReason = 'Operation completed';

      mockDb.executeSql.mockResolvedValueOnce([{}]);

      await database.updateProofStatus(
        status,
        errorCode,
        errorReason,
        sessionId,
      );

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE proof_history SET status = ?, errorCode = ?, errorReason = ? WHERE sessionId = ?',
        ),
        [status, errorCode, errorReason, sessionId],
      );
    });

    it('updates proof status with undefined error information', async () => {
      const sessionId = 'session-123';
      const status = ProofStatus.SUCCESS;

      mockDb.executeSql.mockResolvedValueOnce([{}]);

      await database.updateProofStatus(status, undefined, undefined, sessionId);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE proof_history SET status = ?, errorCode = ?, errorReason = ? WHERE sessionId = ?',
        ),
        [status, undefined, undefined, sessionId],
      );
    });
  });

  describe('getPendingProofs', () => {
    it('returns pending proofs successfully', async () => {
      const mockRows = [
        {
          id: 1,
          appName: 'TestApp',
          sessionId: 'session-123',
          userId: 'user-456',
          userIdType: 'email',
          endpointType: 'register',
          status: ProofStatus.PENDING,
          timestamp: Date.now(),
          disclosures: '{"test": "data"}',
        },
      ];

      const mockResult = {
        rows: {
          raw: jest.fn().mockReturnValue(mockRows),
          item: jest.fn().mockReturnValue({ total_count: 1 }),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      const result = await database.getPendingProofs();

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM proof_history WHERE status = 'pending'",
        ),
      );

      expect(result).toEqual({
        rows: mockRows,
        total_count: 1,
      });
    });

    it('returns empty array when no pending proofs exist', async () => {
      const mockResult = {
        rows: {
          raw: jest.fn().mockReturnValue([]),
          item: jest.fn().mockReturnValue(undefined),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      const result = await database.getPendingProofs();

      expect(result).toEqual({
        rows: [],
        total_count: undefined,
      });
    });
  });

  describe('getHistory', () => {
    it('returns paginated history successfully', async () => {
      const mockRows = [
        {
          id: 1,
          appName: 'TestApp',
          sessionId: 'session-123',
          userId: 'user-456',
          userIdType: 'email',
          endpointType: 'register',
          status: ProofStatus.SUCCESS,
          timestamp: Date.now(),
          disclosures: '{"test": "data"}',
          total_count: 5,
        },
      ];

      const mockResult = {
        rows: {
          raw: jest.fn().mockReturnValue(mockRows),
          item: jest.fn().mockReturnValue({ total_count: 5 }),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      const result = await database.getHistory(1);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WITH data AS'),
        [20, 0], // PAGE_SIZE, offset
      );

      expect(result).toEqual({
        rows: mockRows,
        total_count: 5,
      });
    });

    it('handles second page correctly', async () => {
      const mockResult = {
        rows: {
          raw: jest.fn().mockReturnValue([]),
          item: jest.fn().mockReturnValue({ total_count: 5 }),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      await database.getHistory(2);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WITH data AS'),
        [20, 20], // PAGE_SIZE, offset for page 2
      );
    });

    it('defaults to page 1 when no page is provided', async () => {
      const mockResult = {
        rows: {
          raw: jest.fn().mockReturnValue([]),
          item: jest.fn().mockReturnValue({ total_count: 0 }),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      await database.getHistory();

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WITH data AS'),
        [20, 0], // PAGE_SIZE, offset for page 1
      );
    });
  });

  describe('updateStaleProofs', () => {
    it('updates stale pending proofs to failure', async () => {
      const mockSetProofStatus = jest.fn().mockResolvedValue(undefined);

      const mockStaleRows = [
        { sessionId: 'session-123' },
        { sessionId: 'session-456' },
      ];

      const mockResult = {
        rows: {
          length: 2,
          item: jest.fn((index: number) => mockStaleRows[index]),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      await database.updateStaleProofs(mockSetProofStatus);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT sessionId FROM proof_history WHERE status = ? AND timestamp <= ?',
        ),
        [ProofStatus.PENDING, expect.any(Number)],
      );

      expect(mockSetProofStatus).toHaveBeenCalledTimes(2);
      expect(mockSetProofStatus).toHaveBeenCalledWith(
        'session-123',
        ProofStatus.FAILURE,
      );
      expect(mockSetProofStatus).toHaveBeenCalledWith(
        'session-456',
        ProofStatus.FAILURE,
      );
    });

    it('handles errors during status updates gracefully', async () => {
      const mockSetProofStatus = jest
        .fn()
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Update failed')); // Second call fails

      const mockStaleRows = [
        { sessionId: 'session-123' },
        { sessionId: 'session-456' },
      ];

      const mockResult = {
        rows: {
          length: 2,
          item: jest.fn((index: number) => mockStaleRows[index]),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      // Should not throw error
      await database.updateStaleProofs(mockSetProofStatus);

      expect(mockSetProofStatus).toHaveBeenCalledTimes(2);
      expect(mockSetProofStatus).toHaveBeenCalledWith(
        'session-123',
        ProofStatus.FAILURE,
      );
      expect(mockSetProofStatus).toHaveBeenCalledWith(
        'session-456',
        ProofStatus.FAILURE,
      );
    });

    it('handles no stale proofs gracefully', async () => {
      const mockSetProofStatus = jest.fn().mockResolvedValue(undefined);

      const mockResult = {
        rows: {
          length: 0,
          item: jest.fn(),
        },
      };

      mockDb.executeSql.mockResolvedValueOnce([mockResult]);

      await database.updateStaleProofs(mockSetProofStatus);

      expect(mockSetProofStatus).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockSQLite.openDatabase.mockRejectedValueOnce(dbError);

      await expect(database.init()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('handles SQL execution errors', async () => {
      const sqlError = new Error('SQL execution failed');
      mockDb.executeSql.mockRejectedValueOnce(sqlError);

      await expect(database.getPendingProofs()).rejects.toThrow(
        'SQL execution failed',
      );
    });
  });
});
