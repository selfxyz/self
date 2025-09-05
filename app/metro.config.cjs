// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const projectRoot = __dirname;
const workspaceRoot =
  findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '..');

/**
 * Modern Metro configuration using native workspace capabilities
 * Eliminates need for manual symlink management through:
 * - enableGlobalPackages: Automatic workspace package discovery
 * - unstable_enablePackageExports: Native subpath import support
 * - unstable_enableSymlinks: Optional symlink resolution
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root for changes
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
  ],

  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
    disableImportExportTransform: true,
    inlineRequires: true,
  },

  resolver: {
    // Prevent Haste module naming collisions from duplicate package.json files
    blockList: [
      // Ignore built package.json files to prevent Haste collisions
      /.*\/dist\/package\.json$/,
      /.*\/build\/package\.json$/,
    ],
    // Enable automatic workspace package resolution
    enableGlobalPackages: true,

    // Handle subpath exports (@selfxyz/common/constants)
    unstable_enablePackageExports: true,

    // Enable native symlink support (optional, for compatibility)
    unstable_enableSymlinks: true,

    // Define search order for node modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'), // App's own node_modules
      path.resolve(workspaceRoot, 'node_modules'), // Workspace root node_modules
    ],

    // Essential polyfills for React Native
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
      // App-specific alias
      '@': path.join(__dirname, 'src'),
    },

    // Support package exports with conditions
    unstable_conditionNames: ['require', 'react-native'],

    // SVG support
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],

    // Custom resolver to handle .js imports in TypeScript source files
    resolveRequest: (context, moduleName, platform) => {
      // For relative imports in common source files that end with .js
      if (
        context.originModulePath?.includes('/common/src/') &&
        moduleName.endsWith('.js')
      ) {
        const tsModuleName = moduleName.replace(/\.js$/, '.ts');
        return context.resolveRequest(context, tsModuleName, platform);
      }
      // Default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
