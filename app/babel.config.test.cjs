// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Babel config for Jest tests that excludes hermes-parser to avoid WebAssembly issues
// Based on React Native babel preset but with hermes parser plugin removed

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
  ],
  plugins: [
    // Module resolver for @ alias
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
      },
    ],

    // Core React Native transforms (minimal set needed for tests)
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-classes', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-syntax-export-default-from',
    '@babel/plugin-transform-export-namespace-from',
    '@babel/plugin-transform-unicode-regex',
    ['@babel/plugin-transform-destructuring', { useBuiltIns: true }],
    '@babel/plugin-transform-spread',
    [
      '@babel/plugin-transform-object-rest-spread',
      { loose: true, useBuiltIns: true },
    ],
    ['@babel/plugin-transform-optional-chaining', { loose: true }],
    ['@babel/plugin-transform-nullish-coalescing-operator', { loose: true }],
    ['@babel/plugin-transform-logical-assignment-operators', { loose: true }],
    // Flow type stripping to support React Native's Flow-based sources
    ['@babel/plugin-syntax-flow'],
    ['@babel/plugin-transform-flow-strip-types', { allowDeclareFields: true }],

    // Environment variable support
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
