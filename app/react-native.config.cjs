// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const diditE2EBypassEnabled = process.env.DIDIT_E2E_BYPASS === 'true';

const dependencies = {
  '@selfxyz/mobile-sdk-alpha': { platforms: { android: null, ios: null } },
  ...(diditE2EBypassEnabled
    ? {
        // Debug-only bypass: disables Didit native module autolinking.
        '@didit-protocol/sdk-react-native': { platforms: { android: null, ios: null } },
      }
    : {}),
};

module.exports = {
  project: { ios: {}, android: {} },
  dependencies,
  assets: ['../src/assets/fonts'],
};
