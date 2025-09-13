// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('path');
const root = path.resolve(__dirname, '..');

module.exports = {
  watchFolders: [
    root,
    path.join(root, 'packages/mobile-sdk-alpha'),
    path.join(root, 'common'),
  ],
  resolver: {
    disableHierarchicalLookup: true,
    nodeModulesPaths: [path.join(root, 'node_modules')],
    extraNodeModules: {
      '@selfxyz/mobile-sdk-alpha': path.join(root, 'packages/mobile-sdk-alpha'),
      '@selfxyz/common': path.join(root, 'common'),
    },
  },
};
