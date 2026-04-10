// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TunnelDiscloseScreen } from '../../../src/screens/tunnel/TunnelDiscloseScreen';
import { TunnelProvingScreen } from '../../../src/screens/tunnel/TunnelProvingScreen';
import { TunnelRecoveryRequiredScreen } from '../../../src/screens/tunnel/TunnelRecoveryRequiredScreen';
import { TunnelResultScreen } from '../../../src/screens/tunnel/TunnelResultScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn(), setResult: vi.fn() };
const client = { id: 'client' };

const initMock = vi.fn();
const loadSelectedDocumentMock = vi.fn();

type MockStoreState = {
  currentState: string | null;
  error_code: string | null;
  reason: string | null;
  passportData: { documentCategory?: string } | null;
  init: typeof initMock;
};

let storeState: MockStoreState = {
  currentState: null,
  error_code: null,
  reason: null,
  passportData: null,
  init: initMock,
};

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    client,
    analytics,
    haptic,
    lifecycle,
  }),
}));

vi.mock('../../../src/providers/VerificationRequestProvider', () => ({
  useVerificationRequest: () => ({
    verificationId: 'verification-123',
    request: { userId: 'user-123' },
    appName: 'Self Test App',
    appEndpoint: 'https://example.com',
    timestamp: '2026-03-31T12:00:00.000Z',
  }),
}));

vi.mock('../../../src/utils/selfAppContext', () => ({
  initSelfAppFromRequest: vi.fn(),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  loadSelectedDocument: (...args: unknown[]) => loadSelectedDocumentMock(...args),
  useProvingStore: (selector: (state: MockStoreState) => unknown) => selector(storeState),
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({
    top,
    bottom,
    left,
    right,
  }: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }) => ({
    insets: { top, bottom, left, right },
  }),
  SelfLogo: () => null,
  ProofGenerationScreen: ({ step }: { step: string }) => <div>{`proof-generation:${step}`}</div>,
  ProofProgressScreen: ({ step }: { step: string }) => <div>{`proof-progress:${step}`}</div>,
  ProofSuccessScreen: ({ onContinue, onViewDetails }: { onContinue: () => void; onViewDetails: () => void }) => (
    <div>
      <button onClick={onContinue} type="button">
        Continue
      </button>
      <button onClick={onViewDetails} type="button">
        View details
      </button>
    </div>
  ),
  ProofFailureScreen: ({
    failureDescription,
    onRetry,
    onViewDetails,
    onClose,
  }: {
    failureDescription?: string;
    onRetry: () => void;
    onViewDetails: () => void;
    onClose: () => void;
  }) => (
    <div>
      <div>{failureDescription}</div>
      <button onClick={onRetry} type="button">
        Retry
      </button>
      <button onClick={onViewDetails} type="button">
        View details
      </button>
      <button onClick={onClose} type="button">
        Close
      </button>
    </div>
  ),
  ConflictDetectedScreen: ({
    onPrimaryAction,
    onSecondaryAction,
  }: {
    onPrimaryAction: () => void;
    onSecondaryAction: () => void;
  }) => (
    <div>
      <button onClick={onPrimaryAction} type="button">
        Recover with phrase
      </button>
      <button onClick={onSecondaryAction} type="button">
        Cancel
      </button>
    </div>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderResultRoute = (
  initialEntry:
    | string
    | {
        pathname: string;
        state?: unknown;
      },
) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/tunnel/proof/result" element={<TunnelResultScreen />} />
        <Route path="/tunnel/proof/generating" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/disclose" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/receipt" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderProvingRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tunnel/proof/generating']}>
      <Routes>
        <Route path="/tunnel/proof/generating" element={<TunnelProvingScreen />} />
        <Route path="/tunnel/recovery-required" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/receipt" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderDiscloseRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tunnel/proof/disclose']}>
      <Routes>
        <Route path="/tunnel/proof/disclose" element={<TunnelDiscloseScreen />} />
        <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderRecoveryRequiredRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tunnel/recovery-required']}>
      <Routes>
        <Route path="/tunnel/recovery-required" element={<TunnelRecoveryRequiredScreen />} />
        <Route path="/recovery/phrase-input" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('tunnel flow screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      currentState: null,
      error_code: null,
      reason: null,
      passportData: null,
      init: initMock,
    };
    loadSelectedDocumentMock.mockResolvedValue({
      data: { documentCategory: 'passport' },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const expectLocation = (expected: string) => {
    const locations = screen.getAllByTestId('location');
    expect(locations.at(-1)?.textContent).toBe(expected);
  };

  it('retries proving failures back to the proving route', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expectLocation('/tunnel/proof/generating');
  });

  it('retries disclose failures back to the disclose route', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'TEE down', source: 'disclose' },
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expectLocation('/tunnel/proof/disclose');
  });

  it('routes success details to the proof receipt screen', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: true },
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    expectLocation('/tunnel/proof/receipt');
  });

  it('routes failure details to the proof receipt screen', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    expectLocation('/tunnel/proof/receipt');
  });

  it('humanizes raw contract selectors on the tunnel failure screen', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: '0xda7bd3a6', source: 'proving' },
    });

    expect(screen.getByText('Invalid Vc And Disclose Proof')).toBeTruthy();
  });

  it('routes account recovery choice to the recovery-required screen', async () => {
    storeState.currentState = 'account_recovery_choice';

    renderProvingRoute();

    await waitFor(() => {
      expectLocation('/tunnel/recovery-required');
    });
  });

  it('does not react to stale completed state before init finishes', () => {
    storeState.currentState = 'completed';
    loadSelectedDocumentMock.mockImplementation(() => new Promise(() => {}));

    renderProvingRoute();

    expect(screen.getByText(/proof-generation:generatingProof/i)).toBeTruthy();
    expectLocation('/tunnel/proof/generating');
    expect(initMock).not.toHaveBeenCalled();
  });

  it('routes recovery required primary action to phrase input with returnTo', () => {
    renderRecoveryRequiredRoute();

    fireEvent.click(screen.getByRole('button', { name: /recover with phrase/i }));

    expectLocation('/recovery/phrase-input?returnTo=%2Ftunnel%2Fproof%2Fgenerating');
  });

  it('routes to error result when proving setup throws before init starts', async () => {
    const { initSelfAppFromRequest } = await import('../../../src/utils/selfAppContext');
    vi.mocked(initSelfAppFromRequest).mockImplementationOnce(() => {
      throw new Error('bad request');
    });

    renderProvingRoute();

    await waitFor(() => {
      expectLocation('/tunnel/proof/result');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('tunnel_proving_init_failed', { error: 'bad request' });
  });

  it('routes to error result when disclose setup throws before init starts', async () => {
    const { initSelfAppFromRequest } = await import('../../../src/utils/selfAppContext');
    vi.mocked(initSelfAppFromRequest).mockImplementationOnce(() => {
      throw new Error('bad request');
    });

    renderDiscloseRoute();

    await waitFor(() => {
      expectLocation('/tunnel/proof/result');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('tunnel_disclose_init_failed', { error: 'bad request' });
  });
});
