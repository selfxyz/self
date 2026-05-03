// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import { ConnectivityBanner } from '@/components/ConnectivityBanner';
import { useNetInfo } from '@/hooks/useNetInfo';

jest.mock('@/hooks/useNetInfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  SafeAreaProvider: jest.fn(({ children }) => children || null),
  SafeAreaView: jest.fn(({ children }) => children || null),
  useSafeAreaInsets: jest.fn(() => ({
    top: 12,
    bottom: 0,
    left: 0,
    right: 0,
  })),
}));

const mockUseNetInfo = useNetInfo as jest.MockedFunction<typeof useNetInfo>;

describe('ConnectivityBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders offline copy with explicit top and bottom padding', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      details: null,
      type: 'wifi',
    } as never);

    const view = render(<ConnectivityBanner />);

    const alert = view.UNSAFE_getByProps({ accessibilityRole: 'alert' });
    const rendered = JSON.stringify(view.toJSON());

    expect(rendered).toContain('No internet connection');
    expect(rendered).toContain(
      'Some features are unavailable until you reconnect.',
    );
    expect(alert.props.paddingTop).toBe(22);
    expect(alert.props.paddingBottom).toBe(10);
    expect(alert.props.paddingVertical).toBeUndefined();
  });

  it('renders weak copy for slower cellular connections', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: { cellularGeneration: '2g' },
      type: 'cellular',
    } as never);

    const view = render(<ConnectivityBanner />);
    const rendered = JSON.stringify(view.toJSON());

    expect(rendered).toContain('Connection is weak');
    expect(rendered).toContain('Some actions may take longer than usual.');
  });

  it('does not render when the connection is healthy', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: null,
      type: 'wifi',
    } as never);

    const view = render(<ConnectivityBanner />);

    expect(
      view.queryByText('No internet connection') ||
        view.queryByText('Connection is weak'),
    ).toBeNull();
  });
});
