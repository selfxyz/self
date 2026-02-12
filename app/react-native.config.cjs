// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const dependencies = {
  '@selfxyz/mobile-sdk-alpha': { platforms: { android: null, ios: null } },
};

// Disable Sumsub SDK autolinking during E2E testing to avoid build issues
if (process.env.E2E_TESTING === '1') {
  dependencies['@sumsub/react-native-mobilesdk-module'] = {
    platforms: { android: null, ios: null },
  };
}

module.exports = {
  project: { ios: {}, android: {} },
  dependencies,
  assets: ['../src/assets/fonts'],
};
