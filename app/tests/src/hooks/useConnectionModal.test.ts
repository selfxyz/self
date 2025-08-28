// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import useConnectionModal from '@/hooks/useConnectionModal';
import { useModal } from '@/hooks/useModal';

jest.useFakeTimers();

jest.mock('@/navigation', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
}));

jest.mock('@/hooks/useModal');
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest
    .fn()
    .mockReturnValue({ isConnected: false, isInternetReachable: false }),
}));

const showModal = jest.fn();
const dismissModal = jest.fn();
(useModal as jest.Mock).mockReturnValue({
  showModal,
  dismissModal,
  visible: false,
});

describe('useConnectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows modal when no connection', () => {
    const { result } = renderHook(() => useConnectionModal());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(showModal).toHaveBeenCalled();
    expect(result.current.visible).toBe(false);
  });

  it('dismisses modal when connection is restored', () => {
    (useModal as jest.Mock).mockReturnValue({
      showModal,
      dismissModal,
      visible: true,
    });

    const { useNetInfo } = require('@react-native-community/netinfo');
    useNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });

    renderHook(() => useConnectionModal());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(dismissModal).toHaveBeenCalled();
  });

  it('does not show modal when hideNetworkModal is true', () => {
    jest.doMock('@/stores/settingStore', () => ({
      useSettingStore: jest.fn(() => true),
    }));

    renderHook(() => useConnectionModal());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(showModal).not.toHaveBeenCalled();
  });

  it('does not show modal when navigation is not ready', () => {
    const { navigationRef } = require('@/navigation');
    navigationRef.isReady.mockReturnValue(false);

    renderHook(() => useConnectionModal());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(showModal).not.toHaveBeenCalled();
  });
});
