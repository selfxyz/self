// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useMultiTap } from '@/hooks/useMultiTap';

const tap = (handler: () => void, times: number, gapMs = 100) => {
  for (let i = 0; i < times; i++) {
    act(() => {
      handler();
    });
    act(() => {
      jest.advanceTimersByTime(gapMs);
    });
  }
};

describe('useMultiTap', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires a single threshold only once the tap count is reached', () => {
    const onReach = jest.fn();
    const { result } = renderHook(() =>
      useMultiTap({ thresholds: [{ taps: 5, onReach }] }),
    );

    tap(result.current, 4);
    expect(onReach).not.toHaveBeenCalled();

    tap(result.current, 1);
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it('fires each ordered threshold as its count is hit within the window', () => {
    const onThree = jest.fn();
    const onFive = jest.fn();
    const { result } = renderHook(() =>
      useMultiTap({
        thresholds: [
          { taps: 3, onReach: onThree },
          { taps: 5, onReach: onFive },
        ],
      }),
    );

    tap(result.current, 3);
    expect(onThree).toHaveBeenCalledTimes(1);
    expect(onFive).not.toHaveBeenCalled();

    tap(result.current, 2);
    expect(onFive).toHaveBeenCalledTimes(1);
    expect(onThree).toHaveBeenCalledTimes(1);
  });

  it('resets the streak when taps are slower than the window', () => {
    const onReach = jest.fn();
    const { result } = renderHook(() =>
      useMultiTap({ thresholds: [{ taps: 3, onReach }], windowMs: 800 }),
    );

    tap(result.current, 2);
    act(() => {
      jest.advanceTimersByTime(801);
    });
    // streak reset by the long gap, so the next two taps reach only count 2
    tap(result.current, 2);
    expect(onReach).not.toHaveBeenCalled();

    tap(result.current, 1);
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it('resets after the highest threshold so it can trigger again', () => {
    const onReach = jest.fn();
    const { result } = renderHook(() =>
      useMultiTap({ thresholds: [{ taps: 5, onReach }] }),
    );

    tap(result.current, 5);
    expect(onReach).toHaveBeenCalledTimes(1);

    tap(result.current, 5);
    expect(onReach).toHaveBeenCalledTimes(2);
  });
});
