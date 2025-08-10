// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useNavigation } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';

import { useModal } from '@/hooks/useModal';
import { getModalCallbacks } from '@/utils/modalCallbackRegistry';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetState = jest.fn(() => ({
  routes: [{ name: 'Home' }, { name: 'Modal' }],
}));

describe('useModal', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      getState: mockGetState,
    });
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockGetState.mockClear();
  });

  it('should navigate to Modal with callbackId and handle dismissal', () => {
    const onButtonPress = jest.fn();
    const onModalDismiss = jest.fn();
    const { result } = renderHook(() =>
      useModal({
        titleText: 'Title',
        bodyText: 'Body',
        buttonText: 'OK',
        onButtonPress,
        onModalDismiss,
      }),
    );

    act(() => result.current.showModal());

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const params = mockNavigate.mock.calls[0][1];
    expect(params).toMatchObject({
      titleText: 'Title',
      bodyText: 'Body',
      buttonText: 'OK',
    });
    expect(params.callbackId).toEqual(expect.any(Number));
    const id = params.callbackId;
    expect(getModalCallbacks(id)).toBeDefined();

    act(() => result.current.dismissModal());

    expect(mockGoBack).toHaveBeenCalled();
    expect(onModalDismiss).toHaveBeenCalled();
    expect(getModalCallbacks(id)).toBeUndefined();
  });
});
