const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const workspacePackages = []
  .concat(
    fs
      .readdirSync(path.resolve(projectRoot, '../../packages'))
      .map(dir => path.resolve(projectRoot, '../../packages', dir)),
  )
  .concat(
    fs
      .readdirSync(path.resolve(projectRoot, '../../packages/sdk'))
      .map(dir => path.resolve(projectRoot, '../../packages/sdk', dir)),
  );
const javascriptPackagesNodeModules = workspacePackages
  .filter(packagePath =>
    fs.existsSync(path.resolve(packagePath, 'package.json')),
  )
  .map(packagePath => path.resolve(packagePath, 'node_modules'))
  .filter(fs.existsSync);

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
    unstable_enableSymlinks: true, // Turn on symlink support
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
      ...javascriptPackagesNodeModules,
    ],
  },
  watchFolders: [monorepoRoot, ...workspacePackages],
};

module.exports = mergeConfig(defaultConfig, config);
