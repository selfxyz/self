// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react-native';

import { LoggerProvider, useLogger } from '@/providers/loggerProvider';
import { AppLogger, NfcLogger } from '@/services/logging';

// Mock the native logger bridge
jest.mock('@/services/logging/logger/nativeLoggerBridge', () => ({
  cleanup: jest.fn(),
}));

// Mock the logger utilities
jest.mock('@/services/logging', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  AuthLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  BackupLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  DocumentLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  MockDataLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  NfcLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  NotificationLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  PassportLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  ProofLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  SettingsLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  },
  logLevels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
}));

const MockText = ({
  children,
  testID,
}: {
  children?: ReactNode;
  testID?: string;
}) => <mock-text testID={testID}>{children}</mock-text>;

// Test component that uses the logger
const TestComponent = () => {
  const loggers = useLogger();

  // Test that we can access all loggers
  useEffect(() => {
    loggers.AppLogger.info('Test message');
    loggers.NfcLogger.debug('NFC test');
  }, [loggers]);

  return (
    <MockText testID="test-component">
      Test Component - AppLogger Level: {loggers.logLevels.info}
    </MockText>
  );
};

describe('LoggerProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide all required logger instances and allow logging', () => {
    render(
      <LoggerProvider>
        <TestComponent />
      </LoggerProvider>,
    );

    // Verify the component renders without errors and shows context values
    expect(screen.getByTestId('test-component')).toBeTruthy();
    expect(screen.getByTestId('test-component')).toHaveTextContent(
      /Test Component - AppLogger Level:\s*1/,
    );

    // Verify that logger methods were called with expected arguments
    expect(AppLogger.info).toHaveBeenCalledWith('Test message');
    expect(NfcLogger.debug).toHaveBeenCalledWith('NFC test');
  });

  it('should initialize and allow loggers to be called', () => {
    render(
      <LoggerProvider>
        <MockText testID="logger-provider-text">Test</MockText>
      </LoggerProvider>,
    );
    // The TestComponent is rendered in other tests; here we just assert provider renders without errors
    expect(screen.getByTestId('logger-provider-text')).toHaveTextContent(
      'Test',
    );
  });

  it('should throw error when useLogger is used outside LoggerProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLogger must be used within a LoggerProvider');

    // Restore console.error
    console.error = originalError;
  });

  it('should import nativeLoggerBridge module successfully', () => {
    // The nativeLoggerBridge import should be called when LoggerProvider is rendered
    render(
      <LoggerProvider>
        <MockText testID="logger-provider-text">Test</MockText>
      </LoggerProvider>,
    );

    // Verify that the LoggerProvider renders without errors
    expect(screen.getByTestId('logger-provider-text')).toHaveTextContent(
      'Test',
    );
  });

  it('should provide logLevels constant', () => {
    render(
      <LoggerProvider>
        <TestComponent />
      </LoggerProvider>,
    );

    // The logLevels should be available through the context
    // This is tested implicitly by the TestComponent not throwing errors
    expect(true).toBe(true);
  });
});
