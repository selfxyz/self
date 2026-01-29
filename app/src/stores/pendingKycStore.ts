// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingKycStatus,
  PendingKycVerification,
} from '@selfxyz/common/utils/types';

const VERIFICATION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours

interface PendingKycState {
  pendingVerifications: PendingKycVerification[];

  addPendingVerification: (userId: string) => void;
  updateVerificationStatus: (
    userId: string,
    status: PendingKycStatus,
    errorMessage?: string,
  ) => void;
  removePendingVerification: (userId: string) => void;
  removeExpiredVerifications: () => void;
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
      ) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.map(v =>
            v.userId === userId ? { ...v, status, errorMessage } : v,
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
