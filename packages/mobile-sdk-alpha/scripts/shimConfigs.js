// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Shim configurations for Metro compatibility
export const shimConfigs = [
  { shimPath: 'browser', targetPath: '../esm/browser.js', name: 'browser' },
  { shimPath: 'constants/analytics', targetPath: '../../esm/constants/analytics.js', name: 'constants/analytics' },
  { shimPath: 'stores', targetPath: '../esm/stores.js', name: 'stores' },
];
