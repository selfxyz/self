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

vi.mock('../../../src/utils/mockDocumentStore', () => ({
  mockDocumentStore: {
    addDocument: vi.fn(),
  },
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
        <Route path="/onboarding/signin" element={<LocationDisplay />} />
        <Route path="/onboarding/notifications" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('registration prompt screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expectLocation('/onboarding/backup?mock=default');
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

  it('uses header back on notifications to return to the backup screen', () => {
    vi.mocked(shouldUseHistoryBack).mockReturnValue(true);
    renderWithRoutes(
      ['/onboarding/backup?mock=default', '/onboarding/notifications?mock=default'],
      '/onboarding/notifications',
      <PushNotificationPromptScreen />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close notifications/i }));

    expectLocation('/onboarding/backup?mock=default');
  });
});
