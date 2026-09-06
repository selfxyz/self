// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  pruneStoreReviewPrompts,
  type StoreReviewSnapshot,
} from '@/utils/storeReviewPolicy';

interface PersistedStoreReviewState extends StoreReviewSnapshot {
  lastCountedProofSessionId: string | null;
}

interface StoreReviewState extends PersistedStoreReviewState {
  // Session-only. Armed when the user acknowledges a verified proof and
  // consumed once Home has settled; never persisted so a killed app cannot
  // resurrect a prompt detached from the success moment.
  promptArmed: boolean;
  recordProofSuccess: (sessionId: string) => void;
  recordProofFailure: (now?: number) => void;
  recordPromptShown: (now?: number) => void;
  armPrompt: () => void;
  disarmPrompt: () => void;
}

export const STORE_REVIEW_STORE_VERSION = 1;

export const useStoreReviewStore = create<StoreReviewState>()(
  persist(
    set => ({
      successfulProofCount: 0,
      successfulProofCountAtLastPrompt: 0,
      lastPromptAt: null,
      promptTimestamps: [],
      lastFailureAt: null,
      lastCountedProofSessionId: null,
      promptArmed: false,

      recordProofSuccess: sessionId =>
        set(state =>
          state.lastCountedProofSessionId === sessionId
            ? state
            : {
                successfulProofCount: state.successfulProofCount + 1,
                lastCountedProofSessionId: sessionId,
              },
        ),
      recordProofFailure: (now = Date.now()) =>
        set({ lastFailureAt: now, promptArmed: false }),
      recordPromptShown: (now = Date.now()) =>
        set(state => ({
          lastPromptAt: now,
          successfulProofCountAtLastPrompt: state.successfulProofCount,
          promptTimestamps: [
            ...pruneStoreReviewPrompts(state.promptTimestamps, now),
            now,
          ],
        })),
      armPrompt: () => set({ promptArmed: true }),
      disarmPrompt: () => set({ promptArmed: false }),
    }),
    {
      name: 'store-review-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_REVIEW_STORE_VERSION,
      partialize: (state): PersistedStoreReviewState => ({
        successfulProofCount: state.successfulProofCount,
        successfulProofCountAtLastPrompt:
          state.successfulProofCountAtLastPrompt,
        lastPromptAt: state.lastPromptAt,
        promptTimestamps: state.promptTimestamps,
        lastFailureAt: state.lastFailureAt,
        lastCountedProofSessionId: state.lastCountedProofSessionId,
      }),
    },
  ),
);
