// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ProofDB, ProofDBResult, ProofHistory } from '@/stores/proofTypes';
import { ProofStatus } from '@/stores/proofTypes';

export const DB_NAME = 'proof_history_db';
const STORE_NAME = 'proof_history';
const DB_VERSION = 1;
const PAGE_SIZE = 20;

class IndexedDBDatabase implements ProofDB {
  private db: IDBDatabase | null = null;

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the object store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes
          store.createIndex('sessionId', 'sessionId', { unique: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async updateStaleProofs(
    setProofStatus: (id: string, status: ProofStatus) => Promise<void>,
  ): Promise<void> {
    const db = await this.openDatabase();

    const staleTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const statusIndex = store.index('status');
      const request = statusIndex.getAll(ProofStatus.PENDING);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const staleProofs = request.result.filter(
          proof => proof.timestamp <= staleTimestamp,
        );

        for (const proof of staleProofs) {
          try {
            await setProofStatus(proof.sessionId, ProofStatus.FAILURE);
          } catch (error) {
            console.error(
              `Failed to update proof status for session ${proof.sessionId}:`,
              error,
            );
          }
        }
        resolve();
      };
    });
  }

  async getPendingProofs(): Promise<ProofDBResult> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const statusIndex = store.index('status');
      const request = statusIndex.getAll(ProofStatus.PENDING);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve({ rows: request.result });
      };
    });
  }

  async getHistory(page: number = 1): Promise<ProofDBResult> {
    const db = await this.openDatabase();
    const offset = (page - 1) * PAGE_SIZE;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const timestampIndex = store.index('timestamp');

      // Get total count
      const countRequest = store.count();
      countRequest.onerror = () => reject(countRequest.error);

      countRequest.onsuccess = () => {
        const totalCount = countRequest.result;

        // Get paginated results (IndexedDB doesn't have OFFSET, so we need to handle pagination manually)
        const request = timestampIndex.openCursor(null, 'prev');
        const results: ProofHistory[] = [];
        let skipped = 0;
        let returned = 0;

        request.onerror = () => reject(request.error);
        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor) {
            if (skipped < offset) {
              skipped++;
              cursor.continue();
            } else if (returned < PAGE_SIZE) {
              results.push(cursor.value);
              returned++;
              cursor.continue();
            } else {
              // Add total count to the first result for compatibility
              const resultWithCount = results.map((item, index) =>
                index === 0 ? { ...item, total_count: totalCount } : item,
              );
              resolve({ rows: resultWithCount, total_count: totalCount });
            }
          } else {
            // Add total count to the first result for compatibility
            const resultWithCount = results.map((item, index) =>
              index === 0 ? { ...item, total_count: totalCount } : item,
            );
            resolve({ rows: resultWithCount, total_count: totalCount });
          }
        };
      };
    });
  }

  async init(): Promise<void> {
    // Database initialization is handled in openDatabase
    await this.openDatabase();
  }

  async insertProof(
    proof: Omit<ProofHistory, 'id' | 'timestamp'>,
  ): Promise<{ id: string; timestamp: number; rowsAffected: number }> {
    const db = await this.openDatabase();
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const proofWithId = {
        ...proof,
        timestamp,
      };

      const request = store.add(proofWithId);

      request.onerror = () => {
        // Handle unique constraint violation for sessionId
        if (request.error?.name === 'ConstraintError') {
          // Find existing record by sessionId and update it
          const sessionIdIndex = store.index('sessionId');
          const getRequest = sessionIdIndex.get(proof.sessionId);
          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (existing) {
              const updateRequest = store.put({
                ...existing,
                ...proofWithId,
                id: existing.id, // Preserve the original ID
              });
              updateRequest.onerror = () => reject(updateRequest.error);
              updateRequest.onsuccess = () => {
                resolve({
                  id: existing.id.toString(),
                  timestamp,
                  rowsAffected: 1,
                });
              };
            } else {
              reject(new Error('Constraint error but record not found'));
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        } else {
          reject(request.error);
        }
      };

      request.onsuccess = () => {
        resolve({
          id: request.result?.toString() || '',
          timestamp,
          rowsAffected: 1,
        });
      };
    });
  }

  async updateProofStatus(
    status: ProofStatus,
    errorCode: string | undefined,
    errorReason: string | undefined,
    sessionId: string,
  ): Promise<void> {
    const db = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const sessionIdIndex = store.index('sessionId');

      // First find the record by sessionId
      const getRequest = sessionIdIndex.get(sessionId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const existingProof = getRequest.result;
        if (existingProof) {
          const updatedProof = {
            ...existingProof,
            status,
            errorCode,
            errorReason,
          };

          const updateRequest = store.put(updatedProof);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        } else {
          resolve(); // No record found, nothing to update
        }
      };
    });
  }
}

export const database: ProofDB = new IndexedDBDatabase();
