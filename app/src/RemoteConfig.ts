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

export const refreshRemoteConfig = async () => {
  try {
    await remoteConfig().fetchAndActivate();
  } catch (err) {
    console.log('Remote config refresh failed', err);
  }
};
