// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [
    path.resolve(__dirname, '../../..'), // monorepo root
  ],
  resolver: {
    extraNodeModules: {
      '@babel/runtime': path.resolve(__dirname, '../../../node_modules/@babel/runtime'),
      // Pin React and React Native to monorepo root
      react: path.resolve(__dirname, '../../../node_modules/react'),
      'react-native': path.resolve(__dirname, '../../../node_modules/react-native'),
      // Crypto polyfills
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
    },
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, '../../../node_modules')],
  },
};

module.exports = mergeConfig(defaultConfig, config);
