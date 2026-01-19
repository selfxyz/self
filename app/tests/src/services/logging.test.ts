// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 */

import type { LoggingSeverity } from '@/stores/settingStore';
import { useSettingStore } from '@/stores/settingStore';

// Track individual logger instances to verify they all get updated
// Must be prefixed with 'mock' to be accessible in jest.mock()
const mockLoggerInstances = new Map<string, { setSeverity: jest.Mock }>();
const mockRootSetSeverity = jest.fn();

// Mock react-native-logs
jest.mock('react-native-logs', () => ({
  logger: {
    createLogger: jest.fn(() => ({
      setSeverity: mockRootSetSeverity,
      extend: jest.fn((name: string) => {
        const mockSetSeverity = jest.fn();
        mockLoggerInstances.set(name, { setSeverity: mockSetSeverity });
        return {
          setSeverity: mockSetSeverity,
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          extend: jest.fn(),
        };
      }),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

// Mock the loki transport
jest.mock('@/services/logging/logger/lokiTransport', () => ({
  lokiTransport: jest.fn(),
  cleanupLokiTransport: jest.fn(),
}));

// Mock the console interceptor
jest.mock('@/services/logging/logger/consoleInterceptor', () => ({
  interceptConsole: jest.fn(),
}));

// Mock the native logger bridge
jest.mock('@/services/logging/logger/nativeLoggerBridge', () => ({
  setupNativeLoggerBridge: jest.fn(),
  cleanup: jest.fn(),
}));

describe('Logging Service - Severity Updates', () => {
  // All extended logger names that should be created
  const expectedLoggers = [
    'APP',
    'NOTIFICATION',
    'AUTH',
    'PASSPORT',
    'PROOF',
    'SETTINGS',
    'BACKUP',
    'MOCK_DATA',
    'DOCUMENT',
    'NFC',
  ];

  beforeAll(async () => {
    // Import the logging module once before all tests
    // This triggers the creation of all loggers and sets up the subscription
    await import('@/services/logging');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Note: Don't clear mockLoggerInstances as the loggers are created only once during module import
    // Reset store to default state
    useSettingStore.setState({
      loggingSeverity: 'warn',
    });
  });

  it('should create all expected extended loggers', () => {
    // Verify all expected loggers were created during module import
    expect(mockLoggerInstances.size).toBe(expectedLoggers.length);
    expectedLoggers.forEach(name => {
      expect(mockLoggerInstances.has(name)).toBe(true);
    });
  });

  it('should update severity on root logger when settings change', async () => {
    // Clear any calls from initialization
    mockRootSetSeverity.mockClear();

    // Change the logging severity in the store
    useSettingStore.getState().setLoggingSeverity('debug');

    // Wait for the subscription to fire
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify root logger was updated
    // Extended loggers inherit severity from root logger automatically
    expect(mockRootSetSeverity).toHaveBeenCalledTimes(1);
    expect(mockRootSetSeverity).toHaveBeenCalledWith('debug');
  });

  it('should update root logger severity which extends to all loggers', async () => {
    mockRootSetSeverity.mockClear();

    useSettingStore.getState().setLoggingSeverity('info');
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify root logger was updated
    // Extended loggers (APP, NFC, PASSPORT, PROOF, etc.) inherit from root
    expect(mockRootSetSeverity).toHaveBeenCalledTimes(1);
    expect(mockRootSetSeverity).toHaveBeenCalledWith('info');
  });

  it('should update severity for all severity levels', async () => {
    const severityLevels: LoggingSeverity[] = [
      'debug',
      'info',
      'warn',
      'error',
    ];

    for (const level of severityLevels) {
      mockRootSetSeverity.mockClear();

      useSettingStore.getState().setLoggingSeverity(level);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify root logger was updated
      // Extended loggers inherit severity from root automatically
      expect(mockRootSetSeverity).toHaveBeenCalledWith(level);
    }
  });

  it('should not call setSeverity if severity has not changed', async () => {
    mockRootSetSeverity.mockClear();

    // Get current severity
    const currentSeverity = useSettingStore.getState().loggingSeverity;

    // Set to the same severity
    useSettingStore.getState().setLoggingSeverity(currentSeverity);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Should not call setSeverity on root logger
    expect(mockRootSetSeverity).not.toHaveBeenCalled();
  });

  it('should handle rapid severity changes correctly', async () => {
    mockRootSetSeverity.mockClear();

    // Rapidly change severity multiple times
    useSettingStore.getState().setLoggingSeverity('debug');
    useSettingStore.getState().setLoggingSeverity('info');
    useSettingStore.getState().setLoggingSeverity('warn');
    useSettingStore.getState().setLoggingSeverity('error');

    // Wait for all subscriptions to fire
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have been called 4 times (once per change)
    // Extended loggers inherit severity from root automatically
    expect(mockRootSetSeverity).toHaveBeenCalledTimes(4);

    // The last call should be 'error'
    expect(mockRootSetSeverity).toHaveBeenLastCalledWith('error');
  });
});
