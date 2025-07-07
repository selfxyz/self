// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import AsyncStorage from '@react-native-async-storage/async-storage';
import remoteConfig from '@react-native-firebase/remote-config';

export type FeatureFlagValue = string | boolean | number;

interface LocalOverride {
  [key: string]: FeatureFlagValue;
}

const LOCAL_OVERRIDES_KEY = 'feature_flag_overrides';

const defaultFlags: Record<string, FeatureFlagValue> = {
  aesop: false,
};

// Helper function to detect and parse remote config values
const getRemoteConfigValue = (
  key: string,
  defaultValue: FeatureFlagValue,
): FeatureFlagValue => {
  const configValue = remoteConfig().getValue(key);

  if (typeof defaultValue === 'boolean') {
    return configValue.asBoolean();
  } else if (typeof defaultValue === 'number') {
    return configValue.asNumber();
  } else if (typeof defaultValue === 'string') {
    return configValue.asString();
  }

  // Fallback: try to infer type from the remote config value
  const stringValue = configValue.asString();
  if (stringValue === 'true' || stringValue === 'false') {
    return configValue.asBoolean();
  }
  if (!Number.isNaN(Number(stringValue)) && stringValue !== '') {
    return configValue.asNumber();
  }
  return stringValue;
};

// Local override management
export const getLocalOverrides = async (): Promise<LocalOverride> => {
  try {
    const overrides = await AsyncStorage.getItem(LOCAL_OVERRIDES_KEY);
    if (!overrides) {
      return {};
    }
    return JSON.parse(overrides);
  } catch (error) {
    console.error('Failed to get local overrides:', error);

    // If JSON parsing fails, clear the corrupt data
    if (error instanceof SyntaxError) {
      try {
        await AsyncStorage.removeItem(LOCAL_OVERRIDES_KEY);
      } catch (removeError) {
        console.error('Failed to clear corrupt local overrides:', removeError);
      }
    }

    return {};
  }
};

export const setLocalOverride = async (
  flag: string,
  value: FeatureFlagValue,
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

export const getFeatureFlag = async <T extends FeatureFlagValue>(
  flag: string,
  defaultValue: T,
): Promise<T> => {
  try {
    // Check local overrides first
    const localOverrides = await getLocalOverrides();
    if (Object.prototype.hasOwnProperty.call(localOverrides, flag)) {
      return localOverrides[flag] as T;
    }

    // Return default value for string flags
    if (typeof defaultValue === 'string') {
      return defaultValue;
    }

    // Fall back to remote config for number and boolean flags
    return getRemoteConfigValue(flag, defaultValue) as T;
  } catch (error) {
    console.error('Failed to get feature flag:', error);
    return defaultValue;
  }
};

export const getAllFeatureFlags = async (): Promise<
  Array<{
    key: string;
    remoteValue?: FeatureFlagValue;
    overrideValue?: FeatureFlagValue;
    value: FeatureFlagValue;
    source: string;
    type: 'boolean' | 'string' | 'number';
  }>
> => {
  try {
    const keys = remoteConfig().getAll();
    const localOverrides = await getLocalOverrides();

    // Get all remote/default flags
    const remoteFlags = Object.keys(keys).map(key => {
      const configValue = keys[key];

      // Try to determine the type from default flags or infer from value
      const defaultValue = defaultFlags[key];
      const remoteVal =
        defaultValue !== undefined
          ? getRemoteConfigValue(key, defaultValue)
          : configValue.asString(); // Default to string if no default defined

      const hasLocalOverride = Object.prototype.hasOwnProperty.call(
        localOverrides,
        key,
      );
      const overrideVal = hasLocalOverride ? localOverrides[key] : undefined;
      const effectiveVal = hasLocalOverride ? overrideVal! : remoteVal;

      // Determine type
      const type =
        typeof effectiveVal === 'boolean'
          ? 'boolean'
          : typeof effectiveVal === 'number'
            ? 'number'
            : 'string';

      return {
        key,
        remoteValue: remoteVal,
        overrideValue: overrideVal,
        value: effectiveVal,
        type: type as 'boolean' | 'string' | 'number',
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
      .filter(key => !Object.prototype.hasOwnProperty.call(keys, key))
      .map(key => {
        const value = localOverrides[key];
        const type =
          typeof value === 'boolean'
            ? 'boolean'
            : typeof value === 'number'
              ? 'number'
              : 'string';

        return {
          key,
          remoteValue: undefined,
          overrideValue: value,
          value: value,
          type: type as 'boolean' | 'string' | 'number',
          source: 'Local Override',
        };
      });

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
