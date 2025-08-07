// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { Text } from 'react-native';

// Import after mocking
import {
  PassportProvider,
  usePassport,
} from '../../../src/providers/passportDataProvider';

import { render } from '@testing-library/react-native';

// Mock react-native-keychain before importing the module
const mockKeychain = {
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
};

jest.mock('react-native-keychain', () => mockKeychain);

// Mock the auth provider
const mockAuthProvider = {
  _getSecurely: jest.fn(),
};

jest.mock('../../../src/providers/authProvider', () => ({
  useAuth: () => mockAuthProvider,
}));

// Test component that uses the passport hook
const TestComponent = () => {
  usePassport(); // Use the hook but don't store the result
  return (
    <>
      <Text testID="getData">getData available</Text>
      <Text testID="setData">setData available</Text>
    </>
  );
};

describe('PassportDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should provide context values to children', () => {
    const { getByTestId } = render(
      <PassportProvider>
        <TestComponent />
      </PassportProvider>,
    );

    expect(getByTestId('getData')).toBeTruthy();
    expect(getByTestId('setData')).toBeTruthy();
  });

  describe('JSON Parsing Error Handling Tests', () => {
    it('should handle corrupted JSON data gracefully', async () => {
      // Mock corrupted data for legacy migration
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: 'invalid json data',
      });

      // Import the module fresh
      const {
        migrateFromLegacyStorage,
      } = require('../../../src/providers/passportDataProvider');

      // Mock console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should not throw an error and should skip corrupted data
      await migrateFromLegacyStorage();

      // Should have logged a warning about migration failures (not JSON parsing)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not migrate from service'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON in legacy migration', async () => {
      // Mock corrupted data for legacy migration
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: '{invalid json}',
      });

      // Import the module fresh
      const {
        migrateFromLegacyStorage,
      } = require('../../../src/providers/passportDataProvider');

      // Mock console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This should not throw an error and should skip corrupted data
      await migrateFromLegacyStorage();

      // Should have logged a warning about migration failures (not JSON parsing)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not migrate from service'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('initializeNativeModules', () => {
    let initializeNativeModulesLocal: any;

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset module state for each test by re-importing
      jest.resetModules();
      jest.doMock('react-native-keychain', () => mockKeychain);

      const passportModule = require('../../../src/providers/passportDataProvider');
      initializeNativeModulesLocal = passportModule.initializeNativeModules;
    });

    it('should handle concurrent calls without race conditions', async () => {
      // Mock successful keychain response
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: 'test',
      });

      // Call initializeNativeModules multiple times concurrently
      const promises = Array.from({ length: 5 }, () =>
        initializeNativeModulesLocal(),
      );

      // All promises should resolve to true
      const results = await Promise.all(promises);

      expect(results).toEqual([true, true, true, true, true]);

      // The keychain should only be called once despite multiple concurrent calls
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: 'test-availability',
      });
    });

    it('should return true immediately for subsequent calls after successful initialization', async () => {
      // Mock successful keychain response
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: 'test',
      });

      // First call should initialize
      const firstResult = await initializeNativeModulesLocal();
      expect(firstResult).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);

      // Clear mock calls to verify subsequent calls don't hit keychain
      jest.clearAllMocks();

      // Subsequent calls should return immediately without hitting keychain
      const secondResult = await initializeNativeModulesLocal();
      expect(secondResult).toBe(true);
      expect(mockKeychain.getGenericPassword).not.toHaveBeenCalled();
    });
  });
});
