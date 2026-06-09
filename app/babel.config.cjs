// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// tsup wraps require() as __require() in ESM builds for externalized modules.
// Metro's dependency collector only recognizes standard require() calls, so __require()
// calls are invisible to bundling. This plugin converts them back to require() so Metro
// can resolve and include the assets (e.g. .lottie files from the SDK dist).
function rewriteDunderRequire() {
  return {
    visitor: {
      CallExpression(path) {
        if (
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === '__require' &&
          path.node.arguments.length === 1 &&
          path.node.arguments[0].type === 'StringLiteral'
        ) {
          path.node.callee.name = 'require';
        }
      },
    },
  };
}

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    rewriteDunderRequire,
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
      },
    ],
    '@babel/plugin-transform-export-namespace-from',
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
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
