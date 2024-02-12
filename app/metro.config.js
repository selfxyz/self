const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');
const { withTamagui } = require('@tamagui/metro-plugin')
const extraNodeModules = {
  'common': path.resolve(__dirname + '/../common'),
};
const watchFolders = [
  path.resolve(__dirname + '/../common')
];

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

module.exports = withTamagui(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    components: ['tamagui'],
    config: './tamagui.config.ts',
    outputCSS: './tamagui-web.css'
  }
);
