// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmbedDiscloseScreen } from '../../../src/screens/embed/EmbedDiscloseScreen';
import { EmbedKycFailureScreen } from '../../../src/screens/embed/EmbedKycFailureScreen';
import { EmbedKycSuccessScreen } from '../../../src/screens/embed/EmbedKycSuccessScreen';
import { EmbedProofReceiptScreen } from '../../../src/screens/embed/EmbedProofReceiptScreen';
import { EmbedProvingScreen } from '../../../src/screens/embed/EmbedProvingScreen';
import { EmbedRecoveryRequiredScreen } from '../../../src/screens/embed/EmbedRecoveryRequiredScreen';
import { EmbedResultScreen } from '../../../src/screens/embed/EmbedResultScreen';
import { TourScreen as EmbedTourScreen } from '../../../src/screens/embed/TourScreen';
import { LaunchRecoveryScreen } from '../../../src/screens/recovery/LaunchRecoveryScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn(), setResult: vi.fn() };
const client = { id: 'client' };
let referenceId: string | undefined;

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

vi.mock('../../../src/providers/OperatingModeProvider', () => ({
  useOperatingMode: () => ({ mode: 'embed', verificationRequest: null, isReady: true }),
  useReferenceId: () => referenceId,
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
  colors: { slate700: '#334155' },
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
        <Route path="/disclose/result" element={<EmbedResultScreen />} />
        <Route path="/tour/4" element={<LocationDisplay />} />
        <Route path="/capture/kyc" element={<LocationDisplay />} />
        <Route path="/disclose/generating" element={<LocationDisplay />} />
        <Route path="/disclose/request" element={<LocationDisplay />} />
        <Route path="/receipts/current" element={<LocationDisplay />} />
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
        <Route path="/receipts/current" element={<EmbedProofReceiptScreen />} />
        <Route path="/disclose/kyc-success" element={<LocationDisplay />} />
        <Route path="/disclose/result" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderProvingRoute = () =>
  render(
    <MemoryRouter initialEntries={['/disclose/generating']}>
      <Routes>
        <Route path="/disclose/generating" element={<EmbedProvingScreen />} />
        <Route path="/recover/required" element={<LocationDisplay />} />
        <Route path="/receipts/current" element={<LocationDisplay />} />
        <Route path="/disclose/result" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderDiscloseRoute = () =>
  render(
    <MemoryRouter initialEntries={['/disclose/request']}>
      <Routes>
        <Route path="/disclose/request" element={<EmbedDiscloseScreen />} />
        <Route path="/disclose/result" element={<LocationDisplay />} />
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
        <Route path="/disclose/kyc-success" element={<EmbedKycSuccessScreen />} />
        <Route path="/capture/kyc" element={<LocationDisplay />} />
        <Route path="/disclose/kyc-failure" element={<LocationDisplay />} />
        <Route path="/tour/4" element={<LocationDisplay />} />
        <Route path="/disclose/generating" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderKycFailureRoute = () =>
  render(
    <MemoryRouter initialEntries={['/disclose/kyc-failure']}>
      <Routes>
        <Route path="/disclose/kyc-failure" element={<EmbedKycFailureScreen />} />
        <Route path="/capture/kyc" element={<LocationDisplay />} />
        <Route path="/tour/4" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderRecoveryRequiredRoute = () =>
  render(
    <MemoryRouter initialEntries={['/recover/required']}>
      <Routes>
        <Route path="/recover/required" element={<EmbedRecoveryRequiredScreen />} />
        <Route path="/recover/phrase-input" element={<LocationDisplay />} />
        <Route path="/tour/4" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  );

const renderTourRestoreRoute = () =>
  render(
    <MemoryRouter initialEntries={['/tour/1']}>
      <Routes>
        <Route path="/tour/:step" element={<EmbedTourScreen />} />
        <Route path="/recover" element={<LaunchRecoveryScreen />} />
        <Route path="/recover/phrase-input" element={<LocationDisplay />} />
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
    referenceId = undefined;
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
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expectLocation('/disclose/generating');
  });

  it('retries disclose failures back to the disclose route', () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'disclose' },
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expectLocation('/disclose/request');
  });

  it('routes success details to the proof receipt screen', () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: true },
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    expectLocation('/receipts/current');
  });

  it('shows the support reference on failure results only', () => {
    referenceId = 'corr-route';

    const { unmount } = renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });
    expect(screen.getByRole('button', { name: /copy reference corr-route/i })).toBeTruthy();
    unmount();

    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: true },
    });
    expect(screen.queryByRole('button', { name: /copy reference corr-route/i })).toBeNull();
  });

  it('routes failure details to the proof receipt screen', () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    expectLocation('/receipts/current');
  });

  it('routes proving failure close to lifecycle.dismiss', async () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'proving' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalled();
      expect(lifecycle.dismiss).toHaveBeenCalled();
    });
  });

  it('keeps disclose failure close on lifecycle.dismiss', async () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'TEE down', source: 'disclose' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalled();
      expect(lifecycle.dismiss).toHaveBeenCalled();
    });
  });

  it('keeps kyc failure close on lifecycle.dismiss', async () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'Provider cancelled', source: 'kyc' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalled();
      expect(lifecycle.dismiss).toHaveBeenCalled();
    });
  });

  it('routes account recovery choice to the recovery-required screen', async () => {
    storeState.currentState = 'account_recovery_choice';

    renderProvingRoute();

    await waitFor(() => {
      expectLocation('/recover/required');
    });
  });

  it('does not react to stale completed state before init finishes', () => {
    storeState.currentState = 'completed';
    loadSelectedDocumentMock.mockImplementation(() => new Promise(() => {}));

    renderProvingRoute();

    expect(screen.getByText(/proof-generation:generatingProof/i)).toBeTruthy();
    expectLocation('/disclose/generating');
    expect(initMock).not.toHaveBeenCalled();
  });

  it('routes recovery required primary action to phrase input with nextPath state', () => {
    renderRecoveryRequiredRoute();

    fireEvent.click(screen.getByRole('button', { name: /recover with phrase/i }));

    expectLocation('/recover/phrase-input');
  });

  it('keeps recovery required cancel inside the tunnel flow', () => {
    renderRecoveryRequiredRoute();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expectLocation('/tour/4');
  });

  it('keeps receipt close on the provided tunnel back path', () => {
    renderReceiptRoute({
      pathname: '/receipts/current',
      state: { backPath: '/disclose/result' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expectLocation('/disclose/result');
  });

  it('restores result state when closing receipt', () => {
    const resultState = { success: true };

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/receipts/current',
            state: { backPath: '/disclose/result', backState: resultState },
          },
        ]}
      >
        <Routes>
          <Route path="/receipts/current" element={<EmbedProofReceiptScreen />} />
          <Route path="/disclose/result" element={<StateDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expect(screen.getByTestId('location-state').textContent).toBe(JSON.stringify(resultState));
  });

  it('keeps kyc cancel inside the tunnel flow', async () => {
    renderKycSuccessRoute({
      pathname: '/disclose/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'cancel',
        },
      },
    });

    await waitFor(() => {
      expectLocation('/tour/4');
    });
  });

  it('routes to error result when proving setup throws before init starts', async () => {
    const { initSelfAppFromRequest } = await import('../../../src/utils/selfAppContext');
    vi.mocked(initSelfAppFromRequest).mockImplementationOnce(() => {
      throw new Error('bad request');
    });

    renderProvingRoute();

    await waitFor(() => {
      expectLocation('/disclose/result');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('tunnel_proving_init_failed', { error: 'bad request' });
  });

  it('routes retryable kyc error to the failure screen', async () => {
    renderKycSuccessRoute({
      pathname: '/disclose/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'error',
          error: { code: 'provider_unknown_error', message: 'Something went wrong', retryable: true },
        },
      },
    });

    await waitFor(() => {
      expectLocation('/disclose/kyc-failure');
    });
  });

  it('routes non-retryable kyc error back to the tour', async () => {
    renderKycSuccessRoute({
      pathname: '/disclose/kyc-success',
      state: {
        providerResult: {
          provider: 'didit',
          status: 'error',
          error: { code: 'provider_declined', message: 'Declined', retryable: false },
        },
      },
    });

    await waitFor(() => {
      expectLocation('/tour/4');
    });
  });

  it('retries kyc failure back into the tunnel kyc step', () => {
    renderKycFailureRoute();

    fireEvent.click(screen.getByRole('button', { name: /retry kyc/i }));

    expectLocation('/capture/kyc');
  });

  it('dismisses kyc failure back to the tunnel tour', () => {
    renderKycFailureRoute();

    fireEvent.click(screen.getByRole('button', { name: /dismiss kyc failure/i }));

    expectLocation('/tour/4');
  });

  it('falls back to result screen when receipt has no backPath', () => {
    renderReceiptRoute({
      pathname: '/receipts/current',
    });

    fireEvent.click(screen.getByRole('button', { name: /close receipt/i }));

    expectLocation('/disclose/result');
  });

  it('defaults missing failure source close to lifecycle.dismiss', async () => {
    renderResultRoute({
      pathname: '/disclose/result',
      state: { success: false, error: 'Unknown error' },
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalled();
      expect(lifecycle.dismiss).toHaveBeenCalled();
    });
  });

  it('keeps tour restore back button inside the tunnel flow', () => {
    renderTourRestoreRoute();

    fireEvent.click(screen.getByRole('button', { name: /restore tour 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /back from recovery/i }));

    expectLocation('/tour/1');
  });

  it('forwards nextPath when entering recovery phrase from tunnel tour', () => {
    renderTourRestoreRoute();

    fireEvent.click(screen.getByRole('button', { name: /restore tour 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /enter recovery phrase/i }));

    expectLocation('/recover/phrase-input');
  });

  it('hides confirm button on receipt when backState is missing', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/receipts/current',
            state: { backPath: '/disclose/result' },
          },
        ]}
      >
        <Routes>
          <Route path="/receipts/current" element={<EmbedProofReceiptScreen />} />
          <Route path="/disclose/result" element={<LocationDisplay />} />
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
            pathname: '/receipts/current',
            state: { backPath: '/disclose/result', backState: { success: false, error: 'TEE down' } },
          },
        ]}
      >
        <Routes>
          <Route path="/receipts/current" element={<EmbedProofReceiptScreen />} />
          <Route path="/disclose/result" element={<LocationDisplay />} />
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
            pathname: '/receipts/current',
            state: { backPath: '/disclose/result', backState: { success: true } },
          },
        ]}
      >
        <Routes>
          <Route path="/receipts/current" element={<EmbedProofReceiptScreen />} />
          <Route path="/disclose/result" element={<LocationDisplay />} />
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
      expectLocation('/disclose/result');
    });

    expect(analytics.trackEvent).toHaveBeenCalledWith('tunnel_disclose_init_failed', { error: 'bad request' });
  });
});
