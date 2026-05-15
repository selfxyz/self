// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNfcTroubleStore } from '@/stores/nfcTroubleStore';

describe('useNfcTroubleStore', () => {
  beforeEach(() => {
    useNfcTroubleStore.getState().reset();
  });

  it('starts with options hidden', () => {
    expect(useNfcTroubleStore.getState().optionsRevealed).toBe(false);
  });

  it('reveals options after revealOptions is called', () => {
    useNfcTroubleStore.getState().revealOptions();
    expect(useNfcTroubleStore.getState().optionsRevealed).toBe(true);
  });

  it('resets options to hidden after reset is called', () => {
    useNfcTroubleStore.getState().revealOptions();
    expect(useNfcTroubleStore.getState().optionsRevealed).toBe(true);

    useNfcTroubleStore.getState().reset();
    expect(useNfcTroubleStore.getState().optionsRevealed).toBe(false);
  });

  it('keeps options revealed across multiple reveal calls', () => {
    useNfcTroubleStore.getState().revealOptions();
    useNfcTroubleStore.getState().revealOptions();
    expect(useNfcTroubleStore.getState().optionsRevealed).toBe(true);
  });
});
