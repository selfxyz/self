// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ReactNode } from 'react';
import { render } from '@testing-library/react-native';

import ErrorBoundary from '@/components/ErrorBoundary';
import { captureException } from '@/config/sentry';
import { flushAllAnalytics, trackNfcEvent } from '@/services/analytics';

jest.mock('@/services/analytics', () => ({
  trackNfcEvent: jest.fn(),
  flushAllAnalytics: jest.fn(),
}));

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
}));

const MockText = ({
  children,
  testID,
}: {
  children?: ReactNode;
  testID?: string;
}) => <mock-text testID={testID}>{children}</mock-text>;
const ProblemChild = () => {
  throw new Error('boom');
};

const GoodChild = () => <MockText testID="good-child">Good child</MockText>;

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
    expect(trackNfcEvent).toHaveBeenCalledWith('error_boundary', {
      message: 'boom',
      stack: expect.any(String),
    });
    expect(flushAllAnalytics).toHaveBeenCalled();
  });

  it('renders children normally when no error occurs', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    expect(getByTestId('good-child')).toHaveTextContent('Good child');
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
