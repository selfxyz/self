// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

// Mock Firebase Remote Config with minimal setup
const mockRemoteConfig = {
  setDefaults: jest.fn(),
  setConfigSettings: jest.fn(),
  fetchAndActivate: jest.fn(),
  getValue: jest.fn(),
  getAll: jest.fn(),
};

jest.mock('@react-native-firebase/remote-config', () => () => mockRemoteConfig);

import { getAllFeatureFlags, getFeatureFlag } from '../../src/RemoteConfig';

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

      const result = await getFeatureFlag('test_feature');
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
