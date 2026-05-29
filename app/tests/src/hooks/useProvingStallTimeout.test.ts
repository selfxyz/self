// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useProvingStallTimeout } from '@/hooks/useProvingStallTimeout';

const STALL = new Set(['proving', 'fetching_data']);
const TIMEOUT = 90_000;

const params = (
  overrides: Partial<Parameters<typeof useProvingStallTimeout>[0]> = {},
) => ({
  currentState: 'proving',
  isFocused: true,
  sessionId: 'session-1',
  stallStates: STALL,
  timeoutMs: TIMEOUT,
  ...overrides,
});

describe('useProvingStallTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not time out before the window elapses', () => {
    const { result } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params(),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT - 1);
    });
    expect(result.current.hasTimedOut).toBe(false);
  });

  it('times out after the window and captures the active session id', () => {
    const { result } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params(),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT);
    });
    expect(result.current.hasTimedOut).toBe(true);
    expect(result.current.timedOutSessionId).toBe('session-1');
  });

  it('does not arm when the screen is unfocused', () => {
    const { result } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params({ isFocused: false }),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT * 2);
    });
    expect(result.current.hasTimedOut).toBe(false);
  });

  it('does not arm outside of stall-prone states', () => {
    const { result } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params({ currentState: 'completed' }),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT * 2);
    });
    expect(result.current.hasTimedOut).toBe(false);
  });

  it('restarts the window when progressing to another stall state', () => {
    const { result, rerender } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params({ currentState: 'fetching_data' }),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT - 10_000);
    });
    expect(result.current.hasTimedOut).toBe(false);

    // Progress to a different stall-prone state; the window should restart.
    rerender(params({ currentState: 'proving' }));
    act(() => {
      jest.advanceTimersByTime(TIMEOUT - 10_000);
    });
    // Had the window not restarted, the original timer would have fired
    // 10s after the transition (at the 90s mark from first entry).
    expect(result.current.hasTimedOut).toBe(false);

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.hasTimedOut).toBe(true);
  });

  it('resets the timed-out flag when the session id changes', () => {
    const { result, rerender } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params(),
    });
    act(() => {
      jest.advanceTimersByTime(TIMEOUT);
    });
    expect(result.current.hasTimedOut).toBe(true);

    rerender(params({ sessionId: 'session-2' }));
    expect(result.current.hasTimedOut).toBe(false);
  });

  it('clears the pending timer on unmount', () => {
    const { unmount } = renderHook(p => useProvingStallTimeout(p), {
      initialProps: params(),
    });
    unmount();
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(TIMEOUT * 2);
      });
    }).not.toThrow();
  });
});
