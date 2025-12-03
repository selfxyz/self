// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { initRemoteConfig } from '@/config/remoteConfig';
import {
  RemoteConfigProvider,
  useRemoteConfig,
} from '@/providers/remoteConfigProvider';

// Mock the RemoteConfig module
jest.mock('@/config/remoteConfig', () => ({
  initRemoteConfig: jest.fn(),
}));

const mockInitRemoteConfig = initRemoteConfig as jest.MockedFunction<
  typeof initRemoteConfig
>;

// Test component that uses the hook
const MockText = ({
  children,
  testID,
}: {
  children?: ReactNode;
  testID: string;
}) => <mock-text testID={testID}>{children}</mock-text>;

const TestComponent = () => {
  const { isInitialized, error } = useRemoteConfig();
  return (
    <>
      <MockText testID="initialized">
        {isInitialized ? 'true' : 'false'}
      </MockText>
      <MockText testID="error">{error || 'none'}</MockText>
    </>
  );
};

describe('RemoteConfigProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  it('should initialize successfully and set isInitialized to true', async () => {
    mockInitRemoteConfig.mockResolvedValue(undefined);

    const { getByTestId } = render(
      <RemoteConfigProvider>
        <TestComponent />
      </RemoteConfigProvider>,
    );

    // Initially should be false
    expect(getByTestId('initialized')).toHaveTextContent('false');
    expect(getByTestId('error')).toHaveTextContent('none');

    // Wait for initialization to complete
    await waitFor(
      () => {
        expect(getByTestId('initialized')).toHaveTextContent('true');
      },
      { timeout: 10000 },
    );

    expect(getByTestId('error')).toHaveTextContent('none');
    expect(mockInitRemoteConfig).toHaveBeenCalledTimes(1);
  }, 15000);

  it('should handle initialization errors gracefully', async () => {
    const errorMessage = 'Firebase initialization failed';
    mockInitRemoteConfig.mockRejectedValue(new Error(errorMessage));

    const { getByTestId } = render(
      <RemoteConfigProvider>
        <TestComponent />
      </RemoteConfigProvider>,
    );

    // Wait for initialization to complete (with error)
    await waitFor(() => {
      expect(getByTestId('initialized')).toHaveTextContent('true');
    });

    expect(getByTestId('error')).toHaveTextContent(errorMessage);
    expect(console.error).toHaveBeenCalledWith(
      'Failed to initialize remote config:',
      expect.any(Error),
    );
  });

  it('should handle non-Error rejection gracefully', async () => {
    mockInitRemoteConfig.mockRejectedValue('String error');

    const { getByTestId } = render(
      <RemoteConfigProvider>
        <TestComponent />
      </RemoteConfigProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('initialized')).toHaveTextContent('true');
    });

    expect(getByTestId('error')).toHaveTextContent('Unknown error');
  });

  it('should only initialize once', async () => {
    mockInitRemoteConfig.mockResolvedValue(undefined);

    const { rerender } = render(
      <RemoteConfigProvider>
        <TestComponent />
      </RemoteConfigProvider>,
    );

    await waitFor(() => {
      expect(mockInitRemoteConfig).toHaveBeenCalledTimes(1);
    });

    // Re-render the provider
    rerender(
      <RemoteConfigProvider>
        <TestComponent />
      </RemoteConfigProvider>,
    );

    // Should still only be called once
    expect(mockInitRemoteConfig).toHaveBeenCalledTimes(1);
  });
});
