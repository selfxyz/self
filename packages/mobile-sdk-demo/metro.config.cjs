// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const workspaceRoot = findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '../..');

/**
 * Modern Metro configuration for demo app using native workspace capabilities
 * Based on the working main app configuration
 */
const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
  ],

  resolver: {
    // Let workspace packages resolve naturally to their built exports (override where needed)
    alias: {
      '@selfxyz/mobile-sdk-alpha': path.resolve(
        workspaceRoot,
        'packages/mobile-sdk-alpha/src',
      ),
    },
    // Enable workspace-aware resolution
    enableGlobalPackages: true,
    unstable_enablePackageExports: true,
    // Prefer React Native-specific exports when available to avoid Node-only deps
    unstable_conditionNames: ['require', 'react-native'],
    unstable_enableSymlinks: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@babel/runtime': path.resolve(__dirname, '../../node_modules/@babel/runtime'),
      // Pin React and React Native to monorepo root
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-native': path.resolve(__dirname, '../../node_modules/react-native'),
      // Add workspace packages for proper resolution
      '@selfxyz/common': path.resolve(workspaceRoot, 'common'),
      // Crypto polyfills - use custom polyfill with @noble/hashes
      crypto: path.resolve(__dirname, 'crypto-polyfill.js'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
    },
    // Prefer source files for @selfxyz/common so stack traces reference real filenames
    resolveRequest: (context, moduleName, platform) => {
      // Handle problematic Node.js modules that don't work in React Native
      const nodeModuleRedirects = {
        crypto: path.resolve(__dirname, 'crypto-polyfill.js'),
        fs: false, // Disable filesystem access
        os: false, // Disable OS-specific modules
        readline: false, // Disable readline (pulls in events)
        constants: require.resolve('constants-browserify'),
        path: require.resolve('path-browserify'),
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

      if (moduleName === '@selfxyz/common' || moduleName.startsWith('@selfxyz/common/')) {
        const subpath = moduleName.replace('@selfxyz/common', '');
        // Map to common/src with sensible defaults
        let candidate = path.resolve(workspaceRoot, 'common/src' + subpath);
        // If it's the package root, target src/index
        if (candidate.endsWith('common/src')) {
          candidate = path.join(candidate, 'index');
        }
        // Prefer TypeScript source over compiled JS
        if (candidate.endsWith('.js')) {
          candidate = candidate.replace(/\.js$/, '.ts');
        }
        // Let Metro resolve extensions and index files
        return context.resolveRequest(context, candidate, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
