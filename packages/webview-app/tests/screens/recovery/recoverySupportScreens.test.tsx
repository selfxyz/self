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
import { RecoveryPhraseScreen } from '../../../src/screens/recovery/RecoveryPhraseScreen';
import { RecoverySuccessScreen } from '../../../src/screens/recovery/RecoverySuccessScreen';
import { SecretPhraseInputScreen } from '../../../src/screens/recovery/SecretPhraseInputScreen';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
    lifecycle,
  }),
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
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
  LaunchRecoveryScreen: ({ onEnterRecoveryPhrase }: { onEnterRecoveryPhrase: () => void }) => (
    <button onClick={onEnterRecoveryPhrase} type="button">
      Enter recovery phrase
    </button>
  ),
  SecretPhraseInputScreen: ({ onSubmit }: { onSubmit: (words: string[]) => void }) => (
    <button onClick={() => onSubmit(['abandon', 'ability', 'able'])} type="button">
      Submit phrase
    </button>
  ),
  RecoverySuccessScreen: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} type="button">
      Finish recovery
    </button>
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
        <Route path="/recovery/success" element={<RecoverySuccessScreen />} />
        <Route path="/coming-soon" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('recovery support screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    expect(screen.getByTestId('location').textContent).toBe(expected);
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

  it('stitches settings through security to recovery restore success flow', () => {
    renderRoutes(['/settings']);

    fireEvent.click(screen.getByRole('button', { name: /security/i }));
    expectLocation('/settings/security');

    fireEvent.click(screen.getByRole('button', { name: /restore account/i }));
    expectLocation('/recovery');

    fireEvent.click(screen.getByRole('button', { name: /enter recovery phrase/i }));
    expectLocation('/recovery/phrase-input');

    fireEvent.click(screen.getByRole('button', { name: /submit phrase/i }));
    expectLocation('/recovery/success');
  });
});
