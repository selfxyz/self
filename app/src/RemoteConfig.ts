// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import remoteConfig from '@react-native-firebase/remote-config';

export const initRemoteConfig = async () => {
  await remoteConfig().setDefaults({
    test_feature: false,
  });
  await remoteConfig().setConfigSettings({
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000,
  });
  try {
    await remoteConfig().fetchAndActivate();
  } catch (err) {
    console.log('Remote config fetch failed', err);
  }
};

export const getFeatureFlag = (flag: string, defaultValue = false): boolean => {
  return remoteConfig().getValue(flag).asBoolean() ?? defaultValue;
};

export const getAllFeatureFlags = async (): Promise<
  Array<{
    key: string;
    value: boolean;
    source: string;
  }>
> => {
  try {
    const keys = remoteConfig().getAll();
    const flags = Object.keys(keys).map(key => {
      const configValue = keys[key];
      return {
        key,
        value: configValue.asBoolean(),
        source:
          configValue.getSource() === 'remote'
            ? 'Remote Config'
            : configValue.getSource() === 'default'
              ? 'Default'
              : configValue.getSource() === 'static'
                ? 'Static'
                : 'Unknown',
      };
    }).sort((a, b) => a.key.localeCompare(b.key));
    return flags;
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
