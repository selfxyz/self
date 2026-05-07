// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

export type GoogleUsatEntryPoint = 'qr_scan' | 'deeplink' | 'earn_points';

interface GoogleUsatBlockState {
  isOpen: boolean;
  entryPoint: GoogleUsatEntryPoint | null;
  open: (entryPoint: GoogleUsatEntryPoint) => void;
  close: () => void;
}

export const useGoogleUsatBlockStore = create<GoogleUsatBlockState>(set => ({
  isOpen: false,
  entryPoint: null,
  open: entryPoint => {
    set({ isOpen: true, entryPoint });
  },
  close: () => {
    set({ isOpen: false, entryPoint: null });
  },
}));
