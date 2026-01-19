// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import type { SelfApp } from '@selfxyz/common';

import { useProofDisclosureStalenessCheck } from '@/hooks/useProofDisclosureStalenessCheck';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

describe('useProofDisclosureStalenessCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('navigates home when selfApp is missing', () => {
    const navigation = { navigate: jest.fn() };

    renderHook(() =>
      useProofDisclosureStalenessCheck(
        null,
        [{ key: 'a', text: 'Disclosure' }],
        navigation as any,
      ),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(navigation.navigate).toHaveBeenCalledWith({
      name: 'Home',
      params: {},
    });
  });

  it('navigates home when disclosure items are empty', () => {
    const navigation = { navigate: jest.fn() };
    const selfApp = { appName: 'Test App' } as unknown as SelfApp;

    renderHook(() =>
      useProofDisclosureStalenessCheck(selfApp, [], navigation as any),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(navigation.navigate).toHaveBeenCalledWith({
      name: 'Home',
      params: {},
    });
  });

  it('does not navigate when data is present', () => {
    const navigation = { navigate: jest.fn() };
    const selfApp = { appName: 'Test App' } as unknown as SelfApp;

    renderHook(() =>
      useProofDisclosureStalenessCheck(
        selfApp,
        [{ key: 'a', text: 'Disclosure' }],
        navigation as any,
      ),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
