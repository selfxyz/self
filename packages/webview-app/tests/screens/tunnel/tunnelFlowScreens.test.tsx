// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LaunchRecoveryScreen } from '../../../src/screens/recovery/LaunchRecoveryScreen';
import { TourScreen as TunnelTourScreen } from '../../../src/screens/tunnel/TourScreen';
import { TunnelDiscloseScreen } from '../../../src/screens/tunnel/TunnelDiscloseScreen';
import { TunnelKycFailureScreen } from '../../../src/screens/tunnel/TunnelKycFailureScreen';
import { TunnelKycSuccessScreen } from '../../../src/screens/tunnel/TunnelKycSuccessScreen';
import { TunnelProofReceiptScreen } from '../../../src/screens/tunnel/TunnelProofReceiptScreen';
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
  ProofRequestScreen: ({ onClose, onConfirm }: { onClose: () => void; onConfirm?: () => void }) => (
    <div>
      <button onClick={onClose} type="button">
        Close receipt
      </button>
      {onConfirm && (
        <button onClick={onConfirm} type="button">
          Confirm receipt
        </button>
      )}
    </div>
  ),
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
    onRetry,
    onViewDetails,
    onClose,
  }: {
    onRetry: () => void;
    onViewDetails: () => void;
    onClose: () => void;
  }) => (
    <div>
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
  KycVerificationSuccessScreen: ({ onGenerateProof }: { onGenerateProof: () => void }) => (
    <button onClick={onGenerateProof} type="button">
      Generate proof
    </button>
  ),
  KycFailureScreen: ({ onDismiss, onTryAgain }: { onDismiss: () => void; onTryAgain: () => void }) => (
    <div>
      <button onClick={onDismiss} type="button">
        Dismiss KYC failure
      </button>
      <button onClick={onTryAgain} type="button">
        Retry KYC
      </button>
    </div>
  ),
  LaunchTour1Screen: ({ onRestore }: { onRestore: () => void }) => (
    <button onClick={onRestore} type="button">
      Restore tour 1
    </button>
  ),
  LaunchTour2Screen: () => <div>tour-2</div>,
  LaunchTour3Screen: () => <div>tour-3</div>,
  LaunchTour4Screen: () => <div>tour-4</div>,
  LaunchRecoveryScreen: ({
    onClose,
    onEnterRecoveryPhrase,
  }: {
    onClose: () => void;
    onEnterRecoveryPhrase: () => void;
  }) => (
    <div>
      <button onClick={onClose} type="button">
        Back from recovery
      </button>
      <button onClick={onEnterRecoveryPhrase} type="button">
        Enter recovery phrase
      </button>
    </div>
  ),
  LeftArrowIcon: () => null,
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const StateDisplay: React.FC = () => {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </>
  );
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
        <Route path="/tunnel/kyc" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/generating" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/disclose" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/receipt" element={<LocationDisplay />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderReceiptRoute = (
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
        <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
        <Route path="/tunnel/kyc-success" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
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

const renderKycSuccessRoute = (
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
        <Route path="/tunnel/kyc-success" element={<TunnelKycSuccessScreen />} />
        <Route path="/tunnel/kyc" element={<LocationDisplay />} />
        <Route path="/tunnel/kyc-failure" element={<LocationDisplay />} />
        <Route path="/tunnel/tour/4" element={<LocationDisplay />} />
        <Route path="/tunnel/proof/generating" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderKycFailureRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tunnel/kyc-failure']}>
      <Routes>
        <Route path="/tunnel/kyc-failure" element={<TunnelKycFailureScreen />} />
        <Route path="/tunnel/kyc" element={<LocationDisplay />} />
        <Route path="/tunnel/tour/4" element={<LocationDisplay />} />
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
        <Route path="/tunnel/tour/4" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderTourRestoreRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tunnel/tour/1']}>
      <Routes>
        <Route path="/tunnel/tour/:step" element={<TunnelTourScreen />} />
        <Route path="/recovery" element={<LaunchRecoveryScreen />} />
        <Route path="/recovery/phrase-input" element={<LocationDisplay />} />
        <Route path="/settings/security" element={<LocationDisplay />} />
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

  it('keeps failure close inside the tunnel proving route', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expectLocation('/tunnel/proof/generating');
  });

  it('keeps disclose failure close inside the tunnel disclose route', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'TEE down', source: 'disclose' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expectLocation('/tunnel/proof/disclose');
  });

  it('keeps kyc failure close inside the tunnel kyc route', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'Provider cancelled', source: 'kyc' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expectLocation('/tunnel/kyc');
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

  it('keeps recovery required cancel inside the tunnel flow', () => {
    renderRecoveryRequiredRoute();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expectLocation('/tunnel/tour/4');
  });

  it('keeps receipt close on the provided tunnel back path', () => {
    renderReceiptRoute({
      pathname: '/tunnel/proof/receipt',
      state: { backPath: '/tunnel/proof/result' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expectLocation('/tunnel/proof/result');
  });

  it('restores result state when closing receipt', () => {
    const resultState = { success: true };

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/tunnel/proof/receipt',
            state: { backPath: '/tunnel/proof/result', backState: resultState },
          },
        ]}
      >
        <Routes>
          <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
          <Route path="/tunnel/proof/result" element={<StateDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expect(screen.getByTestId('location-state').textContent).toBe(JSON.stringify(resultState));
  });

  it('keeps kyc cancel inside the tunnel flow', async () => {
    renderKycSuccessRoute({
      pathname: '/tunnel/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'cancel',
        },
      },
    });

    await waitFor(() => {
      expectLocation('/tunnel/tour/4');
    });
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

  it('routes retryable kyc error to the failure screen', async () => {
    renderKycSuccessRoute({
      pathname: '/tunnel/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'error',
          error: { code: 'provider_unknown_error', message: 'Something went wrong', retryable: true },
        },
      },
    });

    await waitFor(() => {
      expectLocation('/tunnel/kyc-failure');
    });
  });

  it('routes non-retryable kyc error back to the tour', async () => {
    renderKycSuccessRoute({
      pathname: '/tunnel/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'error',
          error: { code: 'provider_declined', message: 'Declined', retryable: false },
        },
      },
    });

    await waitFor(() => {
      expectLocation('/tunnel/tour/4');
    });
  });

  it('retries kyc failure back into the tunnel kyc step', () => {
    renderKycFailureRoute();

    fireEvent.click(screen.getByRole('button', { name: /retry kyc/i }));

    expectLocation('/tunnel/kyc');
  });

  it('dismisses kyc failure back to the tunnel tour', () => {
    renderKycFailureRoute();

    fireEvent.click(screen.getByRole('button', { name: /dismiss kyc failure/i }));

    expectLocation('/tunnel/tour/4');
  });

  it('falls back to result screen when receipt has no backPath', () => {
    renderReceiptRoute({
      pathname: '/tunnel/proof/receipt',
    });

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expectLocation('/tunnel/proof/result');
  });

  it('defaults source to proving when absent', () => {
    renderResultRoute({
      pathname: '/tunnel/proof/result',
      state: { success: false, error: 'Unknown error' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expectLocation('/tunnel/proof/generating');
  });

  it('keeps tour restore back button inside the tunnel flow', () => {
    renderTourRestoreRoute();

    fireEvent.click(screen.getByRole('button', { name: /restore tour 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /back from recovery/i }));

    expectLocation('/tunnel/tour/1');
  });

  it('forwards returnTo when entering recovery phrase from tunnel tour', () => {
    renderTourRestoreRoute();

    fireEvent.click(screen.getByRole('button', { name: /restore tour 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /enter recovery phrase/i }));

    expectLocation(`/recovery/phrase-input?returnTo=${encodeURIComponent('/tunnel/tour/1')}`);
  });

  it('hides confirm button on receipt when backState is missing', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/tunnel/proof/receipt',
            state: { backPath: '/tunnel/proof/result' },
          },
        ]}
      >
        <Routes>
          <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
          <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /confirm receipt/i })).toBeNull();
  });

  it('hides confirm button on receipt when opened from failure context', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/tunnel/proof/receipt',
            state: { backPath: '/tunnel/proof/result', backState: { success: false, error: 'TEE down' } },
          },
        ]}
      >
        <Routes>
          <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
          <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /confirm receipt/i })).toBeNull();
    expect(screen.getByRole('button', { name: /close receipt/i })).toBeTruthy();
  });

  it('shows confirm button on receipt when opened from success context', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/tunnel/proof/receipt',
            state: { backPath: '/tunnel/proof/result', backState: { success: true } },
          },
        ]}
      >
        <Routes>
          <Route path="/tunnel/proof/receipt" element={<TunnelProofReceiptScreen />} />
          <Route path="/tunnel/proof/result" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /confirm receipt/i })).toBeTruthy();
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
