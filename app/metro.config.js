const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const commonPath = path.join(__dirname, '/../common');
const extraNodeModules = {
  common: path.resolve(commonPath),
};
const watchFolders = [path.resolve(commonPath)];

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('@react-native/metro-config').MetroConfig}
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
