// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const projectRoot = __dirname;
const monorepoRoot = path.resolve(__dirname, '../../..');

/**
 * Modern Metro configuration for demo app using native workspace capabilities
 * Eliminates need for manual symlink management
 */
const config = {
  projectRoot,

  watchFolders: [
    monorepoRoot, // Watch entire monorepo root
    path.resolve(monorepoRoot, 'common'),
    path.resolve(monorepoRoot, 'packages/mobile-sdk-alpha'),
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

    // Enable native symlink support
    unstable_enableSymlinks: true,

    // Pin critical React packages to avoid conflicts
    extraNodeModules: {
      react: path.resolve(monorepoRoot, 'node_modules/react'),
      'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
    },

    // Define search order for node modules
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(monorepoRoot, 'node_modules')],

    // Support package exports with conditions
    unstable_conditionNames: ['require', 'react-native'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
