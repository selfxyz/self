// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

export type VerificationGateEntryPoint = 'qr_scan' | 'deeplink' | 'earn_points';
export type VerificationGateReason = 'google_usat_high_security_required';

export interface VerificationGatePayload {
  reason: VerificationGateReason;
  entryPoint: VerificationGateEntryPoint;
  requesterName?: string;
}

interface VerificationGateState {
  isOpen: boolean;
  reason: VerificationGateReason | null;
  entryPoint: VerificationGateEntryPoint | null;
  requesterName: string | null;
  open: (payload: VerificationGatePayload) => void;
  close: () => void;
}

export const useVerificationGateStore = create<VerificationGateState>(set => ({
  isOpen: false,
  reason: null,
  entryPoint: null,
  requesterName: null,
  open: ({ reason, entryPoint, requesterName }) => {
    set({
      isOpen: true,
      reason,
      entryPoint,
      requesterName: requesterName ?? null,
    });
  },
  close: () => {
    set({ isOpen: false, reason: null, entryPoint: null, requesterName: null });
  },
}));
