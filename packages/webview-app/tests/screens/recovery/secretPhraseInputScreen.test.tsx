// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretPhraseInputScreen } from '../../../src/screens/recovery/SecretPhraseInputScreen';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn(), setResult: vi.fn() };
const client = { id: 'client' };

const loadSelectedDocumentMock = vi.fn();
const validateRecoverySecretForDocumentMock = vi.fn();
const finalizeRecoveredDocumentRegistrationMock = vi.fn();
const restoreSecretFromMnemonicMock = vi.fn();
const readStoredSecretSnapshotMock = vi.fn();
const restoreStoredSecretSnapshotMock = vi.fn();

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    client,
    analytics,
    haptic,
    lifecycle,
  }),
}));

vi.mock('../../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({}),
}));

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeStorageAdapter: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  loadSelectedDocument: (...args: unknown[]) => loadSelectedDocumentMock(...args),
  validateRecoverySecretForDocument: (...args: unknown[]) => validateRecoverySecretForDocumentMock(...args),
  finalizeRecoveredDocumentRegistration: (...args: unknown[]) => finalizeRecoveredDocumentRegistrationMock(...args),
}));

vi.mock('../../../src/utils/secretManager', () => ({
  derivePrivateKey: (mnemonic: string) => `derived-from-${mnemonic.split(' ')[0]}`,
  readStoredSecretSnapshot: (...args: unknown[]) => readStoredSecretSnapshotMock(...args),
  restoreSecretFromMnemonic: (...args: unknown[]) => restoreSecretFromMnemonicMock(...args),
  restoreStoredSecretSnapshot: (...args: unknown[]) => restoreStoredSecretSnapshotMock(...args),
}));

vi.mock('../../../src/utils/insets', () => ({
  WEB_SAFE_AREA: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
  },
}));

const VALID_12_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

vi.mock('@selfxyz/euclid', () => ({
  Button: ({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) => (
    <button onClick={onPress} disabled={disabled ?? false} type="button">
      {text}
    </button>
  ),
  colors: { slate50: '#f8fafc', black: '#000', white: '#fff', red600: '#dc2626', slate300: '#cbd5e1' },
  fontFamily: { dinOT: 'DIN OT' },
  fontWeight: { medium: 500 },
  spacing: { md: 12, mdLg: 16, lg: 20, xl: 24, xlLg: 32, sm: 8 },
  LeftArrowIcon: () => null,
  SecretPhraseInput: ({ onWordChange }: { onWordChange: (index: number, word: string) => void }) => {
    useEffect(() => {
      VALID_12_MNEMONIC.split(' ').forEach((w, i) => onWordChange(i, w));
    }, []);
    return <div data-testid="phrase-input" />;
  },
  TopNavigationDialogue: () => <div />,
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderScreen = (initialEntry = '/recover/phrase-input') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/recover/phrase-input" element={<SecretPhraseInputScreen />} />
        <Route path="/recover/failure" element={<LocationDisplay />} />
        <Route path="/recover/success" element={<LocationDisplay />} />
        <Route path="/capture/kyc" element={<LocationDisplay />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

async function fillWordsAndSubmit() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

describe('SecretPhraseInputScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreSecretFromMnemonicMock.mockResolvedValue({ secret: 'derived-secret' });
    readStoredSecretSnapshotMock.mockResolvedValue({ mnemonic: null, secret: null });
    restoreStoredSecretSnapshotMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    const locations = screen.getAllByTestId('location');
    expect(locations.at(-1)?.textContent).toBe(expected);
  };

  it('navigates to failure when loadSelectedDocument returns null', async () => {
    loadSelectedDocumentMock.mockResolvedValue(null);

    renderScreen();
    await fillWordsAndSubmit();

    await waitFor(() => {
      expectLocation('/recover/failure');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('recovery_phrase_failed', {
      reason: 'document_unavailable',
    });
    expect(haptic.trigger).toHaveBeenCalledWith('error');
  });

  it('navigates to /capture/kyc for a mock document', async () => {
    loadSelectedDocumentMock.mockResolvedValue({
      data: { documentCategory: 'passport' },
      metadata: { mock: true },
    });

    renderScreen();
    await fillWordsAndSubmit();

    await waitFor(() => {
      expectLocation('/capture/kyc');
    });

    expect(restoreSecretFromMnemonicMock).toHaveBeenCalled();
  });

  it('does not navigate after unmount during async validation', async () => {
    let resolveDocument!: (value: unknown) => void;
    loadSelectedDocumentMock.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveDocument = resolve;
        }),
    );

    const { unmount } = renderScreen();
    await fillWordsAndSubmit();

    unmount();

    await act(async () => {
      resolveDocument(null);
      await new Promise(r => setTimeout(r, 0));
    });

    expect(haptic.trigger).toHaveBeenCalledWith('error');
  });

  it('navigates to failure when storage write fails during recovery', async () => {
    loadSelectedDocumentMock.mockResolvedValue({
      data: { documentCategory: 'passport' },
      metadata: { mock: false, isRegistered: true },
    });
    validateRecoverySecretForDocumentMock.mockResolvedValue({
      isRegistered: true,
      csca: 'matching-csca',
    });
    restoreSecretFromMnemonicMock.mockRejectedValue(new Error('write failed'));

    renderScreen();
    await fillWordsAndSubmit();

    await waitFor(() => {
      expectLocation('/recover/failure');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('recovery_phrase_failed', {
      reason: 'storage_write_failed',
    });
    expect(restoreStoredSecretSnapshotMock).toHaveBeenCalled();
  });
});
