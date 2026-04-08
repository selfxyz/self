// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecoveryPhraseScreen } from '../../../src/screens/recovery/RecoveryPhraseScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const storageState = new Map<string, string>();
const storageGet = vi.fn<(key: string) => Promise<string | null>>();

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
    set: vi.fn(async (key: string, value: string) => {
      storageState.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      storageState.delete(key);
    }),
  }),
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  colors: {
    slate50: '#f8fafc',
    blue50: '#eff6ff',
    blue100: '#dbeafe',
    black: '#000000',
    slate500: '#64748b',
  },
  spacing: {
    mdLg: 24,
    xlLg: 32,
    smLg: 16,
    smPlus: 12,
  },
  borderRadius: {
    mdd: 14,
  },
  fontFamily: {
    dinOT: 'DIN OT',
  },
  fontWeight: {
    medium: 500,
  },
  LeftArrowIcon: () => null,
  TopNavigationDialogue: ({ onEscape }: { onEscape: () => void }) => (
    <button onClick={onEscape} type="button">
      Back recovery phrase
    </button>
  ),
  RecoveryPhrase: ({
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
  RecoveryPhraseScreen: () => null,
}));

describe('RecoveryPhraseScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    storageState.clear();
    storageGet.mockImplementation(async key => storageState.get(key) ?? null);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
  });

  it('reveals placeholders when secure storage is empty', async () => {
    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('variant').textContent).toBe('revealed');
      expect(screen.getByTestId('words').textContent).not.toBe('');
      expect(storageGet).toHaveBeenCalledWith('self_mnemonic');
    });
  });

  it('copies the resolved words to the clipboard', async () => {
    storageState.set('self_mnemonic', validMnemonic);

    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('words').textContent).toBe(validMnemonic);
    });

    fireEvent.click(screen.getByRole('button', { name: /copy phrase/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(validMnemonic);
      expect(screen.getByTestId('variant').textContent).toBe('copied');
    });
  });

  it('parses legacy json-wrapped mnemonic payloads', async () => {
    storageState.set('self_mnemonic', JSON.stringify({ phrase: validMnemonic }));

    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('words').textContent).toBe(validMnemonic);
    });
  });

  it('does not switch to copied when clipboard write fails', async () => {
    storageState.set('self_mnemonic', validMnemonic);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    });

    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('words').textContent).toBe(validMnemonic);
    });

    fireEvent.click(screen.getByRole('button', { name: /copy phrase/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(validMnemonic);
      expect(screen.getByTestId('variant').textContent).toBe('revealed');
      expect(haptic.trigger).toHaveBeenCalledWith('error');
    });
  });

  it('falls back to a fake mnemonic in dev when storage is unavailable', async () => {
    vi.stubEnv('DEV', true);
    storageGet.mockRejectedValue(new Error('storage unavailable'));

    render(
      <MemoryRouter>
        <RecoveryPhraseScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal phrase/i }));

    await waitFor(() => {
      expect(screen.getByTestId('words').textContent).toBe(
        'jump car stuff tiger camp core wasp dream harlem sales mistake wish expose moose dribble noodle tornado peanut install install meat snail truck virgo',
      );
      expect(screen.getByTestId('variant').textContent).toBe('revealed');
    });
  });
});
