// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import useHapticNavigation from '../../../src/hooks/useHapticNavigation';
import {
  impactLight,
  impactMedium,
  selectionChange,
} from '../../../src/utils/haptic';

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../src/utils/haptic', () => ({
  impactLight: jest.fn(),
  impactMedium: jest.fn(),
  selectionChange: jest.fn(),
}));

const navigate = jest.fn();
const popTo = jest.fn();
(useNavigation as jest.Mock).mockReturnValue({ navigate, popTo });

describe('useHapticNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates with light impact by default', () => {
    const { result } = renderHook(() => useHapticNavigation('Home'));
    act(() => {
      result.current();
    });
    expect(impactLight).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Home');
  });

  it('uses cancel action', () => {
    const { result } = renderHook(() =>
      useHapticNavigation('Home', { action: 'cancel' }),
    );
    act(() => result.current());
    expect(selectionChange).toHaveBeenCalled();
    expect(popTo).toHaveBeenCalledWith('Home');
  });

  it('uses confirm action', () => {
    const { result } = renderHook(() =>
      useHapticNavigation('Home', { action: 'confirm' }),
    );
    act(() => result.current());
    expect(impactMedium).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Home');
  });
});
