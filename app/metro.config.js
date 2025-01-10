const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const commonPath = path.join(__dirname, '/../common');
const extraNodeModules = {
  common: path.resolve(commonPath),
};
const watchFolders = [path.resolve(commonPath)];

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules,
  },
  watchFolders,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
