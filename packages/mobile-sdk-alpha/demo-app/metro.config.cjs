// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '../../..');

/**
 * Modern Metro configuration for demo app using native workspace capabilities
 * Based on the working main app configuration
 */
const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
  ],

  resolver: {
    // Prevent Haste module naming collisions from duplicate package.json files
    blockList: [
      // Ignore built package.json files to prevent Haste collisions
      /.*\/dist\/package\.json$/,
      /.*\/build\/package\.json$/,
    ],
    // Enable automatic workspace package resolution
    enableGlobalPackages: true,

    // Handle subpath exports (@selfxyz/common/constants, @selfxyz/mobile-sdk-alpha/constants/analytics)
    unstable_enablePackageExports: true,

    // Enable native symlink support (optional, for compatibility)
    unstable_enableSymlinks: true,

    // Define search order for node modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'), // App's own node_modules
      path.resolve(workspaceRoot, 'node_modules'), // Workspace root node_modules
    ],

    // Essential packages for the demo app
    extraNodeModules: {},

    // Support package exports with conditions
    unstable_conditionNames: ['require', 'react-native'],

    // Custom resolver based on main app approach
    resolveRequest: (context, moduleName, platform) => {
      // For relative imports in common source files that end with .js
      if (context.originModulePath?.includes('/common/src/') && moduleName.endsWith('.js')) {
        const tsModuleName = moduleName.replace(/\.js$/, '.ts');
        return context.resolveRequest(context, tsModuleName, platform);
      }
      // Default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
