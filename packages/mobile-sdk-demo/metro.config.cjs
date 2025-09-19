// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '../..');

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
    // Use source files directly for better error reporting
    alias: {
      '@selfxyz/mobile-sdk-alpha': path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha/src'),
      '@selfxyz/common': path.resolve(workspaceRoot, 'common/src'),
    },
    extraNodeModules: {
      '@babel/runtime': path.resolve(__dirname, '../../node_modules/@babel/runtime'),
      // Pin React and React Native to monorepo root
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-native': path.resolve(__dirname, '../../node_modules/react-native'),
      // Crypto polyfills - use custom polyfill with @noble/hashes
      crypto: path.resolve(__dirname, 'crypto-polyfill.js'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
