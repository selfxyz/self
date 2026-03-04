// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingKycStatus,
  PendingKycVerification,
} from '@selfxyz/new-common';

const VERIFICATION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours TODO seshanth

interface PendingKycState {
  pendingVerifications: PendingKycVerification[];

  addPendingVerification: (userId: string) => void;
  updateVerificationStatus: (
    userId: string,
    status: PendingKycStatus,
    errorMessage?: string,
    documentId?: string,
  ) => void;
  removePendingVerification: (userId: string) => void;
  removeExpiredVerifications: () => void;
  clearAllPendingVerifications: () => void;
  hasPendingVerification: () => boolean;
  getPendingVerification: (
    userId: string,
  ) => PendingKycVerification | undefined;
}

export const usePendingKycStore = create<PendingKycState>()(
  persist(
    (set, get) => ({
      pendingVerifications: [],

      addPendingVerification: (userId: string) => {
        const now = Date.now();
        set(state => ({
          pendingVerifications: [
            // Remove any existing entry for this userId
            ...state.pendingVerifications.filter(v => v.userId !== userId),
            {
              userId,
              createdAt: now,
              status: 'pending',
              timeoutAt: now + VERIFICATION_TIMEOUT_MS,
            },
          ],
        }));
      },

      updateVerificationStatus: (
        userId: string,
        status: PendingKycStatus,
        errorMessage?: string,
        documentId?: string,
      ) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.map(v =>
            v.userId === userId
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

      removePendingVerification: (userId: string) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.filter(
            v => v.userId !== userId,
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

      getPendingVerification: (userId: string) =>
        get().pendingVerifications.find(v => v.userId === userId),
    }),
    {
      name: 'pending-kyc-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
