// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { useNetInfo } from '@/hooks/useNetInfo';
import ConnectedAppLayout from '@/layouts/AppLayout';

jest.mock('@/hooks/useNetInfo', () => ({
  useNetInfo: jest.fn(),
}));

const mockUseNetInfo = useNetInfo as jest.MockedFunction<typeof useNetInfo>;

describe('AppLayout connectivity banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the offline banner above children', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      details: null,
      type: 'wifi',
    } as never);

    const { toJSON } = render(
      <ConnectedAppLayout>
        <Text>Screen</Text>
      </ConnectedAppLayout>,
    );

    expect(screen.getByText('Screen')).toBeTruthy();
    expect(JSON.stringify(toJSON())).toContain('No internet connection');
  });

  it('renders the weak connection banner for slow cellular links', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: { cellularGeneration: '2g' },
      type: 'cellular',
    } as never);

    const { toJSON } = render(
      <ConnectedAppLayout>
        <Text>Screen</Text>
      </ConnectedAppLayout>,
    );

    expect(JSON.stringify(toJSON())).toContain('Connection is weak');
    expect(JSON.stringify(toJSON())).toContain(
      'This step may take longer than usual.',
    );
  });

  it('does not render a banner when the connection is healthy', () => {
    mockUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: null,
      type: 'wifi',
    } as never);

    const { toJSON } = render(
      <ConnectedAppLayout>
        <Text>Screen</Text>
      </ConnectedAppLayout>,
    );

    expect(JSON.stringify(toJSON())).not.toContain('No internet connection');
    expect(JSON.stringify(toJSON())).not.toContain('Connection is weak');
  });
});
