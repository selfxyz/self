// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

// Mock AsyncStorage with a default export
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock Firebase Remote Config with proper setup
jest.mock('@react-native-firebase/remote-config', () => ({
  __esModule: true,
  default: () => ({
    setDefaults: jest.fn(),
    setConfigSettings: jest.fn(),
    fetchAndActivate: jest.fn(),
    getValue: jest.fn(),
    getAll: jest.fn(),
  }),
}));

// Import the mocked AsyncStorage for test controls
import AsyncStorage from '@react-native-async-storage/async-storage';
import remoteConfig from '@react-native-firebase/remote-config';

// Get the mock instances
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockRemoteConfig = remoteConfig() as jest.Mocked<
  ReturnType<typeof remoteConfig>
>;

// Now import the module under test
import {
  clearAllLocalOverrides,
  clearLocalOverride,
  getAllFeatureFlags,
  getFeatureFlag,
  getLocalOverrides,
  setLocalOverride,
} from '../../src/RemoteConfig';

describe('RemoteConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue('{}');
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  // Suppress console errors during testing
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getFeatureFlag', () => {
    it('should return default value when Firebase getValue fails', async () => {
      mockRemoteConfig.getValue.mockImplementation(() => {
        throw new Error('Firebase error');
      });

      const result = await getFeatureFlag('test_feature', true);
      expect(result).toBe(true);
    });

    it('should return local override value when present', async () => {
      const mockOverrides = {
        testFlag: 'override value',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOverrides));

      const result = await getFeatureFlag('testFlag', 'default value');
      expect(result).toBe('override value');
    });

    it('should return default value when no override exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');
      mockRemoteConfig.getValue.mockReturnValue({
        asString: () => 'remote value',
        asBoolean: () => false,
        asNumber: () => 0,
        getSource: () => 'remote',
      });

      const result = await getFeatureFlag('testFlag', 'default value');
      expect(result).toBe('default value');
    });

    it('should preserve type for number flags', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');
      mockRemoteConfig.getValue.mockReturnValue({
        asString: () => '42',
        asBoolean: () => false,
        asNumber: () => 42,
        getSource: () => 'remote',
      });

      const result = await getFeatureFlag('testFlag', 42);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should preserve type for boolean flags', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');
      mockRemoteConfig.getValue.mockReturnValue({
        asString: () => 'true',
        asBoolean: () => true,
        asNumber: () => 1,
        getSource: () => 'remote',
      });

      const result = await getFeatureFlag('testFlag', true);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should prioritize local overrides over remote config', async () => {
      const mockOverrides = {
        testFlag: 'local override',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOverrides));
      mockRemoteConfig.getValue.mockReturnValue({
        asString: () => 'remote value',
        asBoolean: () => false,
        asNumber: () => 0,
        getSource: () => 'remote',
      });

      const result = await getFeatureFlag('testFlag', 'default value');
      expect(result).toBe('local override');

      // Remote config should not be called when local override exists
      expect(mockRemoteConfig.getValue).not.toHaveBeenCalled();
    });
  });

  describe('getAllFeatureFlags', () => {
    it('should return empty array when Firebase getAll fails', async () => {
      mockRemoteConfig.getAll.mockImplementation(() => {
        throw new Error('Firebase error');
      });

      const result = await getAllFeatureFlags();
      expect(result).toEqual([]);
    });

    it('should return complete feature flag structure', async () => {
      // Reset all mocks to clean state
      jest.clearAllMocks();

      const mockRemoteFlags = {
        testFlag: {
          asString: () => 'test value',
          asBoolean: () => false,
          asNumber: () => 0,
          getSource: () => 'remote' as const,
        },
      };

      const mockLocalOverrides = {
        testFlag: 'overridden value',
        localOnlyFlag: 'local only',
      };

      // Configure mocks
      mockRemoteConfig.getAll.mockReturnValue(mockRemoteFlags);
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(mockLocalOverrides),
      );

      const result = await getAllFeatureFlags();

      // Check that the function returns an array
      expect(Array.isArray(result)).toBe(true);

      // Check that each flag has the expected structure
      result.forEach(flag => {
        expect(flag).toHaveProperty('key');
        expect(flag).toHaveProperty('value');
        expect(flag).toHaveProperty('type');
        expect(flag).toHaveProperty('source');
        expect(['boolean', 'string', 'number']).toContain(flag.type);
      });
    });
  });

  describe('Local Override Management', () => {
    it('should store and retrieve mixed types correctly', async () => {
      const mockOverrides = {
        stringFlag: 'hello world',
        booleanFlag: true,
        numberFlag: 42,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOverrides));

      const result = await getLocalOverrides();
      expect(result).toEqual(mockOverrides);
    });

    it('should set local override for string values', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      await setLocalOverride('testString', 'hello world');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ testString: 'hello world' }),
      );
    });

    it('should set local override for number values', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      await setLocalOverride('testNumber', 123);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ testNumber: 123 }),
      );
    });

    it('should set local override for boolean values', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      await setLocalOverride('testBoolean', true);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ testBoolean: true }),
      );
    });

    it('should clear specific local override', async () => {
      const mockOverrides = {
        flag1: 'value1',
        flag2: 'value2',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOverrides));

      await clearLocalOverride('flag1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ flag2: 'value2' }),
      );
    });

    it('should clear all local overrides', async () => {
      await clearAllLocalOverrides();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
      );
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await getLocalOverrides();
      expect(result).toEqual({});
    });
  });
});
