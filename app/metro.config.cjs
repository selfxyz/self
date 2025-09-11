// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const nodeModules = path.join(monorepoRoot, 'node_modules');

const watchFolders = [
  path.join(monorepoRoot, 'common'),
  path.join(monorepoRoot, 'packages/mobile-sdk-alpha'),
];

const extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  '@babel/runtime': path.join(nodeModules, '@babel/runtime'),
  react: path.join(nodeModules, 'react'),
  'react-native': path.join(nodeModules, 'react-native'),
  '@': path.join(projectRoot, 'src'),
  '@selfxyz/common': path.join(monorepoRoot, 'common'),
  '@selfxyz/mobile-sdk-alpha': path.join(
    monorepoRoot,
    'packages/mobile-sdk-alpha',
  ),
};

const { assetExts, sourceExts } = getDefaultConfig(projectRoot).resolver;

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
    nodeModulesPaths: [path.join(projectRoot, 'node_modules'), nodeModules],
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    unstable_enablePackageExports: true,
    resolveRequest: (ctx, moduleName, platform) => {
      const polyfills = {
        crypto: require.resolve('crypto-browserify'),
        fs: false,
        os: false,
        readline: false,
        constants: require.resolve('constants-browserify'),
        path: require.resolve('path-browserify'),
      };
      if (Object.prototype.hasOwnProperty.call(polyfills, moduleName)) {
        return polyfills[moduleName]
          ? { type: 'sourceFile', filePath: polyfills[moduleName] }
          : { type: 'empty' };
      }
      return ctx.resolveRequest(ctx, moduleName, platform);
    },
  },
  watchFolders,
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
