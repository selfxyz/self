// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import AsyncStorage from '@react-native-async-storage/async-storage';
import remoteConfig from '@react-native-firebase/remote-config';

interface LocalOverride {
  [key: string]: boolean;
}

const LOCAL_OVERRIDES_KEY = 'feature_flag_overrides';

const defaultFlags: Record<string, boolean> = {
  aesop: false,
};

// Local override management
export const getLocalOverrides = async (): Promise<LocalOverride> => {
  try {
    const overrides = await AsyncStorage.getItem(LOCAL_OVERRIDES_KEY);
    return overrides ? JSON.parse(overrides) : {};
  } catch (error) {
    console.error('Failed to get local overrides:', error);
    return {};
  }
};

export const setLocalOverride = async (
  flag: string,
  value: boolean,
): Promise<void> => {
  try {
    const overrides = await getLocalOverrides();
    overrides[flag] = value;
    await AsyncStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Failed to set local override:', error);
  }
};

export const clearLocalOverride = async (flag: string): Promise<void> => {
  try {
    const overrides = await getLocalOverrides();
    delete overrides[flag];
    await AsyncStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Failed to clear local override:', error);
  }
};

export const clearAllLocalOverrides = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LOCAL_OVERRIDES_KEY);
  } catch (error) {
    console.error('Failed to clear all local overrides:', error);
  }
};

export const initRemoteConfig = async () => {
  await remoteConfig().setDefaults(defaultFlags);
  await remoteConfig().setConfigSettings({
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000,
  });
  try {
    await remoteConfig().fetchAndActivate();
  } catch (err) {
    console.log('Remote config fetch failed', err);
  }
};

export const getFeatureFlag = async (
  flag: string,
  defaultValue = false,
): Promise<boolean> => {
  try {
    // Check local overrides first
    const localOverrides = await getLocalOverrides();
    if (localOverrides.hasOwnProperty(flag)) {
      return localOverrides[flag];
    }

    // Fall back to remote config
    return remoteConfig().getValue(flag).asBoolean() ?? defaultValue;
  } catch (error) {
    console.error('Failed to get feature flag:', error);
    return defaultValue;
  }
};

export const getAllFeatureFlags = async (): Promise<
  Array<{
    key: string;
    remoteValue?: boolean;
    overrideValue?: boolean;
    value: boolean;
    source: string;
  }>
> => {
  try {
    const keys = remoteConfig().getAll();
    const localOverrides = await getLocalOverrides();

    // Get all remote/default flags
    const remoteFlags = Object.keys(keys).map(key => {
      const configValue = keys[key];
      const remoteVal = configValue.asBoolean();
      const hasLocalOverride = localOverrides.hasOwnProperty(key);
      const overrideVal = hasLocalOverride ? localOverrides[key] : undefined;
      const effectiveVal = hasLocalOverride ? overrideVal! : remoteVal;

      return {
        key,
        remoteValue: remoteVal,
        overrideValue: overrideVal,
        value: effectiveVal,
        source: hasLocalOverride
          ? 'Local Override'
          : configValue.getSource() === 'remote'
            ? 'Remote Config'
            : configValue.getSource() === 'default'
              ? 'Default'
              : configValue.getSource() === 'static'
                ? 'Static'
                : 'Unknown',
      };
    });

    // Add any local overrides that don't exist in remote config
    const localOnlyFlags = Object.keys(localOverrides)
      .filter(key => !keys.hasOwnProperty(key))
      .map(key => ({
        key,
        remoteValue: undefined,
        overrideValue: localOverrides[key],
        value: localOverrides[key],
        source: 'Local Override',
      }));

    return [...remoteFlags, ...localOnlyFlags].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  } catch (error) {
    console.error('Failed to get all feature flags:', error);
    return [];
  }
};

export const refreshRemoteConfig = async () => {
  try {
    await remoteConfig().fetchAndActivate();
  } catch (err) {
    console.log('Remote config refresh failed', err);
  }
};
