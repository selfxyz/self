// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const fs = require('node:fs');
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
    path.resolve(projectRoot, 'node_modules'), // Watch app's node_modules for custom resolved modules
  ],

  transformer: {
    babelTransformerPath:
      require.resolve('react-native-svg-transformer/react-native'),
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
      // Prevent duplicate React/React Native - block workspace root versions and use app's versions
      // Use precise regex patterns to avoid blocking packages like react-native-get-random-values
      new RegExp(
        `^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react(/|$)`,
      ),
      new RegExp(
        `^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react-dom(/|$)`,
      ),
      new RegExp(
        `^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react-native(/|$)`,
      ),
      new RegExp(
        `^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/scheduler(/|$)`,
      ),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react(/|$)'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-dom(/|$)'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-native(/|$)'),
      new RegExp(
        'packages/mobile-sdk-alpha/node_modules/lottie-react-native(/|$)',
      ),
      new RegExp('packages/mobile-sdk-alpha/node_modules/scheduler(/|$)'),
      new RegExp(
        'packages/mobile-sdk-alpha/node_modules/react-native-svg(/|$)',
      ),
      new RegExp('packages/mobile-sdk-demo/node_modules/react(/|$)'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react-dom(/|$)'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react-native(/|$)'),
      new RegExp('packages/mobile-sdk-demo/node_modules/scheduler(/|$)'),
      new RegExp('packages/mobile-sdk-demo/node_modules/react-native-svg(/|$)'),
    ],
    // Enable automatic workspace package resolution
    enableGlobalPackages: true,

    // Handle subpath exports (@selfxyz/common/constants)
    unstable_enablePackageExports: true,

    // Enable native symlink support (optional, for compatibility)
    unstable_enableSymlinks: true,

    // Define search order for node modules - prioritize app's modules for React consistency
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'), // App's own node_modules FIRST
      path.resolve(workspaceRoot, 'node_modules'), // Workspace root node_modules SECOND
    ],

    // Essential polyfills for React Native
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
      events: require.resolve('events'),
      process: require.resolve('process'),
      'react-native-svg': path.resolve(
        projectRoot,
        'node_modules/react-native-svg',
      ),
      // App-specific alias
      '@': path.join(__dirname, 'src'),
    },

    // Support package exports with conditions
    unstable_conditionNames: ['react-native', 'import', 'require'],

    // SVG support
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],

    // Custom resolver to handle both .js imports in TypeScript and Node.js modules
    resolveRequest: (context, moduleName, platform) => {
      // Handle React Native gesture handler that needs app-level resolution
      const appLevelModules = {
        'react-native-gesture-handler':
          'react-native-gesture-handler/lib/commonjs/index.js',
      };
      const sdkAlphaPath = path.resolve(
        workspaceRoot,
        'packages/mobile-sdk-alpha',
      );

      // Custom resolver to handle Node.js modules and dynamic flow imports
      if (moduleName.startsWith('@selfxyz/mobile-sdk-alpha/')) {
        const subPath = moduleName.replace('@selfxyz/mobile-sdk-alpha/', '');

        // Check if it's a flow import (onboarding/* or disclosing/*)
        if (
          subPath.startsWith('onboarding/') ||
          subPath.startsWith('disclosing/')
        ) {
          const flowPath = path.resolve(
            sdkAlphaPath,
            'dist/esm/flows',
            `${subPath}.js`,
          );

          // Check if the file exists
          if (fs.existsSync(flowPath)) {
            return {
              type: 'sourceFile',
              filePath: flowPath,
            };
          }
        }
      }

      if (appLevelModules[moduleName]) {
        try {
          return {
            type: 'sourceFile',
            filePath: require.resolve(appLevelModules[moduleName], {
              paths: [projectRoot],
            }),
          };
        } catch (error) {
          console.warn(`Failed to resolve ${moduleName}:`, error);
          // Fall back to default resolution
          return context.resolveRequest(context, moduleName, platform);
        }
      }

      // React modules now resolve naturally through nodeModulesPaths (app's node_modules first)

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

      // Fix @turnkey/encoding to use CommonJS instead of ESM
      if (moduleName === '@turnkey/encoding') {
        const filePath = path.resolve(
          projectRoot,
          'node_modules/@turnkey/encoding/dist/index.js',
        );
        return {
          type: 'sourceFile',
          filePath,
        };
      }

      // Fix @turnkey/encoding submodules to use CommonJS
      if (moduleName.startsWith('@turnkey/encoding/')) {
        const subpath = moduleName.replace('@turnkey/encoding/', '');
        const filePath = path.resolve(
          projectRoot,
          `node_modules/@turnkey/encoding/dist/${subpath}.js`,
        );
        return {
          type: 'sourceFile',
          filePath,
        };
      }

      // Fix @turnkey/api-key-stamper to use CommonJS instead of ESM
      if (moduleName === '@turnkey/api-key-stamper') {
        const filePath = path.resolve(
          projectRoot,
          'node_modules/@turnkey/api-key-stamper/dist/index.js',
        );
        return {
          type: 'sourceFile',
          filePath,
        };
      }

      // Fix @turnkey/api-key-stamper dynamic imports by resolving submodules statically
      if (moduleName.startsWith('@turnkey/api-key-stamper/')) {
        const subpath = moduleName.replace('@turnkey/api-key-stamper/', '');
        const filePath = path.resolve(
          projectRoot,
          `node_modules/@turnkey/api-key-stamper/dist/${subpath}`,
        );
        return {
          type: 'sourceFile',
          filePath,
        };
      }

      // Fix viem dynamic import resolution
      if (moduleName === 'viem') {
        try {
          // Viem uses package exports, so we need to resolve to the actual file path
          const viemPath = path.resolve(
            projectRoot,
            'node_modules/viem/_cjs/index.js',
          );
          return {
            type: 'sourceFile',
            filePath: viemPath,
          };
        } catch (error) {
          console.warn('Failed to resolve viem:', error);
        }
      }

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

      // Fix @noble/hashes subpath export resolution
      if (moduleName.startsWith('@noble/hashes/')) {
        try {
          // Extract the subpath (e.g., 'crypto.js', 'sha256', 'hmac')
          const subpath = moduleName.replace('@noble/hashes/', '');
          const basePath = require.resolve('@noble/hashes');

          // For .js files, look in the package directory
          if (subpath.endsWith('.js')) {
            const subpathFile = path.join(path.dirname(basePath), subpath);
            return {
              type: 'sourceFile',
              filePath: subpathFile,
            };
          } else {
            // For other imports like 'sha256', 'hmac', etc., try the main directory
            const subpathFile = path.join(
              path.dirname(basePath),
              `${subpath}.js`,
            );
            return {
              type: 'sourceFile',
              filePath: subpathFile,
            };
          }
        } catch {
          // Fallback to main package if subpath doesn't exist
          return {
            type: 'sourceFile',
            filePath: require.resolve('@noble/hashes'),
          };
        }
      }

      // Fix snarkjs and ffjavascript platform exports for Android
      if (platform === 'android') {
        // Handle snarkjs and its nested dependencies that have platform export issues
        if (
          moduleName.includes('/snarkjs') &&
          (moduleName.endsWith('/snarkjs') ||
            moduleName.includes('/snarkjs/node_modules'))
        ) {
          try {
            // Try to resolve the main package file
            const packagePath = moduleName.split('/node_modules/').pop();
            const resolved = require.resolve(packagePath || 'snarkjs');
            return {
              type: 'sourceFile',
              filePath: resolved,
            };
          } catch {
            // Fallback to basic snarkjs resolution
            try {
              return {
                type: 'sourceFile',
                filePath: require.resolve('snarkjs'),
              };
            } catch {
              // Continue to next check
            }
          }
        }

        // Handle ffjavascript from any nested location
        if (
          moduleName.includes('/ffjavascript') &&
          moduleName.endsWith('/ffjavascript')
        ) {
          try {
            // Try to resolve ffjavascript from the specific nested location first
            const resolved = require.resolve(moduleName);
            return {
              type: 'sourceFile',
              filePath: resolved,
            };
          } catch {
            // Fallback to resolving ffjavascript from the closest available location
            try {
              const resolved = require.resolve('ffjavascript');
              return {
                type: 'sourceFile',
                filePath: resolved,
              };
            } catch {
              // Continue to next check
            }
          }
        }

        // Handle direct package imports for known problematic packages
        const platformProblematicPackages = ['snarkjs', 'ffjavascript'];
        for (const pkg of platformProblematicPackages) {
          if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
            try {
              return {
                type: 'sourceFile',
                filePath: require.resolve(pkg),
              };
            } catch {
              // Continue to next check
              continue;
            }
          }
        }
      }

      const nodeModuleRedirects = {
        crypto: path.resolve(__dirname, '../common/src/polyfills/crypto.ts'),
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

      // Handle optional peer dependencies by returning empty modules
      const optionalPeerDependencies = [
        'react-native-reanimated',
        '@react-native-masked-view/masked-view',
        '@react-native-firebase/analytics',
        'react-native-b4a',
      ];

      if (optionalPeerDependencies.includes(moduleName)) {
        // Return empty module for optional peer dependencies
        return { type: 'empty' };
      }

      // Fall back to default Metro resolver for all other modules
      try {
        return context.resolveRequest(context, moduleName, platform);
      } catch (error) {
        // Check if this is one of our expected optional dependencies
        if (optionalPeerDependencies.some(dep => moduleName.includes(dep))) {
          return { type: 'empty' };
        }

        // If default resolution fails, log and re-throw
        console.warn(
          `Metro resolver failed for module "${moduleName}":`,
          error.message,
        );
        throw error;
      }
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
