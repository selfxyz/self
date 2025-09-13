// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
  watchFolders: [
    root,
    path.join(root, 'packages/mobile-sdk-alpha'),
    path.join(root, 'common'),
  ],
  resolver: {
    disableHierarchicalLookup: true,
    nodeModulesPaths: [path.join(root, 'node_modules')],
    unstable_enablePackageExports: true,
    extraNodeModules: {
      '@selfxyz/mobile-sdk-alpha': path.join(root, 'packages/mobile-sdk-alpha'),
      '@selfxyz/common': path.join(root, 'common'),
      // Explicit subpath mappings for @selfxyz/common
      '@selfxyz/common/constants': path.join(root, 'common/src/constants'),
      '@selfxyz/common/utils': path.join(root, 'common/src/utils'),
      '@selfxyz/common/types': path.join(root, 'common/src/types'),
      // Crypto polyfills for React Native
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      path: 'path-browserify',
      constants: 'constants-browserify',
      // Additional Node.js polyfills
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      os: false,
      util: 'util',
      url: 'url',
      querystring: 'querystring-es3',
      assert: 'assert',
      http: false,
      https: false,
      zlib: false,
      events: 'events',
    },
    alias: {
      '@selfxyz/common/constants': path.join(
        root,
        'common/src/constants/index.ts',
      ),
      '@selfxyz/common/utils': path.join(root, 'common/src/utils/index.ts'),
      '@selfxyz/common/types': path.join(root, 'common/src/types/index.ts'),
      // Crypto polyfills
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      path: 'path-browserify',
      constants: 'constants-browserify',
      // Additional Node.js polyfills
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      os: false,
      util: 'util',
      url: 'url',
      querystring: 'querystring-es3',
      assert: 'assert',
      http: false,
      https: false,
      zlib: false,
      events: 'events',
    },
  },
};

module.exports = mergeConfig(defaultConfig, customConfig);
