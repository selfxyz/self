// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const workspaceRoot = findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '..');
const commonPath = path.join(__dirname, '/../common');
const sdkAlphaPath = path.join(__dirname, '/../packages/mobile-sdk-alpha');

// Create a proxy that automatically resolves dependencies to workspace root
const extraNodeModules = new Proxy(
  {
    // Essential polyfills for React Native
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
    // Workspace package mappings (use source files for better resolution)
  '@': path.join(__dirname, 'src'),
    '@selfxyz/common': path.resolve(commonPath, 'src'),
  '@selfxyz/mobile-sdk-alpha': path.resolve(sdkAlphaPath, 'dist'),
    // Common package main exports
    '@selfxyz/common/utils': path.resolve(commonPath, 'src/utils/index.ts'),
    '@selfxyz/common/types': path.resolve(commonPath, 'src/types/index.ts'),
    '@selfxyz/common/constants': path.resolve(commonPath, 'src/constants/index.ts'),
  },
  {
    get: (target, name) => {
      if (typeof name !== 'string') {
        return target[name];
      }
      // If already mapped, use existing mapping
      if (target[name]) {
        return target[name];
      }
      // Auto-resolve any other dependency to workspace root node_modules
      return path.join(workspaceRoot, 'node_modules', name);
    },
  },
);

const watchFolders = [
  path.resolve(commonPath, 'src'), // Watch common source files
  workspaceRoot, // Watch entire workspace root
  path.join(__dirname, 'src'),
  path.resolve(sdkAlphaPath),
];

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
    disableImportExportTransform: true,
    inlineRequires: true,
  },
  resolver: {
    extraNodeModules,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'), // App's own node_modules
      path.resolve(workspaceRoot, 'node_modules'), // Workspace root node_modules
    ],
    unstable_enableSymlinks: true,
    disableHierarchicalLookup: true,
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Custom resolver to handle .js imports in TypeScript source files
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
  watchFolders,
};

module.exports = mergeConfig(defaultConfig, config);
