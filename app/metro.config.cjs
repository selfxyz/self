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
  '@selfxyz/common': path.resolve(commonPath, 'src'),
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
    disableImportExportTransform: true,
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
    resolverMainFields: ['react-native', 'browser', 'main'],
    platforms: ['ios', 'android', 'native', 'web'],
    // Custom resolver to handle .js imports that should resolve to .ts files
    resolveRequest: (context, moduleName, platform) => {
      // If this is a relative import ending in .js from within the common package
      if (
        moduleName.endsWith('.js') &&
        context.originModulePath.includes('/common/src/')
      ) {
        const tsModuleName = moduleName.replace(/\.js$/, '.ts');
        const tsxModuleName = moduleName.replace(/\.js$/, '.tsx');

        // Try to resolve as .ts first, then .tsx
        try {
          return context.resolveRequest(context, tsModuleName, platform);
        } catch {
          try {
            return context.resolveRequest(context, tsxModuleName, platform);
          } catch {
            // Fall back to default resolution
            return context.resolveRequest(context, moduleName, platform);
          }
        }
      }

      // Default resolution for everything else
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  watchFolders,
};

module.exports = mergeConfig(defaultConfig, config);
