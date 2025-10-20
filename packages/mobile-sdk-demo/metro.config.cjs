// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');
const findYarnWorkspaceRoot = require('find-yarn-workspace-root');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const projectRoot = __dirname;
const workspaceRoot = findYarnWorkspaceRoot(__dirname) || path.resolve(__dirname, '../..');

/**
 * Modern Metro configuration for demo app using native workspace capabilities
 * Based on the working main app configuration
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
    path.resolve(projectRoot, 'node_modules'), // Watch app's node_modules for custom resolved modules
  ],

  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
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
      new RegExp(`^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react(/|$)`),
      new RegExp(`^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react-dom(/|$)`),
      new RegExp(`^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/react-native(/|$)`),
      new RegExp(`^${workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/scheduler(/|$)`),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react(/|$)'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-dom(/|$)'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/react-native(/|$)'),
      new RegExp('packages/mobile-sdk-alpha/node_modules/scheduler(/|$)'),
      // Block the main app's node_modules to avoid collisions
      new RegExp('app/node_modules/react(/|$)'),
      new RegExp('app/node_modules/react-dom(/|$)'),
      new RegExp('app/node_modules/react-native(/|$)'),
      new RegExp('app/node_modules/scheduler(/|$)'),
    ],
    // Enable workspace-aware resolution
    enableGlobalPackages: true,
    unstable_enablePackageExports: true,
    // Prefer React Native-specific exports when available to avoid Node-only deps
    unstable_conditionNames: ['react-native', 'import', 'require'],
    unstable_enableSymlinks: true,
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],

    // SVG support
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],

    extraNodeModules: {
      // Add workspace packages for proper resolution
      '@selfxyz/common': path.resolve(workspaceRoot, 'common'),
      '@selfxyz/mobile-sdk-alpha': path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
      // Crypto polyfills - use custom polyfill with @noble/hashes
      crypto: path.resolve(__dirname, 'src/polyfills/cryptoPolyfill.js'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
      constants: require.resolve('constants-browserify'),
    },
    // Prefer source files for @selfxyz/common so stack traces reference real filenames
    resolveRequest: (context, moduleName, platform) => {
      // Fix @noble/hashes subpath export resolution
      if (moduleName.startsWith('@noble/hashes/')) {
        try {
          // Extract the subpath (e.g., 'crypto.js', 'sha256', 'hmac', 'lib/sha256.js')
          let subpath = moduleName.replace('@noble/hashes/', '');

          // Find the package root directory
          const basePath = require.resolve('@noble/hashes');
          let packageRoot = path.dirname(basePath);

          // Traverse up to find package.json to get the real package root
          while (packageRoot !== path.dirname(packageRoot)) {
            const packageJsonPath = path.join(packageRoot, 'package.json');
            const fs = require('fs');
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.name === '@noble/hashes') {
                  break;
                }
              } catch {
                // Continue searching
              }
            }
            packageRoot = path.dirname(packageRoot);
          }

          // Normalize the subpath - try multiple locations
          const candidatePaths = [];

          if (subpath.endsWith('.js')) {
            // Try the path as-is
            candidatePaths.push(path.join(packageRoot, subpath));
            // If subpath contains 'lib/', also try without 'lib/'
            if (subpath.startsWith('lib/')) {
              candidatePaths.push(path.join(packageRoot, subpath.replace('lib/', '')));
            }
          } else {
            // For imports without .js extension
            candidatePaths.push(path.join(packageRoot, `${subpath}.js`));
            candidatePaths.push(path.join(packageRoot, subpath, 'index.js'));
            // Also try in lib directory
            candidatePaths.push(path.join(packageRoot, 'lib', `${subpath}.js`));
          }

          // Guard against path traversal: normalize and ensure within packageRoot
          const fs = require('fs');
          const normalizedCandidates = candidatePaths
            .map(p => path.resolve(p))
            .filter(p => {
              const relative = path.relative(packageRoot, p);
              // keep only files strictly inside packageRoot
              return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
            });

          // Find the first existing file among safe candidates
          for (const candidatePath of normalizedCandidates) {
            if (fs.existsSync(candidatePath)) {
              return {
                type: 'sourceFile',
                filePath: candidatePath,
              };
            }
          }

          // Fallback to main package if no candidate exists
          return {
            type: 'sourceFile',
            filePath: require.resolve('@noble/hashes'),
          };
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
          (moduleName.endsWith('/snarkjs') || moduleName.includes('/snarkjs/node_modules'))
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
        if (moduleName.includes('/ffjavascript') && moduleName.endsWith('/ffjavascript')) {
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

      // Handle problematic Node.js modules that don't work in React Native
      const nodeModuleRedirects = {
        crypto: path.resolve(__dirname, 'src/polyfills/cryptoPolyfill.js'),
        fs: false, // Disable filesystem access
        os: false, // Disable OS-specific modules
        readline: false, // Disable readline (pulls in events)
        'web-worker': false, // Disable web workers (not supported in React Native)
      };

      if (Object.prototype.hasOwnProperty.call(nodeModuleRedirects, moduleName)) {
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

      // Fallback to default Metro resolver
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
