// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useDeeplinkRedirectCountdown } from '@/hooks/useDeeplinkRedirectCountdown';

const params = (
  overrides: Partial<Parameters<typeof useDeeplinkRedirectCountdown>[0]> = {},
) => ({
  seconds: 5,
  shouldStart: true,
  isFocused: true,
  resetKey: 'session-1',
  onRedirect: jest.fn(),
  ...overrides,
});

// Each tick is only scheduled after the previous one re-renders, so advance
// the clock one second at a time to drive the chain deterministically.
const tickSeconds = (n: number) => {
  for (let i = 0; i < n; i++) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
};

describe('useDeeplinkRedirectCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not start until shouldStart is met', () => {
    const { result } = renderHook(p => useDeeplinkRedirectCountdown(p), {
      initialProps: params({ shouldStart: false }),
    });
    expect(result.current.countdown).toBeNull();
  });

  it('starts at the configured seconds when conditions are met', () => {
    const { result } = renderHook(p => useDeeplinkRedirectCountdown(p), {
      initialProps: params(),
    });
    expect(result.current.countdown).toBe(5);
  });

  it('counts down one per second', () => {
    const { result } = renderHook(p => useDeeplinkRedirectCountdown(p), {
      initialProps: params(),
    });
    tickSeconds(1);
    expect(result.current.countdown).toBe(4);
    tickSeconds(2);
    expect(result.current.countdown).toBe(2);
  });

  it('fires onRedirect exactly once when it reaches zero', () => {
    const onRedirect = jest.fn();
    const { result } = renderHook(p => useDeeplinkRedirectCountdown(p), {
      initialProps: params({ onRedirect }),
    });
    tickSeconds(5);
    expect(result.current.countdown).toBe(0);
    expect(onRedirect).toHaveBeenCalledTimes(1);

    tickSeconds(5);
    expect(onRedirect).toHaveBeenCalledTimes(1);
  });

  it('cancel() stops the countdown and prevents redirect', () => {
    const onRedirect = jest.fn();
    const { result } = renderHook(p => useDeeplinkRedirectCountdown(p), {
      initialProps: params({ onRedirect }),
    });
    tickSeconds(2);
    act(() => {
      result.current.cancel();
    });
    expect(result.current.countdown).toBeNull();
    tickSeconds(10);
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it('hides the countdown on blur and does not auto-restart on refocus', () => {
    const { result, rerender } = renderHook(
      p => useDeeplinkRedirectCountdown(p),
      { initialProps: params() },
    );
    expect(result.current.countdown).toBe(5);

    rerender(params({ isFocused: false }));
    expect(result.current.countdown).toBeNull();

    rerender(params({ isFocused: true }));
    expect(result.current.countdown).toBeNull();
  });

  it('restarts for a new session when resetKey changes', () => {
    const { result, rerender } = renderHook(
      p => useDeeplinkRedirectCountdown(p),
      { initialProps: params() },
    );
    tickSeconds(5);
    expect(result.current.countdown).toBe(0);

    rerender(params({ resetKey: 'session-2' }));
    expect(result.current.countdown).toBe(5);
  });
});
