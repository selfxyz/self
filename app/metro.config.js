// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const commonPath = path.join(__dirname, '/../common');
const extraNodeModules = {
  common: path.resolve(commonPath),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
};
const watchFolders = [path.resolve(commonPath)];

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
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
  watchFolders,
};

module.exports = mergeConfig(defaultConfig, config);
