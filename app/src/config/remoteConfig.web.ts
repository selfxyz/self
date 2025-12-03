// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Web-compatible version using LocalStorage and Firebase Web SDK
// This file provides the same API as RemoteConfig.ts but for web environments

import type {
  FeatureFlagValue,
  RemoteConfigBackend,
  RemoteConfigValue,
  StorageBackend,
} from '@/config/remoteConfig.shared';
import {
  clearAllLocalOverrides as clearAllLocalOverridesShared,
  clearLocalOverride as clearLocalOverrideShared,
  getAllFeatureFlags as getAllFeatureFlagsShared,
  getFeatureFlag as getFeatureFlagShared,
  getLocalOverrides as getLocalOverridesShared,
  initRemoteConfig as initRemoteConfigShared,
  refreshRemoteConfig as refreshRemoteConfigShared,
  setLocalOverride as setLocalOverrideShared,
} from '@/config/remoteConfig.shared';

// Web-specific storage backend using LocalStorage
const webStorageBackend: StorageBackend = {
  getItem: async (key: string): Promise<string | null> => {
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
};

// Mock Firebase Remote Config for web (since Firebase Web SDK for Remote Config is not installed)
// In a real implementation, you would import and use the Firebase Web SDK
class MockFirebaseRemoteConfig implements RemoteConfigBackend {
  private config: Record<string, FeatureFlagValue> = {};
  private settings: Record<string, unknown> = {};

  setDefaults(defaults: Record<string, FeatureFlagValue>) {
    this.config = { ...defaults };
  }

  setConfigSettings(settings: Record<string, unknown>) {
    this.settings = settings;
  }

  async fetchAndActivate(): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  getValue(key: string) {
    const value = this.config[key] || '';
    return {
      asBoolean: () => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value === 'true';
        return false;
      },
      asNumber: () => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      },
      asString: () => {
        if (typeof value === 'string') return value;
        return String(value);
      },
      getSource: () => {
        return String(value);
      },
    };
  }

  getAll(): Record<string, RemoteConfigValue> {
    const result: Record<string, RemoteConfigValue> = {};
    for (const [key, _value] of Object.entries(this.config)) {
      result[key] = this.getValue(key);
    }
    return result;
  }
}

// Web-specific remote config backend using mock Firebase
const webRemoteConfigBackend: RemoteConfigBackend =
  new MockFirebaseRemoteConfig();

export type { FeatureFlagValue } from '@/config/remoteConfig.shared';

export const clearAllLocalOverrides = () =>
  clearAllLocalOverridesShared(webStorageBackend);

export const clearLocalOverride = (flag: string) =>
  clearLocalOverrideShared(webStorageBackend, flag);

export const getAllFeatureFlags = () =>
  getAllFeatureFlagsShared(webRemoteConfigBackend, webStorageBackend);
// Export the shared functions with web-specific backends
export const getFeatureFlag = <T extends FeatureFlagValue>(
  flag: string,
  defaultValue: T,
) =>
  getFeatureFlagShared(
    webRemoteConfigBackend,
    webStorageBackend,
    flag,
    defaultValue,
  );
export const getLocalOverrides = () =>
  getLocalOverridesShared(webStorageBackend);
export const initRemoteConfig = () =>
  initRemoteConfigShared(webRemoteConfigBackend);
// Re-export types for convenience
export const refreshRemoteConfig = () =>
  refreshRemoteConfigShared(webRemoteConfigBackend);

export const setLocalOverride = (flag: string, value: FeatureFlagValue) =>
  setLocalOverrideShared(webStorageBackend, flag, value);
