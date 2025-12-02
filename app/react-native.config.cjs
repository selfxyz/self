// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  project: { ios: {}, android: {} },
  dependencies: {
    '@selfxyz/mobile-sdk-alpha': { platforms: { android: null, ios: null } },
  },
  assets: ['../src/assets/fonts'],
};
