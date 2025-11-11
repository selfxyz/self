// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

const mockTrackNfcEvent = jest.fn();
const mockFlushAllAnalytics = jest.fn();

jest.doMock('@/utils/analytics', () => ({
  trackNfcEvent: mockTrackNfcEvent,
  flushAllAnalytics: mockFlushAllAnalytics,
}));
jest.mock('@/Sentry', () => ({
  captureException: jest.fn(),
}));

// Import after mocks are set up
const ErrorBoundary = require('@/components/ErrorBoundary').default;
const { captureException } = require('@/Sentry');

const ProblemChild = () => {
  throw new Error('boom');
};

const GoodChild = () => <Text>Good child</Text>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs errors to Sentry with correct parameters', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: true,
      }),
    );
  });

  it('renders error UI when child component throws', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    expect(
      getByText('Something went wrong. Please restart the app.'),
    ).toBeTruthy();
  });

  it('calls analytics flush before logging to Sentry', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    expect(mockTrackNfcEvent).toHaveBeenCalledWith('error_boundary', {
      message: 'boom',
      stack: expect.any(String),
    });
    expect(mockFlushAllAnalytics).toHaveBeenCalled();
  });

  it('renders children normally when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    expect(getByText('Good child')).toBeTruthy();
  });

  it('captures error details correctly', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const testError = new Error('Test error message');
    const ProblemChildWithSpecificError = () => {
      throw testError;
    };

    render(
      <ErrorBoundary>
        <ProblemChildWithSpecificError />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    expect(captureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: true,
      }),
    );
  });

  it('handles multiple error boundaries correctly', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ErrorBoundary>
          <ProblemChild />
        </ErrorBoundary>
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    // Should show the error UI from the inner error boundary
    expect(
      getByText('Something went wrong. Please restart the app.'),
    ).toBeTruthy();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('maintains error state after catching an error', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();

    // Verify error UI is shown
    expect(
      getByText('Something went wrong. Please restart the app.'),
    ).toBeTruthy();

    // Rerender with a good child - should still show error UI
    rerender(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    // Should still show error UI, not the good child
    expect(
      getByText('Something went wrong. Please restart the app.'),
    ).toBeTruthy();
    expect(() => getByText('Good child')).toThrow();
  });
});
