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

    it('should return true immediately if native modules are already ready', async () => {
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

    it('should handle "requiring unknown module" errors by retrying', async () => {
      // Mock the error that occurs when native modules aren't ready
      const moduleError = new Error(
        'Requiring unknown module "react-native-keychain"',
      );
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockRejectedValueOnce(moduleError)
        .mockRejectedValueOnce(moduleError)
        .mockResolvedValue({ password: 'test' });

      const result = await initializeNativeModulesLocal(3, 10); // 3 retries, 10ms delay

      expect(result).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(3);
    });

    it('should return false after max retries if modules never become ready', async () => {
      // Mock persistent module error
      const moduleError = new Error(
        'Requiring unknown module "react-native-keychain"',
      );
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockRejectedValue(moduleError);

      const result = await initializeNativeModulesLocal(2, 10); // 2 retries, 10ms delay

      expect(result).toBe(false);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(2);
    });

    it('should handle other errors by assuming Keychain is available', async () => {
      // Mock a different type of error (like service not found)
      const otherError = new Error('Service not found');
      mockKeychain.getGenericPassword = jest.fn().mockRejectedValue(otherError);

      const result = await initializeNativeModulesLocal();

      expect(result).toBe(true);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrateFromLegacyStorage', () => {
    let migrateFromLegacyStorageLocal: any;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
      jest.doMock('react-native-keychain', () => mockKeychain);

      const passportModule = require('../../../src/providers/passportDataProvider');
      migrateFromLegacyStorageLocal = passportModule.migrateFromLegacyStorage;
    });

    it('should skip migration if catalog already has documents', async () => {
      // First initialize native modules to set the flag
      const passportModule = require('../../../src/providers/passportDataProvider');
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [{ id: 'existing' }] }),
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await passportModule.initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorageLocal();

      // Should log that migration is already completed
      expect(consoleSpy).toHaveBeenCalledWith('Migration already completed');

      consoleSpy.mockRestore();
    });

    it('should migrate legacy documents when catalog is empty', async () => {
      // First initialize native modules to set the flag
      const passportModule = require('../../../src/providers/passportDataProvider');
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [] }),
        }) // For loadDocumentCatalog
        .mockResolvedValueOnce({
          password: JSON.stringify({ documentType: 'passport', mrz: 'test' }),
        }) // For legacy document
        .mockResolvedValue(false); // No more legacy documents

      // Initialize native modules first
      await passportModule.initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorageLocal();

      // Should log migration start and completion
      expect(consoleSpy).toHaveBeenCalledWith(
        'Migrating from legacy storage to new architecture...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('Migration completed');

      consoleSpy.mockRestore();
    });

    it('should handle errors during migration gracefully', async () => {
      // First initialize native modules to set the flag
      const passportModule = require('../../../src/providers/passportDataProvider');
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [] }),
        }) // For loadDocumentCatalog
        .mockRejectedValue(new Error('Keychain error')); // Error on legacy service

      // Initialize native modules first
      await passportModule.initializeNativeModules();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await migrateFromLegacyStorageLocal();

      // Should log error for each service that fails
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not migrate from service passportData:'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('loadDocumentCatalog', () => {
    let loadDocumentCatalogLocal: any;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
      jest.doMock('react-native-keychain', () => mockKeychain);

      const passportModule = require('../../../src/providers/passportDataProvider');
      loadDocumentCatalogLocal = passportModule.loadDocumentCatalog;
    });

    it('should return empty catalog when Keychain is undefined', async () => {
      // Mock that Keychain is undefined
      jest.doMock('react-native-keychain', () => undefined);

      const result = await loadDocumentCatalogLocal();

      expect(result).toEqual({ documents: [] });
    });

    it('should return empty catalog when no catalog exists', async () => {
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue(false);

      const result = await loadDocumentCatalogLocal();

      expect(result).toEqual({ documents: [] });
    });

    it('should return empty catalog when native modules are not ready', async () => {
      // Since nativeModulesReady is a module-level variable, we can't easily mock it
      // The function will return empty catalog when native modules are not ready
      mockKeychain.getGenericPassword = jest.fn().mockResolvedValue({
        password: JSON.stringify({ documents: [{ id: 'test' }] }),
      });

      const result = await loadDocumentCatalogLocal();

      // The function should return empty catalog due to nativeModulesReady check
      expect(result).toEqual({ documents: [] });
    });

    it('should return parsed catalog when it exists and native modules are ready', async () => {
      // First initialize native modules to set the flag
      const passportModule = require('../../../src/providers/passportDataProvider');
      mockKeychain.getGenericPassword = jest
        .fn()
        .mockResolvedValueOnce({ password: 'test' }) // For initializeNativeModules
        .mockResolvedValueOnce({
          password: JSON.stringify({ documents: [{ id: 'test' }] }),
        }); // For loadDocumentCatalog

      // Initialize native modules first
      await passportModule.initializeNativeModules();

      // Now test loadDocumentCatalog
      const result = await loadDocumentCatalogLocal();

      expect(result).toEqual({ documents: [{ id: 'test' }] });
    });
  });
});
