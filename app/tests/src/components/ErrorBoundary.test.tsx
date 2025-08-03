// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorBoundary from '../../../src/components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureReactException: jest.fn(),
}));

jest.mock('../../../src/utils/analytics', () => () => ({
  flush: jest.fn(),
}));

const ProblemChild = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('logs errors to Sentry', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    consoleError.mockRestore();
    expect(Sentry.captureReactException).toHaveBeenCalled();
  });
});
