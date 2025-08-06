// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { Text } from 'react-native';

import { render } from '@testing-library/react-native';

const mockFlush = jest.fn();
const mockAnalytics = jest.fn(() => ({
  flush: mockFlush,
}));

jest.doMock('../../../src/utils/analytics', () => mockAnalytics);
jest.mock('../../../src/Sentry', () => ({
  captureException: jest.fn(),
}));

// Import after mocks are set up
const ErrorBoundary = require('../../../src/components/ErrorBoundary').default;
const { captureException } = require('../../../src/Sentry');

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
    expect(mockFlush).toHaveBeenCalled();
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
