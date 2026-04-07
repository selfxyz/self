// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictDetectedScreen } from '../../../src/screens/onboarding/ConflictDetectedScreen';
import { PushNotificationPromptScreen } from '../../../src/screens/onboarding/PushNotificationPromptScreen';
import { ScanSuccessScreen } from '../../../src/screens/onboarding/ScanSuccessScreen';
import { SocialSignOnMethodPickerScreen } from '../../../src/screens/onboarding/SocialSignOnMethodPickerScreen';
import { OnboardingRecoveryPhraseScreen } from '../../../src/screens/recovery/RecoveryPhraseScreen';
import { shouldUseHistoryBack } from '../../../src/utils/mockOnboardingFlow';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
  }),
}));

vi.mock('../../../src/components/MockRegistrationFailureButton', () => ({
  MockRegistrationFailureButton: () => null,
}));

vi.mock('../../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({}),
}));

vi.mock('../../../src/utils/mockDocumentStore', () => ({
  mockDocumentStore: {
    addDocument: vi.fn(),
  },
}));

const storageGet = vi.fn<() => Promise<string | null>>();

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeStorageAdapter: () => ({
    get: storageGet,
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../src/utils/mockOnboardingFlow', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/utils/mockOnboardingFlow')>();
  return { ...actual, shouldUseHistoryBack: vi.fn(() => false) };
});

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
  TopNavigationDialogue: () => null,
  RecoveryPhrase: () => null,
  ScanSuccessScreen: ({ onClose, onFinish }: { onClose: () => void; onFinish: () => void }) => (
    <div>
      <button onClick={onClose} type="button">
        Close success
      </button>
      <button onClick={onFinish} type="button">
        Finish success
      </button>
    </div>
  ),
  SocialSignOnMethodPickerScreen: ({ onDismiss }: { onDismiss: () => void }) => (
    <button onClick={onDismiss} type="button">
      Dismiss backup
    </button>
  ),
  RecoveryPhraseScreen: ({
    onBack,
    onAppleBackup,
    onGoogleBackup,
  }: {
    onBack: () => void;
    onAppleBackup: () => void;
    onGoogleBackup: () => void;
  }) => (
    <div>
      <button onClick={onBack} type="button">
        Back recovery phrase
      </button>
      <button onClick={onAppleBackup} type="button">
        Continue with Apple
      </button>
      <button onClick={onGoogleBackup} type="button">
        Continue with Google
      </button>
    </div>
  ),
  ConflictDetectedScreen: ({
    onClose,
    onPrimaryAction,
    onSecondaryAction,
  }: {
    onClose: () => void;
    onPrimaryAction: () => void;
    onSecondaryAction: () => void;
  }) => (
    <div>
      <button onClick={onClose} type="button">
        Close conflict
      </button>
      <button onClick={onPrimaryAction} type="button">
        Continue with existing
      </button>
      <button onClick={onSecondaryAction} type="button">
        Create new account
      </button>
    </div>
  ),
  PushNotificationPromptScreen: ({ onClose, onDismiss }: { onClose?: () => void; onDismiss: () => void }) => (
    <div>
      <button onClick={onClose} type="button">
        Close notifications
      </button>
      <button onClick={onDismiss} type="button">
        Dismiss notifications
      </button>
    </div>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderWithRoutes = (
  initialEntries: string[],
  routePath: string,
  element: React.ReactNode,
  initialIndex = initialEntries.length - 1,
) =>
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/onboarding/backup" element={<LocationDisplay />} />
        <Route path="/onboarding/recovery-phrase" element={<LocationDisplay />} />
        <Route path="/onboarding/signin" element={<LocationDisplay />} />
        <Route path="/onboarding/notifications" element={<LocationDisplay />} />
        <Route path="/onboarding/success" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('registration prompt screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageGet.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    expect(screen.getByTestId('location').textContent).toBe(expected);
  };

  it('routes scan success finish into the backup prompt chain', () => {
    renderWithRoutes(['/onboarding/success'], '/onboarding/success', <ScanSuccessScreen />);

    fireEvent.click(screen.getByRole('button', { name: /finish success/i }));

    expectLocation('/onboarding/recovery-phrase?mock=default');
  });

  it('advances onboarding recovery phrase actions into notifications', () => {
    renderWithRoutes(
      ['/onboarding/recovery-phrase?mock=existing-account'],
      '/onboarding/recovery-phrase',
      <OnboardingRecoveryPhraseScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue with apple/i }));

    expectLocation('/onboarding/notifications?mock=existing-account');
  });

  it('routes the google onboarding recovery phrase action into notifications', () => {
    renderWithRoutes(
      ['/onboarding/recovery-phrase?mock=default'],
      '/onboarding/recovery-phrase',
      <OnboardingRecoveryPhraseScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expectLocation('/onboarding/notifications?mock=default');
  });

  it('falls back to scan success when closing onboarding recovery phrase without history', () => {
    renderWithRoutes(
      ['/onboarding/recovery-phrase?mock=default'],
      '/onboarding/recovery-phrase',
      <OnboardingRecoveryPhraseScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /back recovery phrase/i }));

    expectLocation('/onboarding/success?mock=default');
  });

  it('preserves prompt mock state when dismissing the backup method picker', () => {
    renderWithRoutes(
      ['/onboarding/backup?mock=existing-account'],
      '/onboarding/backup',
      <SocialSignOnMethodPickerScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss backup/i }));

    expectLocation('/onboarding/notifications?mock=existing-account');
  });

  it('continues the conflict placeholder flow through sign-in on the primary action', () => {
    renderWithRoutes(
      ['/onboarding/conflict?mock=existing-account'],
      '/onboarding/conflict',
      <ConflictDetectedScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue with existing/i }));

    expectLocation('/onboarding/signin?mock=existing-account');
  });

  it('uses header back on conflict to return to the prior prompt screen', () => {
    vi.mocked(shouldUseHistoryBack).mockReturnValue(true);
    renderWithRoutes(
      ['/onboarding/signin?mock=existing-account', '/onboarding/conflict?mock=existing-account'],
      '/onboarding/conflict',
      <ConflictDetectedScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close conflict/i }));

    expectLocation('/onboarding/signin?mock=existing-account');
  });

  it('returns home when dismissing the push notification prompt', () => {
    renderWithRoutes(
      ['/onboarding/notifications?mock=default'],
      '/onboarding/notifications',
      <PushNotificationPromptScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss notifications/i }));

    expectLocation('/');
  });

  it('uses header back on notifications to return to the recovery phrase screen', () => {
    vi.mocked(shouldUseHistoryBack).mockReturnValue(true);
    renderWithRoutes(
      ['/onboarding/recovery-phrase?mock=default', '/onboarding/notifications?mock=default'],
      '/onboarding/notifications',
      <PushNotificationPromptScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close notifications/i }));

    expectLocation('/onboarding/recovery-phrase?mock=default');
  });
});
