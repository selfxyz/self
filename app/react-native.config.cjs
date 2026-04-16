// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const dependencies = {
  '@selfxyz/mobile-sdk-alpha': { platforms: { android: null, ios: null } },
};

// Disable Didit SDK autolinking during E2E testing to avoid build issues
if (process.env.E2E_TESTING === '1') {
  dependencies['@didit-protocol/sdk-react-native'] = {
    platforms: { android: null, ios: null },
  };
}

module.exports = {
  project: { ios: {}, android: {} },
  dependencies,
  assets: ['../src/assets/fonts'],
};
