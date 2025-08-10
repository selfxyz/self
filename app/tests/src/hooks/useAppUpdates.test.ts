// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { checkVersion } from 'react-native-check-version';
import { useNavigation } from '@react-navigation/native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAppUpdates } from '@/hooks/useAppUpdates';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-check-version', () => ({
  checkVersion: jest.fn(),
}));

jest.mock('@/utils/modalCallbackRegistry', () => ({
  registerModalCallbacks: jest.fn().mockReturnValue(1),
}));

jest.mock('@/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));

const navigate = jest.fn();
(useNavigation as jest.Mock).mockReturnValue({ navigate });

describe('useAppUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('indicates update available', async () => {
    (checkVersion as jest.Mock).mockResolvedValue({
      needsUpdate: true,
      url: 'u',
    });

    const { result } = renderHook(() => useAppUpdates());

    // Wait for the async state update to complete
    await waitFor(() => {
      expect(result.current[0]).toBe(true);
    });
  });

  it('shows modal when triggered', async () => {
    (checkVersion as jest.Mock).mockResolvedValue({
      needsUpdate: true,
      url: 'u',
    });

    const { result } = renderHook(() => useAppUpdates());

    // Wait for the async checkVersion to complete first
    await waitFor(() => {
      expect(result.current[0]).toBe(true);
    });

    // Now test the modal trigger
    act(() => {
      result.current[1]();
    });

    expect(registerModalCallbacks).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Modal', expect.any(Object));
  });
});
