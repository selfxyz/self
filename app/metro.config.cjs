const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const monorepoRoot = path.resolve(__dirname, '../');
const commonPath = path.join(__dirname, '/../common');
const trueMonorepoNodeModules = path.resolve(__dirname, '../node_modules');
const extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  '@babel/runtime': path.join(trueMonorepoNodeModules, '@babel/runtime'),
};
const watchFolders = [
  path.resolve(commonPath),
  trueMonorepoNodeModules,
  path.join(__dirname, 'src'),
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
  },
  resolver: {
    extraNodeModules,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'), // App's own node_modules
      path.resolve(monorepoRoot, 'node_modules'), // Monorepo root node_modules
      trueMonorepoNodeModules,
      // Add paths to other package workspaces if needed
    ],
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
  watchFolders,
};

module.exports = mergeConfig(defaultConfig, config);
