// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RecoveryPhraseScreen } from '../../../src/screens/recovery/RecoveryPhraseScreen';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };

const storageGet = vi.fn<() => Promise<string | null>>();

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
  }),
}));

vi.mock('../../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({}),
}));

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeStorageAdapter: () => ({
    get: storageGet,
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  RecoveryPhraseScreen: ({
    words,
    variant,
    onReveal,
    onCopy,
  }: {
    words?: string[];
    variant: string;
    onReveal: () => void;
    onCopy: () => void;
  }) => (
    <div>
      <div data-testid="variant">{variant}</div>
      <div data-testid="words">{words?.join(' ') ?? ''}</div>
      <button onClick={onReveal} type="button">
        Reveal phrase
      </button>
      <button onClick={onCopy} type="button">
        Copy phrase
      </button>
    </div>
  ),
}));

describe('RecoveryPhraseScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageGet.mockResolvedValue(null);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a dev fallback mnemonic when secure storage is empty', async () => {
    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('variant').textContent).toBe('revealed');
      expect(screen.getByTestId('words').textContent).toContain('abandon ability able');
    });
  });

  it('copies the resolved words to the clipboard', async () => {
    storageGet.mockResolvedValue(JSON.stringify({ phrase: 'alpha beta gamma' }));

    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('words').textContent).toBe('alpha beta gamma');
    });

    fireEvent.click(screen.getByRole('button', { name: /copy phrase/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('alpha beta gamma');
      expect(screen.getByTestId('variant').textContent).toBe('copied');
    });
  });
});
