// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SQLite from 'react-native-sqlite-storage';

import type { ProofDB, ProofDBResult, ProofHistory } from '@/stores/proofTypes';
import { ProofStatus } from '@/stores/proofTypes';

const PAGE_SIZE = 20;
const DB_NAME = 'proof_history.db';
const TABLE_NAME = 'proof_history';
const STALE_PROOF_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

SQLite.enablePromise(true);

const toInsertId = (result: SQLite.ResultSet) =>
  result.insertId ? result.insertId.toString() : '0';

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

    for (let i = 0; i < stalePending.rows.length; i++) {
      const { sessionId } = stalePending.rows.item(i);
      try {
        await setProofStatus(sessionId, ProofStatus.FAILURE);
      } catch (error) {
        console.error(
          `Failed to update proof status for session ${sessionId}:`,
          error,
        );
        // Continue with the next iteration instead of stopping the entire loop
      }
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
        endpoint TEXT,
        endpointType TEXT NOT NULL,
        status TEXT NOT NULL,
        errorCode TEXT,
        errorReason TEXT,
        timestamp INTEGER NOT NULL,
        disclosures TEXT NOT NULL,
        logoBase64 TEXT,
        documentId TEXT NOT NULL
      )
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_proof_history_timestamp ON ${TABLE_NAME} (timestamp)
    `);
  },
  async insertProof(proof: Omit<ProofHistory, 'id' | 'timestamp'>) {
    const db = await openDatabase();
    const timestamp = Date.now();

    try {
      const [insertResult] = await db.executeSql(
        `INSERT OR IGNORE INTO ${TABLE_NAME} (appName, endpoint, endpointType, status, errorCode, errorReason, timestamp, disclosures, logoBase64, userId, userIdType, sessionId, documentId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          proof.appName,
          proof.endpoint || null,
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
          proof.documentId,
        ],
      );
      // Handle case where INSERT OR IGNORE skips insertion due to duplicate sessionId
      return {
        id: toInsertId(insertResult),
        timestamp,
        rowsAffected: insertResult.rowsAffected,
      };
    } catch (error) {
      if ((error as Error).message.includes('no column named documentId')) {
        await addDocumentIdColumn();
        const [insertResult] = await db.executeSql(
          `INSERT OR IGNORE INTO ${TABLE_NAME} (appName, endpoint, endpointType, status, errorCode, errorReason, timestamp, disclosures, logoBase64, userId, userIdType, sessionId, documentId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proof.appName,
            proof.endpoint || null,
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
            proof.documentId,
          ],
        );
        // Handle case where INSERT OR IGNORE skips insertion due to duplicate sessionId
        return {
          id: toInsertId(insertResult),
          timestamp,
          rowsAffected: insertResult.rowsAffected,
        };
      } else if (
        (error as Error).message.includes('no column named endpoint')
      ) {
        await addEndpointColumn();
        const [insertResult] = await db.executeSql(
          `INSERT OR IGNORE INTO ${TABLE_NAME} (appName, endpoint, endpointType, status, errorCode, errorReason, timestamp, disclosures, logoBase64, userId, userIdType, sessionId, documentId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proof.appName,
            proof.endpoint || null,
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
            proof.documentId,
          ],
        );
        // Handle case where INSERT OR IGNORE skips insertion due to duplicate sessionId
        return {
          id: toInsertId(insertResult),
          timestamp,
          rowsAffected: insertResult.rowsAffected,
        };
      } else {
        throw error;
      }
    }
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

async function addDocumentIdColumn() {
  const db = await openDatabase();
  await db.executeSql(
    `ALTER TABLE ${TABLE_NAME} ADD COLUMN documentId TEXT NOT NULL DEFAULT ''`,
  );
}

async function addEndpointColumn() {
  const db = await openDatabase();
  await db.executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN endpoint TEXT`);
}
