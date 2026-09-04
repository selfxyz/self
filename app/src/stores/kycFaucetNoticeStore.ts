// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type { KycFaucetNoticeHandlers } from '@/integrations/kyc/faucetNotice';

interface KycFaucetNoticeState {
  isOpen: boolean;
  isContinuing: boolean;
  onContinue: KycFaucetNoticeHandlers['onContinue'] | null;
  onDecline: (() => void) | null;
  open: (handlers: KycFaucetNoticeHandlers) => void;
  markContinuing: () => void;
  close: () => void;
}

export const useKycFaucetNoticeStore = create<KycFaucetNoticeState>(set => ({
  isOpen: false,
  isContinuing: false,
  onContinue: null,
  onDecline: null,
  open: ({ onContinue, onDecline }) =>
    set({
      isOpen: true,
      isContinuing: false,
      onContinue,
      onDecline: onDecline ?? null,
    }),
  markContinuing: () => set({ isContinuing: true }),
  close: () =>
    set({
      isOpen: false,
      isContinuing: false,
      onContinue: null,
      onDecline: null,
    }),
}));

/**
 * Store-driven variant of the faucet notice for callers without access to the
 * FeedbackProvider modal (anything mounted above it, e.g. selfClientProvider).
 * Rendered by KycFaucetNoticeModal at the navigation root.
 */
export const showKycFaucetNotice = (handlers: KycFaucetNoticeHandlers) =>
  useKycFaucetNoticeStore.getState().open(handlers);
