// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingKycStatus,
  PendingKycVerification,
} from '@selfxyz/common/utils/types';

const VERIFICATION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours TODO seshanth

interface PendingKycState {
  pendingVerifications: PendingKycVerification[];

  addPendingVerification: (sessionId: string) => void;
  updateVerificationStatus: (
    sessionId: string,
    status: PendingKycStatus,
    errorMessage?: string,
    documentId?: string,
  ) => void;
  removePendingVerification: (sessionId: string) => void;
  removeExpiredVerifications: () => void;
  clearAllPendingVerifications: () => void;
  hasPendingVerification: () => boolean;
  getPendingVerification: (
    sessionId: string,
  ) => PendingKycVerification | undefined;
}

export const usePendingKycStore = create<PendingKycState>()(
  persist(
    (set, get) => ({
      pendingVerifications: [],

      addPendingVerification: (sessionId: string) => {
        const now = Date.now();
        set(state => ({
          pendingVerifications: [
            // Remove any existing entry for this sessionId
            ...state.pendingVerifications.filter(v => v.sessionId !== sessionId),
            {
              sessionId,
              createdAt: now,
              status: 'pending',
              timeoutAt: now + VERIFICATION_TIMEOUT_MS,
            },
          ],
        }));
      },

      updateVerificationStatus: (
        sessionId: string,
        status: PendingKycStatus,
        errorMessage?: string,
        documentId?: string,
      ) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.map(v =>
            v.sessionId === sessionId
              ? {
                  ...v,
                  status,
                  errorMessage,
                  ...(documentId && { documentId }),
                }
              : v,
          ),
        }));
      },

      removePendingVerification: (sessionId: string) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.filter(
            v => v.sessionId !== sessionId,
          ),
        }));
      },

      removeExpiredVerifications: () => {
        const now = Date.now();
        set(state => ({
          pendingVerifications: state.pendingVerifications.filter(
            v => v.timeoutAt > now,
          ),
        }));
      },

      clearAllPendingVerifications: () => {
        set({ pendingVerifications: [] });
      },

      hasPendingVerification: () =>
        get().pendingVerifications.some(v => v.status === 'pending'),

      getPendingVerification: (sessionId: string) =>
        get().pendingVerifications.find(v => v.sessionId === sessionId),
    }),
    {
      name: 'pending-kyc-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
