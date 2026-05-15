// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

interface NfcTroubleState {
  optionsRevealed: boolean;
  revealOptions: () => void;
  reset: () => void;
}

// Tracks whether "Open NFC Options" should be visible on the
// "Having trouble verifying your ID?" sheet. Hidden on first scan attempt,
// revealed after the first failure, and persists for the rest of the
// process session.
export const useNfcTroubleStore = create<NfcTroubleState>(set => ({
  optionsRevealed: false,
  revealOptions: () => set({ optionsRevealed: true }),
  reset: () => set({ optionsRevealed: false }),
}));
