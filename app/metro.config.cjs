// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const projectRoot = __dirname;
const workspaceRoot =
  findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '..');

/**
 * Modern Metro configuration using native workspace capabilities
 * Eliminates need for manual symlink management through:
 * - enableGlobalPackages: Automatic workspace package discovery
 * - unstable_enablePackageExports: Native subpath import support
 * - unstable_enableSymlinks: Optional symlink resolution
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root for changes
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
  ],

  transformer: {
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
    disableImportExportTransform: true,
    inlineRequires: true,
  },

  resolver: {
    // Prevent Haste module naming collisions from duplicate package.json files
    blockList: [
      // Ignore built package.json files to prevent Haste collisions
      /.*\/dist\/package\.json$/,
      /.*\/dist\/esm\/package\.json$/,
      /.*\/dist\/cjs\/package\.json$/,
      /.*\/build\/package\.json$/,
      // Prevent duplicate React/React Native from ANY workspace deps - this is critical!
      new RegExp('app/node_modules/react(/.+)?'),
      new RegExp('app/node_modules/react-dom(/.+)?'),
      new RegExp('app/node_modules/react-native(/.+)?'),
      new RegExp('app/node_modules/scheduler(/.+)?'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react(/.+)?'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-dom(/.+)?'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-native(/.+)?'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/scheduler(/.+)?'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react(/.+)?'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react-dom(/.+)?'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react-native(/.+)?'),
      new RegExp('packages/mobile-sdk-demo/node_modules/scheduler(/.+)?'),
    ],
    // Enable automatic workspace package resolution
    enableGlobalPackages: true,

    // Handle subpath exports (@selfxyz/common/constants)
    unstable_enablePackageExports: true,

    // Enable native symlink support (optional, for compatibility)
    unstable_enableSymlinks: true,

    // Define search order for node modules - prioritize workspace root to prevent duplicates
    nodeModulesPaths: [
      path.resolve(workspaceRoot, 'node_modules'), // Workspace root node_modules FIRST
      path.resolve(projectRoot, 'node_modules'), // App's own node_modules SECOND
    ],

    // Essential polyfills for React Native
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
      events: require.resolve('events'),
      // Ensure a single React/React Native instance across workspaces
      react: path.resolve(workspaceRoot, 'node_modules/react'),
      'react-dom': path.resolve(workspaceRoot, 'node_modules/react-dom'),
      'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      scheduler: require.resolve('scheduler'),
      // App-specific alias
      '@': path.join(__dirname, 'src'),
    },

    // Support package exports with conditions
    unstable_conditionNames: ['require', 'react-native'],

    // SVG support
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],

    // Custom resolver to handle both .js imports in TypeScript and Node.js modules
    resolveRequest: (context, moduleName, platform) => {
      // Force SDK to use built ESM to avoid duplicate React and source transpilation issues
      if (moduleName === '@selfxyz/mobile-sdk-alpha') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(
            workspaceRoot,
            'packages/mobile-sdk-alpha/dist/esm/index.js',
          ),
        };
      }
      // For relative imports in common source files that end with .js
      if (
        context.originModulePath?.includes('/common/src/') &&
        moduleName.endsWith('.js')
      ) {
        const tsModuleName = moduleName.replace(/\.js$/, '.ts');
        return context.resolveRequest(context, tsModuleName, platform);
      }

      // Handle problematic package exports and Node.js modules

      // Fix @tamagui/config v2-native export resolution
      if (moduleName === '@tamagui/config/v2-native') {
        try {
          return {
            type: 'sourceFile',
            filePath: require.resolve('@tamagui/config/dist/esm/v2-native.js'),
          };
        } catch {
          // Fallback to main export if specific file doesn't exist
          return {
            type: 'sourceFile',
            filePath: require.resolve('@tamagui/config'),
          };
        }
      }

      // Fix @noble/hashes/crypto.js export resolution
      if (moduleName.endsWith('@noble/hashes/crypto.js')) {
        try {
          // Try to resolve the actual crypto.js file
          const packagePath = moduleName.replace('/crypto.js', '');
          const basePath = require.resolve(packagePath);
          const cryptoPath = path.join(path.dirname(basePath), 'crypto.js');
          return {
            type: 'sourceFile',
            filePath: cryptoPath,
          };
        } catch {
          // Fallback to main package if crypto.js doesn't exist
          const packagePath = moduleName.replace('/crypto.js', '');
          return {
            type: 'sourceFile',
            filePath: require.resolve(packagePath),
          };
        }
      }

      // Fix snarkjs and ffjavascript platform exports for Android
      if (platform === 'android') {
        const platformProblematicPackages = [
          'snarkjs',
          'ffjavascript',
          'snarkjs/node_modules/ffjavascript',
          'snarkjs/node_modules/r1csfile/node_modules/ffjavascript',
        ];

        for (const pkg of platformProblematicPackages) {
          if (moduleName.includes(pkg) && !moduleName.includes('/')) {
            try {
              return {
                type: 'sourceFile',
                filePath: require.resolve(pkg),
              };
            } catch {
              // If package can't be resolved, continue to next check
              continue;
            }
          }
        }
      }

      const nodeModuleRedirects = {
        crypto: path.resolve(__dirname, 'src/utils/crypto-polyfill.ts'),
        fs: false, // Disable filesystem access
        os: false, // Disable OS-specific modules
        readline: false, // Disable readline module
        constants: require.resolve('constants-browserify'),
        path: require.resolve('path-browserify'),
        'web-worker': false, // Disable web workers (not available in React Native)
      };

      if (
        Object.prototype.hasOwnProperty.call(nodeModuleRedirects, moduleName)
      ) {
        if (nodeModuleRedirects[moduleName] === false) {
          // Return empty module for disabled modules
          return { type: 'empty' };
        }
        // Redirect to polyfill
        return {
          type: 'sourceFile',
          filePath: nodeModuleRedirects[moduleName],
        };
      }

      // Fall back to default Metro resolver for all other modules
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
