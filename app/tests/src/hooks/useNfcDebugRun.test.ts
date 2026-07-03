// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import type { NfcDebugSessionOverEvent } from '@/integrations/nfc/nfcDebugBridge';
import { useNfcDebugRun } from '@/hooks/useNfcDebugRun';
import {
  startBridge,
  stopBridge,
  subscribeSessionOver,
} from '@/integrations/nfc/nfcDebugBridge';
import {
  getResult,
  mintSession,
  NfcDebugUnavailableError,
} from '@/services/nfcDebug';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  useSelfClient: jest.fn(),
}));

jest.mock('@/integrations/nfc/nfcDebugBridge', () => ({
  isNfcDebugBridgeSupported: true,
  startBridge: jest.fn(),
  stopBridge: jest.fn(),
  subscribeSessionOver: jest.fn(() => () => undefined),
}));

// Captures the listener passed to subscribeSessionOver so tests can fire the
// native "session over" event, and returns the unsubscribe spy.
const armSessionOver = () => {
  let listener: ((e: NfcDebugSessionOverEvent) => void) | undefined;
  const unsubscribe = jest.fn();
  (subscribeSessionOver as jest.Mock).mockImplementation(cb => {
    listener = cb;
    return unsubscribe;
  });
  return {
    fire: (e: NfcDebugSessionOverEvent) => listener?.(e),
    unsubscribe,
  };
};

jest.mock('@/services/nfcDebug', () => ({
  mintSession: jest.fn(),
  getResult: jest.fn(),
  NfcDebugUnavailableError: class MockNfcDebugUnavailableError extends Error {},
}));

const MRZ = {
  passportNumber: 'L898902C3',
  dateOfBirth: '740812',
  dateOfExpiry: '120415',
};

const setMrz = (mrz: Partial<typeof MRZ>) => {
  (useSelfClient as jest.Mock).mockReturnValue({
    useMRZStore: () => mrz,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (startBridge as jest.Mock).mockResolvedValue(true);
  (stopBridge as jest.Mock).mockResolvedValue(true);
  setMrz(MRZ);
});

describe('useNfcDebugRun', () => {
  it('mints, arms, polls to done, and tears the bridge down', async () => {
    (mintSession as jest.Mock).mockResolvedValue({ session: 'S1' });
    (getResult as jest.Mock).mockResolvedValue({
      state: 'done',
      report: { status: 'success', terminationReason: 'completed' },
    });

    const { result } = renderHook(() => useNfcDebugRun());

    await act(async () => {
      await result.current.run();
    });

    expect(mintSession).toHaveBeenCalledTimes(1);
    expect(startBridge).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'S1',
        documentNumber: MRZ.passportNumber,
        dateOfBirth: MRZ.dateOfBirth,
        dateOfExpiry: MRZ.dateOfExpiry,
      }),
    );
    expect(result.current.state).toBe('done');
    expect(result.current.result?.status).toBe('success');
    expect(stopBridge).toHaveBeenCalled();
  });

  it('unsubscribes from the session-over event when the run ends', async () => {
    (mintSession as jest.Mock).mockResolvedValue({ session: 'S1' });
    (getResult as jest.Mock).mockResolvedValue({
      state: 'done',
      report: { status: 'success', terminationReason: 'completed' },
    });
    const { unsubscribe } = armSessionOver();

    const { result } = renderHook(() => useNfcDebugRun());
    await act(async () => {
      await result.current.run();
    });

    expect(subscribeSessionOver).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('errors immediately when the session closes without completing', async () => {
    (mintSession as jest.Mock).mockResolvedValue({ session: 'S1' });
    // Server keeps reporting `running`; a fatal (non-run-complete) WS close must
    // end the run at once instead of polling to the overall timeout.
    (getResult as jest.Mock).mockResolvedValue({ state: 'running' });
    (subscribeSessionOver as jest.Mock).mockImplementation(cb => {
      cb({ code: 1006, reason: 'device dropped', runComplete: false });
      return jest.fn();
    });

    const { result } = renderHook(() => useNfcDebugRun());
    await act(async () => {
      await result.current.run();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/dropped/i);
    expect(stopBridge).toHaveBeenCalled();
  });

  it('stops after a run-complete close if the result never lands', async () => {
    jest.useFakeTimers();
    (mintSession as jest.Mock).mockResolvedValue({ session: 'S1' });
    // Server closed the relay as run-complete but never persists a report.
    (getResult as jest.Mock).mockResolvedValue({ state: 'running' });
    (subscribeSessionOver as jest.Mock).mockImplementation(cb => {
      cb({ code: 4000, reason: 'run-complete', runComplete: true });
      return jest.fn();
    });

    const { result } = renderHook(() => useNfcDebugRun());
    await act(async () => {
      const done = result.current.run();
      // Advance through the bounded post-close polls (5 × 1.5s).
      await jest.advanceTimersByTimeAsync(12_000);
      await done;
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/unavailable/i);
    jest.useRealTimers();
  });

  it('tolerates a transient poll failure and still completes', async () => {
    jest.useFakeTimers();
    (mintSession as jest.Mock).mockResolvedValue({ session: 'S1' });
    (getResult as jest.Mock)
      .mockRejectedValueOnce(new NfcDebugUnavailableError('blip'))
      .mockResolvedValue({
        state: 'done',
        report: { status: 'success', terminationReason: 'completed' },
      });

    const { result } = renderHook(() => useNfcDebugRun());
    await act(async () => {
      const done = result.current.run();
      // Advance past the retry backoff after the failed poll.
      await jest.advanceTimersByTimeAsync(2000);
      await done;
    });

    expect(getResult).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe('done');
    jest.useRealTimers();
  });

  it('shows a friendly message when the server is unavailable', async () => {
    (mintSession as jest.Mock).mockRejectedValue(
      new NfcDebugUnavailableError('boom'),
    );

    const { result } = renderHook(() => useNfcDebugRun());

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/unavailable/i);
    expect(startBridge).not.toHaveBeenCalled();
  });

  it('refuses to run without MRZ and never hits the network', async () => {
    setMrz({});
    const { result } = renderHook(() => useNfcDebugRun());

    expect(result.current.hasMrz).toBe(false);

    await act(async () => {
      await result.current.run();
    });

    expect(mintSession).not.toHaveBeenCalled();
    expect(result.current.state).toBe('error');
    expect(result.current.error).toMatch(/scan your passport/i);
  });
});
