import { Platform } from 'react-native';
import SQLite from 'react-native-sqlite-storage';

import {
  ProofDB,
  ProofDBResult,
  ProofHistory,
  ProofStatus,
} from './proof-types';

const PAGE_SIZE = 20;
const DB_NAME = Platform.OS === 'ios' ? 'proof_history.db' : 'proof_history.db';
const TABLE_NAME = 'proof_history';

SQLite.enablePromise(true);

async function openDatabase() {
  return SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });
}

export const database: ProofDB = {
  getPendingProofs: async (): Promise<ProofDBResult> => {
    const db = await openDatabase();
    const [pendingProofs] = await db.executeSql(`
        SELECT * FROM ${TABLE_NAME} WHERE status = '${ProofStatus.PENDING}'
      `);

    return { rows: pendingProofs.rows.raw() };
  },
  getHistory: async (page: number = 1): Promise<ProofDBResult> => {
    const db = await openDatabase();
    const offset = (page - 1) * PAGE_SIZE;

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
    return { rows: results.rows.raw() };
  },
  init: async () => {
    const db = await openDatabase();
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
  },
  async insertProof(proof: Omit<ProofHistory, 'id' | 'timestamp'>) {
    const db = await openDatabase();
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
    return {
      id: insertResult.insertId.toString(),
      timestamp,
      rowsAffected: insertResult.rowsAffected,
    };
  },
  async updateProofStatus(
    status: ProofStatus,
    errorCode: string | undefined,
    errorReason: string | undefined,
    sessionId: string,
  ) {
    const db = await openDatabase();
    await db.executeSql(
      `
          UPDATE ${TABLE_NAME} SET status = ?, errorCode = ?, errorReason = ? WHERE sessionId = ?
        `,
      [status, errorCode, errorReason, sessionId],
    );
  },
};
