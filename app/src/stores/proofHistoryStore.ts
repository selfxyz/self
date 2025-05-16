import { Platform } from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import { io } from 'socket.io-client';
import { create } from 'zustand';

import { WS_DB_RELAYER } from '../../../common/src/constants/constants';
import { EndpointType } from '../../../common/src/utils/appType';
import { UserIdType } from '../../../common/src/utils/circuits/uuid';

SQLite.enablePromise(true);

export interface ProofHistory {
  id: string;
  appName: string;
  sessionId: string;
  userId: string;
  userIdType: UserIdType;
  endpointType: EndpointType;
  status: ProofStatus;
  errorCode?: string;
  errorReason?: string;
  timestamp: number;
  disclosures: string;
  logoBase64?: string;
}

export enum ProofStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

interface ProofHistoryState {
  proofHistory: ProofHistory[];
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  initDatabase: () => Promise<void>;
  addProofHistory: (
    proof: Omit<ProofHistory, 'id' | 'timestamp'>,
  ) => Promise<void>;
  updateProofStatus: (
    sessionId: string,
    status: ProofStatus,
    errorCode?: string,
    errorReason?: string,
  ) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  resetHistory: () => void;
}

const PAGE_SIZE = 20;
const DB_NAME = Platform.OS === 'ios' ? 'proof_history.db' : 'proof_history.db';
const TABLE_NAME = 'proof_history';

export const useProofHistoryStore = create<ProofHistoryState>()((set, get) => {
  const syncProofHistoryStatus = async () => {
    try {
      set({ isLoading: true });
      const db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      const [pendingProofs] = await db.executeSql(`
        SELECT * FROM ${TABLE_NAME} WHERE status = '${ProofStatus.PENDING}'
      `);

      if (pendingProofs.rows.length === 0) {
        console.log('No pending proofs to sync');
        return;
      }

      const websocket = io(WS_DB_RELAYER, {
        path: '/',
        transports: ['websocket'],
      });

      for (let i = 0; i < pendingProofs.rows.length; i++) {
        const proof = pendingProofs.rows.item(i);
        websocket.emit('subscribe', proof.sessionId);
      }

      websocket.on('status', message => {
        const data =
          typeof message === 'string' ? JSON.parse(message) : message;

        if (data.status === 3) {
          console.log('Failed to generate proof');
          get().updateProofStatus(data.request_id, ProofStatus.FAILURE);
        } else if (data.status === 4) {
          console.log('Proof verified');
          get().updateProofStatus(data.request_id, ProofStatus.SUCCESS);
        } else if (data.status === 5) {
          console.log('Failed to verify proof');
          get().updateProofStatus(data.request_id, ProofStatus.FAILURE);
        }
      });
    } catch (error) {
      console.error('Error syncing proof status', error);
    } finally {
      set({ isLoading: false });
    }
  };

  return {
    proofHistory: [],
    isLoading: false,
    hasMore: true,
    currentPage: 1,

    initDatabase: async () => {
      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });

        await db.executeSql(`
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appName TEXT NOT NULL,
            sessionId TEXT NOT NULL UNIQUE,
            userId TEXT NOT NULL,
            userIdType TEXT NOT NULL,
            endpointType TEXT NOT NULL,
            status TEXT NOT NULL,
            errorCode TEXT,
            errorReason TEXT,
            timestamp INTEGER NOT NULL,
            disclosures TEXT NOT NULL,
            logoBase64 TEXT
          )
        `);

        await db.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_proof_history_timestamp ON ${TABLE_NAME} (timestamp)
        `);

        // Load initial data
        const state = get();
        if (state.proofHistory.length === 0) {
          await state.loadMoreHistory();
        }

        // Sync any pending proof statuses
        await syncProofHistoryStatus();
      } catch (error) {
        console.error('Error initializing proof history database', error);
      }
    },

    addProofHistory: async proof => {
      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });

        const timestamp = Date.now();

        const [insertResult] = await db.executeSql(
          `INSERT OR IGNORE INTO ${TABLE_NAME} (appName, endpointType, status, errorCode, errorReason, timestamp, disclosures, logoBase64, userId, userIdType, sessionId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proof.appName,
            proof.endpointType,
            proof.status,
            proof.errorCode || null,
            proof.errorReason || null,
            timestamp,
            proof.disclosures,
            proof.logoBase64 || null,
            proof.userId,
            proof.userIdType,
            proof.sessionId,
          ],
        );

        if (insertResult.rowsAffected > 0 && insertResult.insertId) {
          const id = insertResult.insertId.toString();
          set(state => ({
            proofHistory: [
              {
                ...proof,
                id,
                timestamp,
                disclosures: proof.disclosures,
              },
              ...state.proofHistory,
            ],
          }));
        }
      } catch (error) {
        console.error('Error adding proof history', error);
      }
    },

    updateProofStatus: async (sessionId, status, errorCode, errorReason) => {
      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });
        await db.executeSql(
          `
          UPDATE ${TABLE_NAME} SET status = ?, errorCode = ?, errorReason = ? WHERE sessionId = ?
        `,
          [status, errorCode, errorReason, sessionId],
        );

        // Update the status in the state
        set(state => ({
          proofHistory: state.proofHistory.map(proof =>
            proof.sessionId === sessionId
              ? { ...proof, status, errorCode, errorReason }
              : proof,
          ),
        }));
      } catch (error) {
        console.error('Error updating proof status', error);
      }
    },

    loadMoreHistory: async () => {
      const state = get();
      if (state.isLoading || !state.hasMore) return;

      set({ isLoading: true });

      try {
        const db = await SQLite.openDatabase({
          name: DB_NAME,
          location: 'default',
        });
        const offset = (state.currentPage - 1) * PAGE_SIZE;

        const [results] = await db.executeSql(
          `WITH data AS (
            SELECT *, COUNT(*) OVER() as total_count
            FROM ${TABLE_NAME}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
          )
          SELECT * FROM data`,
          [PAGE_SIZE, offset],
        );

        const proofs: ProofHistory[] = [];
        let totalCount = 0;

        for (let i = 0; i < results.rows.length; i++) {
          const row = results.rows.item(i);
          totalCount = row.total_count; // same for all rows
          proofs.push({
            id: row.id.toString(),
            sessionId: row.sessionId,
            appName: row.appName,
            endpointType: row.endpointType,
            status: row.status,
            errorCode: row.errorCode,
            errorReason: row.errorReason,
            timestamp: row.timestamp,
            disclosures: row.disclosures,
            logoBase64: row.logoBase64,
            userId: row.userId,
            userIdType: row.userIdType,
          });
        }

        // Calculate if there are more items
        const currentTotal = state.proofHistory.length + proofs.length;
        const hasMore = currentTotal < totalCount;

        set(currentState => ({
          proofHistory: [...currentState.proofHistory, ...proofs],
          currentPage: currentState.currentPage + 1,
          hasMore,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Error loading more proof history', error);
        set({
          isLoading: false,
        });
      }
    },

    resetHistory: () => {
      set({
        proofHistory: [],
        currentPage: 1,
        hasMore: true,
      });
    },
  };
});
