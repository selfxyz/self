// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const flush = () => act(async () => {});

describe('usePullToRefresh', () => {
  it('starts not refreshing', () => {
    const { result } = renderHook(() => usePullToRefresh(jest.fn()));
    expect(result.current.refreshing).toBe(false);
  });

  it('shows refreshing while an async action is in flight, then clears it', async () => {
    let resolveAction: () => void = () => {};
    const action = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveAction = resolve;
        }),
    );
    const { result } = renderHook(() => usePullToRefresh(action));

    act(() => {
      result.current.onRefresh();
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      resolveAction();
    });
    expect(result.current.refreshing).toBe(false);
  });

  it('clears refreshing for a synchronous (void) action', async () => {
    const action = jest.fn(() => undefined);
    const { result } = renderHook(() => usePullToRefresh(action));

    act(() => {
      result.current.onRefresh();
    });
    await flush();
    expect(result.current.refreshing).toBe(false);
  });

  it('clears refreshing even when the action rejects', async () => {
    const action = jest.fn(() => Promise.reject(new Error('boom')));
    const { result } = renderHook(() => usePullToRefresh(action));

    await act(async () => {
      result.current.onRefresh();
    });
    expect(result.current.refreshing).toBe(false);
  });
});
