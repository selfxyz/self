// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityScreen } from '../../../src/screens/account/SecurityScreen';
import { SettingsScreen } from '../../../src/screens/account/SettingsScreen';
import { BackupMethodPickerScreen } from '../../../src/screens/recovery/BackupMethodPickerScreen';
import { LaunchRecoveryScreen } from '../../../src/screens/recovery/LaunchRecoveryScreen';
import { RecoveryFailureScreen } from '../../../src/screens/recovery/RecoveryFailureScreen';
import { RecoveryPhraseScreen } from '../../../src/screens/recovery/RecoveryPhraseScreen';
import { RecoverySuccessScreen } from '../../../src/screens/recovery/RecoverySuccessScreen';
import { SecretPhraseInputScreen } from '../../../src/screens/recovery/SecretPhraseInputScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn() };
const client = { id: 'client' };

const validPhrase = 'bacon rubber extend tonight rocket race ill wash flame expect oval street'.split(' ');
const previousMnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const previousSecret = 'prev-derived-key-stub';

const loadSelectedDocumentMock = vi.fn();
const validateRecoverySecretForDocumentMock = vi.fn();
const finalizeRecoveredDocumentRegistrationMock = vi.fn();
const storageState = new Map<string, string | null>();
const storageGetMock = vi.fn(async (key: string) => storageState.get(key) ?? null);
const storageSetMock = vi.fn(async (key: string, value: string) => {
  storageState.set(key, value);
});
const storageRemoveMock = vi.fn(async (key: string) => {
  storageState.delete(key);
});
const storageAdapter = {
  get: storageGetMock,
  set: storageSetMock,
  remove: storageRemoveMock,
};

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
    lifecycle,
    client,
  }),
}));

vi.mock('../../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({}),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  loadSelectedDocument: (...args: unknown[]) => loadSelectedDocumentMock(...args),
  validateRecoverySecretForDocument: (...args: unknown[]) => validateRecoverySecretForDocumentMock(...args),
  finalizeRecoveredDocumentRegistration: (...args: unknown[]) => finalizeRecoveredDocumentRegistrationMock(...args),
}));

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeStorageAdapter: () => storageAdapter,
}));

vi.mock('@selfxyz/euclid', () => ({
  borderRadius: {
    mdd: 14,
  },
  colors: {
    black: '#000',
    red600: '#f00',
    slate50: '#fafafa',
  },
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  fontFamily: {
    dinOT: 'DINOT',
  },
  fontWeight: {
    medium: 500,
  },
  ChatStrokeIcon: () => null,
  CloudKeyIcon: () => null,
  CodeIcon: () => null,
  DocumentDetailsIcon: () => null,
  LeftArrowIcon: () => null,
  LockIcon: () => null,
  NotificationIcon: () => null,
  QuestionCircleStrokeIcon: () => null,
  SelfLogo: () => null,
  ShareIcon: () => null,
  spacing: {
    mdLg: 16,
    xlLg: 24,
  },
  RecoveryPhrase: () => <div>Recovery phrase grid</div>,
  ZapShieldIcon: () => null,
  SettingsViewScreen: ({ sections }: { sections: Array<{ items: Array<{ label: string; onPress: () => void }> }> }) => (
    <div>
      {sections.flatMap(section =>
        section.items.map(item => (
          <button key={item.label} onClick={item.onPress} type="button">
            {item.label}
          </button>
        )),
      )}
    </div>
  ),
  SecurityScreen: ({
    onBackupAccount,
    onRestoreAccount,
    onRevealRecoveryPhrase,
  }: {
    onBackupAccount: () => void;
    onRestoreAccount: () => void;
    onRevealRecoveryPhrase: () => void;
  }) => (
    <div>
      <button onClick={onBackupAccount} type="button">
        Back up account
      </button>
      <button onClick={onRevealRecoveryPhrase} type="button">
        Reveal recovery phrase
      </button>
      <button onClick={onRestoreAccount} type="button">
        Restore account
      </button>
    </div>
  ),
  BackupMethodPickerScreen: ({ options }: { options: Array<{ label: string; onPress: () => void }> }) => (
    <div>
      {options.map(option => (
        <button key={option.label} onClick={option.onPress} type="button">
          {option.label}
        </button>
      ))}
    </div>
  ),
  RecoveryPhraseScreen: ({ onReveal, onCopy }: { onReveal: () => void; onCopy: () => void }) => (
    <div>
      <button onClick={onReveal} type="button">
        Reveal phrase
      </button>
      <button onClick={onCopy} type="button">
        Copy phrase
      </button>
    </div>
  ),
  LaunchRecoveryScreen: ({
    onEnterRecoveryPhrase,
    onClose,
  }: {
    onEnterRecoveryPhrase: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button onClick={onEnterRecoveryPhrase} type="button">
        Enter recovery phrase
      </button>
      <button onClick={onClose} type="button">
        Close recovery
      </button>
    </div>
  ),
  TopNavigationDialogue: ({ onEscape }: { onEscape: () => void }) => (
    <div>
      <button onClick={onEscape} type="button">
        Back
      </button>
    </div>
  ),
  SecretPhraseInput: ({
    onWordBlur,
    onWordChange,
  }: {
    onWordBlur?: (index: number) => void;
    onWordChange: (index: number, word: string) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          validPhrase.forEach((word, index) => {
            onWordChange(index, word);
            onWordBlur?.(index);
          });
        }}
        type="button"
      >
        Fill valid phrase
      </button>
      <button
        onClick={() => {
          ['abandon', 'ability', 'able'].forEach((word, index) => {
            onWordChange(index, word);
            onWordBlur?.(index);
          });
        }}
        type="button"
      >
        Fill invalid phrase
      </button>
    </div>
  ),
  Button: ({ disabled, onPress, text }: { disabled?: boolean; onPress: () => void; text?: string }) => (
    <button disabled={disabled} onClick={onPress} type="button">
      {text}
    </button>
  ),
  RecoverySuccessScreen: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} type="button">
      Finish recovery
    </button>
  ),
  RegistrationFailureScreen: ({
    copy,
    onDismiss,
    onTryDifferentMethod,
  }: {
    copy?: { dismiss?: string; tryDifferentMethod?: string };
    onDismiss: () => void;
    onTryDifferentMethod: () => void;
  }) => (
    <div>
      <button onClick={onDismiss} type="button">
        {copy?.dismiss ?? 'Dismiss'}
      </button>
      <button onClick={onTryDifferentMethod} type="button">
        {copy?.tryDifferentMethod ?? 'Try again'}
      </button>
    </div>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderRoutes = (initialEntries: string[]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<LocationDisplay />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/settings/security" element={<SecurityScreen />} />
        <Route path="/settings/backup" element={<BackupMethodPickerScreen />} />
        <Route path="/settings/recovery-phrase" element={<RecoveryPhraseScreen />} />
        <Route path="/recovery" element={<LaunchRecoveryScreen />} />
        <Route path="/recovery/phrase-input" element={<SecretPhraseInputScreen />} />
        <Route path="/recovery/failure" element={<RecoveryFailureScreen />} />
        <Route path="/recovery/success" element={<RecoverySuccessScreen />} />
        <Route path="/tunnel/proof/generating" element={<LocationDisplay />} />
        <Route path="/coming-soon" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('recovery support screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageState.clear();
    storageState.set('self_mnemonic', previousMnemonic);
    storageState.set('self_private_key', previousSecret);
    loadSelectedDocumentMock.mockResolvedValue({
      data: { documentCategory: 'passport' },
      metadata: { id: 'doc-1' },
    });
    validateRecoverySecretForDocumentMock.mockResolvedValue({
      isRegistered: true,
      csca: 'csca-pem',
    });
    finalizeRecoveredDocumentRegistrationMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    const locations = screen.getAllByTestId('location');
    expect(locations.at(-1)?.textContent).toBe(expected);
  };

  it('stitches settings through security to recovery phrase backup flow', () => {
    renderRoutes(['/settings']);

    fireEvent.click(screen.getByRole('button', { name: /security/i }));
    expectLocation('/settings/security');

    fireEvent.click(screen.getByRole('button', { name: /back up account/i }));
    expectLocation('/settings/backup');

    fireEvent.click(screen.getByRole('button', { name: /recovery phrase/i }));
    expectLocation('/settings/recovery-phrase');
  });

  it('stitches settings through security to recovery restore success flow', async () => {
    renderRoutes(['/settings']);

    fireEvent.click(screen.getByRole('button', { name: /security/i }));
    expectLocation('/settings/security');

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }));
    expectLocation('/recovery');

    fireEvent.click(screen.getByRole('button', { name: /enter recovery phrase/i }));
    expectLocation('/recovery/phrase-input');

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/recovery/success');
    });
  });

  it('carries returnTo and resumes the caller route directly after recovery', async () => {
    renderRoutes(['/recovery/phrase-input?returnTo=%2Ftunnel%2Fproof%2Fgenerating']);

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/tunnel/proof/generating');
    });
  });

  it('rejects an invalid mnemonic and stays on phrase input', async () => {
    renderRoutes(['/recovery/phrase-input']);
    expectLocation('/recovery/phrase-input');

    fireEvent.click(screen.getByRole('button', { name: /fill invalid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/recovery/phrase-input');
    });

    expect(haptic.trigger).toHaveBeenCalledWith('error');
    expect(analytics.trackEvent).toHaveBeenCalledWith('recovery_phrase_rejected', {
      reason: 'invalid_mnemonic',
      wordCount: 3,
    });
    expect(screen.getByRole('alert').textContent).toMatch(/enter a valid recovery phrase/i);
  });

  it('launch recovery close returns to previous screen', () => {
    renderRoutes(['/settings/security', '/recovery']);
    expectLocation('/recovery');

    fireEvent.click(screen.getByRole('button', { name: /close recovery/i }));
    expectLocation('/settings/security');
  });

  it('stays on phrase input and shows an inline error for a valid but non-matching phrase', async () => {
    validateRecoverySecretForDocumentMock.mockResolvedValue({
      isRegistered: false,
    });

    renderRoutes(['/recovery/phrase-input']);

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/recovery/phrase-input');
    });

    expect(screen.getByRole('alert').textContent).toMatch(/does not match this identity/i);
    expect(finalizeRecoveredDocumentRegistrationMock).not.toHaveBeenCalled();

    const analyticsPayloads = analytics.trackEvent.mock.calls.map(([, payload]) => JSON.stringify(payload ?? {}));
    expect(analyticsPayloads.join(' ')).not.toContain(validPhrase.join(' '));
    expect(analyticsPayloads.join(' ')).not.toContain('0x');
  });

  it('navigates to recovery failure when no selected document exists', async () => {
    loadSelectedDocumentMock.mockResolvedValue(null);

    renderRoutes(['/recovery/phrase-input']);

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/recovery/failure');
    });
  });

  it('navigates to recovery failure and restores previous secrets when storage write fails', async () => {
    storageSetMock.mockImplementationOnce(async (key: string, value: string) => {
      storageState.set(key, value);
    });
    storageSetMock.mockImplementationOnce(async () => {
      throw new Error('storage write failed');
    });

    renderRoutes(['/recovery/phrase-input']);

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expectLocation('/recovery/failure');
    });

    expect(storageState.get('self_mnemonic')).toBe(previousMnemonic);
    expect(storageState.get('self_private_key')).toBe(previousSecret);
    expect(finalizeRecoveredDocumentRegistrationMock).not.toHaveBeenCalled();
  });

  it('locks the submit button after five consecutive mismatches', async () => {
    validateRecoverySecretForDocumentMock.mockResolvedValue({
      isRegistered: false,
    });

    renderRoutes(['/recovery/phrase-input']);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
      fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
      await waitFor(() => {
        expectLocation('/recovery/phrase-input');
      });
    }

    const continueButton = screen.getByRole('button', { name: /try again in \d+s/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/too many recovery attempts/i);
  });

  it('lets the failure screen retry phrase entry or dismiss home', async () => {
    renderRoutes(['/recovery/failure?returnTo=%2Ftunnel%2Fproof%2Fgenerating']);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expectLocation('/recovery/phrase-input');
    });

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => {
      expectLocation('/tunnel/proof/generating');
    });

    renderRoutes(['/recovery/failure']);
    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    await waitFor(() => {
      expectLocation('/');
    });
  });

  it('does not update state after unmount during async submit', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolveValidation: ((value: { isRegistered: boolean; csca?: string }) => void) | null = null;

    validateRecoverySecretForDocumentMock.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveValidation = resolve;
        }),
    );

    const rendered = renderRoutes(['/recovery/phrase-input']);

    fireEvent.click(screen.getByRole('button', { name: /fill valid phrase/i }));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    rendered.unmount();
    const resolveValidationPromise = resolveValidation as
      | ((value: { isRegistered: boolean; csca?: string }) => void)
      | null;
    if (resolveValidationPromise) {
      resolveValidationPromise({ isRegistered: true, csca: 'csca-pem' });
    }

    await Promise.resolve();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
