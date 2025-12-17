// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import { useModal } from '@/hooks/useModal';
import { getModalCallbacks } from '@/utils/modalCallbackRegistry';

describe('useModal', () => {
  beforeEach(() => {
    // Reset all mocks including the global navigationRef
    jest.clearAllMocks();

    // Set up the navigation ref mock with proper methods
    global.mockNavigationRef.isReady.mockReturnValue(true);
    global.mockNavigationRef.getState.mockReturnValue({
      routes: [{ name: 'Home' }, { name: 'Modal' }],
      index: 1,
    });
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

    expect(global.mockNavigationRef.navigate).toHaveBeenCalledTimes(1);
    const [screenName, params] =
      global.mockNavigationRef.navigate.mock.calls[0];
    expect(screenName).toBe('Modal');
    expect(params).toMatchObject({
      titleText: 'Title',
      bodyText: 'Body',
      buttonText: 'OK',
    });
    expect(params.callbackId).toEqual(expect.any(Number));
    const id = params.callbackId;
    expect(getModalCallbacks(id)).toBeDefined();

    act(() => result.current.dismissModal());

    expect(global.mockNavigationRef.goBack).toHaveBeenCalled();
    expect(onModalDismiss).toHaveBeenCalled();
    expect(getModalCallbacks(id)).toBeUndefined();
  });
});
