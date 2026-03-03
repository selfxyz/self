// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');
const workspaceRootEscaped = workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = mergeConfig(getDefaultConfig(projectRoot), {
  projectRoot,
  watchFolders: [workspaceRoot],
  resolver: {
    enableGlobalPackages: true,
    unstable_enablePackageExports: true,
    unstable_enableSymlinks: true,
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
    blockList: [
      new RegExp(`^${workspaceRootEscaped}/node_modules/react(/|$)`),
      new RegExp(`^${workspaceRootEscaped}/node_modules/react-native(/|$)`),
      new RegExp(`^${workspaceRootEscaped}/node_modules/react-dom(/|$)`),
      new RegExp(`^${workspaceRootEscaped}/node_modules/scheduler(/|$)`),
      /.*\/app\/node_modules\/react-native\/.*/,
      /.*\/app\/node_modules\/react\/.*/,
      /.*\/packages\/mobile-sdk-demo\/node_modules\/react-native\/.*/,
      /.*\/packages\/mobile-sdk-demo\/node_modules\/react\/.*/,
    ],
  },
});
