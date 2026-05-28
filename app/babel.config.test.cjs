// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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

    // TODO(SELF-2803): replace this hand-rolled subset with
    // @react-native/babel-preset directly once the hermes-parser WASM issue
    // under Jest has a cleaner workaround.
    // We intentionally do NOT list class/spread/destructuring/optional-chaining/
    // nullish-coalescing transforms — modern Node (preset-env target: current)
    // supports them natively. Forcing them caused "Missing class properties
    // transform" on class fields and "spread arguments in super() without
    // compiling classes" errors after the RN 0.77 → 0.83 upgrade.
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-syntax-export-default-from',
    '@babel/plugin-transform-export-namespace-from',
    '@babel/plugin-transform-unicode-regex',
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
