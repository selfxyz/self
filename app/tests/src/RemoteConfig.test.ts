// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Firebase Remote Config with minimal setup
const mockRemoteConfig = {
  setDefaults: jest.fn(),
  setConfigSettings: jest.fn(),
  fetchAndActivate: jest.fn(),
  getValue: jest.fn(),
  getAll: jest.fn(),
};

jest.mock('@react-native-firebase/remote-config', () => () => mockRemoteConfig);

import {
  clearAllLocalOverrides,
  clearLocalOverride,
  getAllFeatureFlags,
  getFeatureFlag,
  getLocalOverrides,
  setLocalOverride,
} from '../../src/RemoteConfig';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn() as jest.MockedFunction<typeof AsyncStorage.getItem>,
  setItem: jest.fn() as jest.MockedFunction<typeof AsyncStorage.setItem>,
  removeItem: jest.fn() as jest.MockedFunction<typeof AsyncStorage.removeItem>,
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('RemoteConfig Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should return default value when asBoolean returns null', async () => {
      mockRemoteConfig.getValue.mockReturnValue({
        asBoolean: () => null,
      });

      const result = await getFeatureFlag('test_feature', true);
      expect(result).toBe(true);
    });

    it('should return false when no default is provided and value is null', async () => {
      mockRemoteConfig.getValue.mockReturnValue({
        asBoolean: () => null,
      });

      const result = await getFeatureFlag('test_feature', false);
      expect(result).toBe(false);
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

    it('should correctly map source types', async () => {
      mockRemoteConfig.getAll.mockReturnValue({
        test_flag: {
          asBoolean: () => true,
          getSource: () => 'remote',
        },
      });

      const result = await getAllFeatureFlags();
      expect(result).toEqual([
        { key: 'test_flag', value: true, source: 'Remote Config' },
      ]);
    });
  });
});

describe('RemoteConfig Mixed Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  describe('Feature Flag Retrieval', () => {
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

      const result = await getFeatureFlag('testFlag', 'default value');
      expect(result).toBe('default value');
    });

    it('should preserve type for number flags', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      const result = await getFeatureFlag('testFlag', 42);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should preserve type for boolean flags', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{}');

      const result = await getFeatureFlag('testFlag', true);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Get All Feature Flags', () => {
    it('should return flags with correct types', async () => {
      const mockRemoteConfig =
        require('@react-native-firebase/remote-config')();

      mockRemoteConfig.getAll.mockReturnValue({
        stringFlag: {
          asString: () => 'remote string',
          asBoolean: () => false,
          asNumber: () => 0,
          getSource: () => 'remote',
        },
        booleanFlag: {
          asString: () => 'true',
          asBoolean: () => true,
          asNumber: () => 1,
          getSource: () => 'remote',
        },
        numberFlag: {
          asString: () => '42',
          asBoolean: () => false,
          asNumber: () => 42,
          getSource: () => 'remote',
        },
      });

      mockAsyncStorage.getItem.mockResolvedValue('{}');

      const result = await getAllFeatureFlags();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'stringFlag',
            type: 'string',
            value: 'remote string',
          }),
          expect.objectContaining({
            key: 'booleanFlag',
            type: 'boolean',
            value: true,
          }),
          expect.objectContaining({
            key: 'numberFlag',
            type: 'number',
            value: 42,
          }),
        ]),
      );
    });

    it('should include local overrides in results', async () => {
      const mockRemoteConfig =
        require('@react-native-firebase/remote-config')();

      mockRemoteConfig.getAll.mockReturnValue({
        remoteFlag: {
          asString: () => 'remote value',
          asBoolean: () => false,
          asNumber: () => 0,
          getSource: () => 'remote',
        },
      });

      const mockOverrides = {
        localOnlyFlag: 'local only value',
        remoteFlag: 'overridden value',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockOverrides));

      const result = await getAllFeatureFlags();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'remoteFlag',
            value: 'overridden value',
            source: 'Local Override',
          }),
          expect.objectContaining({
            key: 'localOnlyFlag',
            value: 'local only value',
            source: 'Local Override',
          }),
        ]),
      );
    });
  });
});
