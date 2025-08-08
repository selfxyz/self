// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type {
  FeatureFlagValue,
  RemoteConfigBackend,
  StorageBackend,
} from './RemoteConfig.shared';
import {
  clearAllLocalOverrides as clearAllLocalOverridesShared,
  clearLocalOverride as clearLocalOverrideShared,
  getAllFeatureFlags as getAllFeatureFlagsShared,
  getFeatureFlag as getFeatureFlagShared,
  getLocalOverrides as getLocalOverridesShared,
  initRemoteConfig as initRemoteConfigShared,
  refreshRemoteConfig as refreshRemoteConfigShared,
  setLocalOverride as setLocalOverrideShared,
} from './RemoteConfig.shared';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseRemoteConfigTypes } from '@react-native-firebase/remote-config';
import remoteConfig from '@react-native-firebase/remote-config';

// Mobile-specific storage backend using AsyncStorage
const mobileStorageBackend: StorageBackend = {
  getItem: async (key: string): Promise<string | null> => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

// Mobile-specific remote config backend using React Native Firebase
const mobileRemoteConfigBackend: RemoteConfigBackend = {
  getValue: (key: string) => {
    return remoteConfig().getValue(key);
  },
  getAll: () => {
    return remoteConfig().getAll();
  },
  setDefaults: async (defaults: FirebaseRemoteConfigTypes.ConfigDefaults) => {
    await remoteConfig().setDefaults(defaults);
  },
  setConfigSettings: async (
    settings: FirebaseRemoteConfigTypes.ConfigSettings,
  ) => {
    await remoteConfig().setConfigSettings(settings);
  },
  fetchAndActivate: async (): Promise<boolean> => {
    return await remoteConfig().fetchAndActivate();
  },
};

export type { FeatureFlagValue } from './RemoteConfig.shared';

export const clearAllLocalOverrides = () =>
  clearAllLocalOverridesShared(mobileStorageBackend);

export const clearLocalOverride = (flag: string) =>
  clearLocalOverrideShared(mobileStorageBackend, flag);

export const getAllFeatureFlags = () =>
  getAllFeatureFlagsShared(mobileRemoteConfigBackend, mobileStorageBackend);
// Export the shared functions with mobile-specific backends
export const getFeatureFlag = <T extends FeatureFlagValue>(
  flag: string,
  defaultValue: T,
) =>
  getFeatureFlagShared(
    mobileRemoteConfigBackend,
    mobileStorageBackend,
    flag,
    defaultValue,
  );
export const getLocalOverrides = () =>
  getLocalOverridesShared(mobileStorageBackend);
export const initRemoteConfig = () =>
  initRemoteConfigShared(mobileRemoteConfigBackend);
// Re-export types for convenience
export const refreshRemoteConfig = () =>
  refreshRemoteConfigShared(mobileRemoteConfigBackend);

export const setLocalOverride = (flag: string, value: FeatureFlagValue) =>
  setLocalOverrideShared(mobileStorageBackend, flag, value);
