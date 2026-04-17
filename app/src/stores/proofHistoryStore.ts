// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { io } from 'socket.io-client';
import { create } from 'zustand';

import { WS_DB_RELAYER } from '@selfxyz/common/constants';

import { database } from '@/stores/database';
import type { ProofHistory } from '@/stores/proofTypes';
import { ProofStatus } from '@/stores/proofTypes';

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

const SYNC_THROTTLE_MS = 30 * 1000; // 30 seconds throttle for sync calls

export const useProofHistoryStore = create<ProofHistoryState>()((set, get) => {
  let lastSyncTime = 0; // Track last sync time for throttling

  const parseStatusMessage = (message: unknown) => {
    if (typeof message !== 'string') {
      return message as Record<string, unknown>;
    }

    try {
      return JSON.parse(message) as Record<string, unknown>;
    } catch (error) {
      console.error('Invalid websocket status payload', error);
      return null;
    }
  };

  const syncProofHistoryStatus = async () => {
    try {
      // Throttling mechanism - prevent sync if called too frequently
      const now = Date.now();
      if (now - lastSyncTime < SYNC_THROTTLE_MS) {
        return;
      }
      lastSyncTime = now;

      set({ isLoading: true });

      await database.updateStaleProofs(get().updateProofStatus);

      const pendingProofs = await database.getPendingProofs();

      if (pendingProofs.rows.length === 0) {
        return;
      }

      const websocket = io(WS_DB_RELAYER, {
        path: '/',
        transports: ['websocket'],
      });

      const disconnectTimer = setTimeout(() => {
        websocket.disconnect();
        // disconnect after 2 minutes
      }, SYNC_THROTTLE_MS * 4);

      websocket.on('disconnect', () => {
        clearTimeout(disconnectTimer);
      });

      websocket.on('connect_error', error => {
        console.error('Proof history websocket connection error', error);
      });

      websocket.on('error', error => {
        console.error('Proof history websocket error', error);
      });

      for (let i = 0; i < pendingProofs.rows.length; i++) {
        const proof = pendingProofs.rows[i];
        websocket.emit('subscribe', proof.sessionId);
      }

      websocket.timeout(SYNC_THROTTLE_MS * 3).on('status', message => {
        const data = parseStatusMessage(message);

        if (!data) {
          return;
        }

        const status = Number(data.status);
        const requestId =
          typeof data.request_id === 'string' ? data.request_id : undefined;

        if (!requestId) {
          console.error(
            'Proof history status message missing request_id',
            data,
          );
          return;
        }

        if (status !== 3 && status !== 4 && status !== 5) {
          return;
        }

        if (status === 4) {
          get().updateProofStatus(requestId, ProofStatus.SUCCESS);
        } else {
          get().updateProofStatus(requestId, ProofStatus.FAILURE);
        }

        websocket.emit('unsubscribe', requestId);
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
        await database.init();

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
        const insertResult = await database.insertProof(proof);

        if (insertResult.rowsAffected > 0 && insertResult.id) {
          const { id, timestamp } = insertResult;
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
        await database.updateProofStatus(
          status,
          errorCode,
          errorReason,
          sessionId,
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
        const results = await database.getHistory(state.currentPage);

        const proofs: ProofHistory[] = [];
        const totalCount = results.total_count || 0;
        for (let i = 0; i < results.rows.length; i++) {
          const row = results.rows[i];
          proofs.push({
            id: row.id.toString(),
            sessionId: row.sessionId,
            appName: row.appName,
            endpoint: row.endpoint,
            endpointType: row.endpointType,
            status: row.status,
            errorCode: row.errorCode,
            errorReason: row.errorReason,
            timestamp: row.timestamp,
            disclosures: row.disclosures,
            logoBase64: row.logoBase64,
            userId: row.userId,
            userIdType: row.userIdType,
            documentId: row.documentId,
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
