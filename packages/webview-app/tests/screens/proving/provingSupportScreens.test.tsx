// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KycPendingScreen } from '../../../src/screens/proving/KycPendingScreen';
import { KycVerificationSuccessScreen } from '../../../src/screens/proving/KycVerificationSuccessScreen';
import { ProofHistoryScreen } from '../../../src/screens/proving/ProofHistoryScreen';
import { ProofSuccessBackupScreen } from '../../../src/screens/proving/ProofSuccessBackupScreen';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
  }),
}));

vi.mock('@selfxyz/euclid', () => ({
  LeftArrowIcon: () => null,
  QuestionCircleStrokeIcon: () => null,
  SelfLogo: () => null,
  KycPendingScreen: ({
    onCheckBackLater,
    onReceiveLiveUpdates,
  }: {
    onCheckBackLater: () => void;
    onReceiveLiveUpdates: () => void;
  }) => (
    <div>
      <button onClick={onCheckBackLater} type="button">
        Check back later
      </button>
      <button onClick={onReceiveLiveUpdates} type="button">
        Receive live updates
      </button>
    </div>
  ),
  KycVerificationSuccessScreen: ({ onGenerateProof }: { onGenerateProof: () => void }) => (
    <button onClick={onGenerateProof} type="button">
      Generate proof
    </button>
  ),
  ProofHistoryScreen: ({ onViewIdData, onClose }: { onViewIdData: () => void; onClose: () => void }) => (
    <div>
      <button onClick={onViewIdData} type="button">
        View ID data
      </button>
      <button onClick={onClose} type="button">
        Close history
      </button>
    </div>
  ),
  ProofSuccessBackupScreen: ({
    onBackupAccount,
    onRemindLater,
  }: {
    onBackupAccount: () => void;
    onRemindLater: () => void;
  }) => (
    <div>
      <button onClick={onBackupAccount} type="button">
        Back up account
      </button>
      <button onClick={onRemindLater} type="button">
        Remind later
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
        <Route path="/coming-soon" element={<LocationDisplay />} />
        <Route path="/settings/notifications" element={<LocationDisplay />} />
        <Route path="/settings/security" element={<LocationDisplay />} />
        <Route path="/proving" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('proving support screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    expect(screen.getByTestId('location').textContent).toBe(expected);
  };

  it('routes proof history ID-data CTA to the registered placeholder screen', () => {
    renderWithRoutes(['/proving/history'], '/proving/history', <ProofHistoryScreen />);

    fireEvent.click(screen.getByRole('button', { name: /view id data/i }));

    expectLocation('/coming-soon');
  });

  it('routes proof backup CTA into the security settings screen', () => {
    renderWithRoutes(['/proving/backup-prompt'], '/proving/backup-prompt', <ProofSuccessBackupScreen />);

    fireEvent.click(screen.getByRole('button', { name: /back up account/i }));

    expectLocation('/settings/security');
  });

  it('routes KYC pending live-updates CTA to notification settings', () => {
    renderWithRoutes(['/proving/kyc-pending'], '/proving/kyc-pending', <KycPendingScreen />);

    fireEvent.click(screen.getByRole('button', { name: /receive live updates/i }));

    expectLocation('/settings/notifications');
  });

  it('routes KYC success CTA back into proving flow', () => {
    renderWithRoutes(['/proving/kyc-success'], '/proving/kyc-success', <KycVerificationSuccessScreen />);

    fireEvent.click(screen.getByRole('button', { name: /generate proof/i }));

    expectLocation('/proving');
  });
});
