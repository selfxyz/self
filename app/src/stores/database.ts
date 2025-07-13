// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import SQLite from 'react-native-sqlite-storage';

import {
  ProofDB,
  ProofDBResult,
  ProofHistory,
  ProofStatus,
} from './proof-types';

const PAGE_SIZE = 20;
const DB_NAME = 'proof_history.db';
const TABLE_NAME = 'proof_history';
const STALE_PROOF_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

SQLite.enablePromise(true);

async function openDatabase() {
  return SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });
}

export const database: ProofDB = {
  updateStaleProofs: async (
    setProofStatus: (id: string, status: ProofStatus) => Promise<void>,
  ) => {
    const db = await openDatabase();
    const staleTimestamp = Date.now() - STALE_PROOF_TIMEOUT_MS;
    const [stalePending] = await db.executeSql(
      `SELECT sessionId FROM ${TABLE_NAME} WHERE status = ? AND timestamp <= ?`,
      [ProofStatus.PENDING, staleTimestamp],
    );

    // Improved error handling - wrap each setProofStatus call in try-catch
    let successfulUpdates = 0;
    let failedUpdates = 0;

    for (let i = 0; i < stalePending.rows.length; i++) {
      const { sessionId } = stalePending.rows.item(i);
      try {
        await setProofStatus(sessionId, ProofStatus.FAILURE);
        successfulUpdates++;
      } catch (error) {
        console.error(
          `Failed to update proof status for session ${sessionId}:`,
          error,
        );
        failedUpdates++;
        // Continue with the next iteration instead of stopping the entire loop
      }
    }

    if (stalePending.rows.length > 0) {
      console.log(
        `Stale proof cleanup: ${successfulUpdates} successful, ${failedUpdates} failed`,
      );
    }
  },
  getPendingProofs: async (): Promise<ProofDBResult> => {
    const db = await openDatabase();

    const [pendingProofs] = await db.executeSql(`
        SELECT * FROM ${TABLE_NAME} WHERE status = '${ProofStatus.PENDING}'
      `);

    return {
      rows: pendingProofs.rows.raw(),
      total_count: pendingProofs.rows.item(0)?.total_count,
    };
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
    return {
      rows: results.rows.raw(),
      total_count: results.rows.item(0)?.total_count,
    };
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
