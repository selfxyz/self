// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscloseResultScreen } from '../../../src/screens/proving/DiscloseResultScreen';
import { ProofGenerationRouteScreen } from '../../../src/screens/proving/ProofGenerationRouteScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn(), setResult: vi.fn().mockResolvedValue(undefined) };
const client = { id: 'client' };

const initMock = vi.fn();
const setUserConfirmedMock = vi.fn();

type MockStoreState = {
  currentState: string | null;
  circuitType: string | null;
  error_code: string | null;
  reason: string | null;
  init: typeof initMock;
  setUserConfirmed: typeof setUserConfirmedMock;
};

let storeState: MockStoreState = {
  currentState: null,
  circuitType: 'disclose',
  error_code: null,
  reason: null,
  init: initMock,
  setUserConfirmed: setUserConfirmedMock,
};

let operatingMode: 'self-app' | 'embed' = 'self-app';

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    client,
    analytics,
    haptic,
    lifecycle,
  }),
}));

vi.mock('../../../src/providers/OperatingModeProvider', () => ({
  useOperatingMode: () => ({ mode: operatingMode, verificationRequest: null, isReady: true }),
  useReferenceId: () => undefined,
}));

vi.mock('../../../src/providers/VerificationRequestProvider', () => ({
  useVerificationRequest: () => ({
    verificationId: 'verification-123',
    request: { userId: 'user-123', disclosures: ['nationality'] },
    displayLabels: ['Nationality'],
    appName: 'Self Test App',
    displayAppEndpoint: 'https://example.com',
    timestamp: '2026-03-31T12:00:00.000Z',
  }),
}));

vi.mock('../../../src/utils/selfAppContext', () => ({
  initSelfAppFromRequest: vi.fn(),
}));

vi.mock('../../../src/components/SupportReference', () => ({
  SupportReference: () => null,
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
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
}));

const StateDisplay: React.FC = () => {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </>
  );
};

const renderProvingRoute = () =>
  render(
    <MemoryRouter initialEntries={['/disclose/generating']}>
      <Routes>
        <Route path="/disclose/generating" element={<ProofGenerationRouteScreen />} />
        <Route path="/disclose/result" element={<StateDisplay />} />
        <Route path="/" element={<StateDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

const renderResultRoute = (state: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/disclose/result', state }]}>
      <Routes>
        <Route path="/disclose/result" element={<DiscloseResultScreen />} />
        <Route path="/" element={<StateDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('self-app proving terminal emit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycle.setResult.mockResolvedValue(undefined);
    operatingMode = 'self-app';
    storeState = {
      currentState: null,
      circuitType: 'disclose',
      error_code: null,
      reason: null,
      init: initMock,
      setUserConfirmed: setUserConfirmedMock,
    };
    initMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('emits a success result at the completed terminal and navigates with resultSent', async () => {
    storeState.currentState = 'completed';

    renderProvingRoute();

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalledTimes(1);
    });
    expect(lifecycle.setResult).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, userId: 'user-123', verificationId: 'verification-123' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/disclose/result');
    });
    const state = JSON.parse(screen.getByTestId('location-state').textContent ?? '{}');
    expect(state).toMatchObject({ success: true, resultSent: true });
  });

  it('emits a failure result at a failure terminal and navigates with resultSent', async () => {
    storeState.currentState = 'failure';
    storeState.error_code = 'tee_down';
    storeState.reason = 'TEE unavailable';

    renderProvingRoute();

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalledTimes(1);
    });
    expect(lifecycle.setResult).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        userId: 'user-123',
        verificationId: 'verification-123',
        error: { code: 'tee_down', message: 'TEE unavailable' },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/disclose/result');
    });
    const state = JSON.parse(screen.getByTestId('location-state').textContent ?? '{}');
    expect(state).toMatchObject({ success: false, resultSent: true });
  });

  it('does not emit at terminal when not in self-app mode', async () => {
    operatingMode = 'embed';
    storeState.currentState = 'completed';

    renderProvingRoute();

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/disclose/result');
    });
    expect(lifecycle.setResult).not.toHaveBeenCalled();
  });
});

describe('DiscloseResultScreen Continue dedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycle.setResult.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('does not call setResult again on Continue when resultSent is true, only dismiss', async () => {
    renderResultRoute({ success: true, resultSent: true });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(lifecycle.dismiss).toHaveBeenCalledTimes(1);
    });
    expect(lifecycle.setResult).not.toHaveBeenCalled();
  });

  it('still calls setResult on Continue when resultSent is not set', async () => {
    renderResultRoute({ success: true });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(lifecycle.setResult).toHaveBeenCalledTimes(1);
      expect(lifecycle.dismiss).toHaveBeenCalledTimes(1);
    });
  });
});
