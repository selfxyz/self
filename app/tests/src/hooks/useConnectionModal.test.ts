// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { act, renderHook } from '@testing-library/react-native';

jest.useFakeTimers();

jest.mock('../../../src/navigation', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
}));

jest.mock('../../../src/hooks/useModal');
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest
    .fn()
    .mockReturnValue({ isConnected: false, isInternetReachable: false }),
}));

import useConnectionModal from '../../../src/hooks/useConnectionModal';
import { useModal } from '../../../src/hooks/useModal';

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
});
