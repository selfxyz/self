// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  plugins: ['simple-import-sort', 'import', 'sort-exports'],
  ignorePatterns: ['dist/', 'node_modules/'],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.eslint.json',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/ignore': ['react-native'],
  },
  rules: {
    'import/order': 'off',
    'no-duplicate-imports': 'off',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Node.js built-ins
          ['^node:'],
          ['^node:.*/'],
          // External packages
          ['^[a-zA-Z]'],
          // Internal workspace packages
          ['^@selfxyz/'],

          // Relative imports
          ['^[./]'],
        ],
      },
    ],
    // Export sorting is opt-in per file via overrides below. The rule
    // reorders `export const` declarations, which breaks files with
    // inter-export dependencies or intentional grouping. Only enable on
    // pure re-export barrels.
    'sort-exports/sort-exports': 'off',

    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/export': 'off',
    'import/no-unresolved': ['error', { caseSensitive: true }],
    'import/namespace': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-empty-object-type': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // TypeScript Import Rules
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],
    // Add prettier rule to show prettier errors as ESLint errors
    'prettier/prettier': ['warn', {}, { usePrettierrc: true }],
    // Disable prop-types for TypeScript files since we use TypeScript types
    'react/prop-types': 'off',
  },
  overrides: [
    {
      // Enable TypeScript project service for source files (required by consistent-type-exports)
      files: ['src/**/*.{ts,tsx}'],
      parserOptions: {
        project: true,
        EXPERIMENTAL_useProjectService: true,
      },
      rules: {
        '@typescript-eslint/consistent-type-exports': [
          'error',
          {
            fixMixedExportsWithInlineTypeSpecifier: false,
          },
        ],
      },
    },
    {
      files: ['*.cjs'],
      env: {
        node: true,
        commonjs: true,
        es6: true,
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-undef': 'off',
      },
    },
    {
      // Opt explicit public-API barrels into export sorting. These files exist
      // only to re-export from other modules — no inter-export dependencies,
      // no semantic grouping — so alphabetical order is a clear win for
      // scanability. Do not add source files here.
      files: ['src/index.ts', 'src/browser.ts'],
      rules: {
        'sort-exports/sort-exports': ['error', { sortDir: 'asc', ignoreCase: false, sortExportKindFirst: 'type' }],
      },
    },
    {
      // Allow require imports only in the NFC decoder shim that conditionally imports node:util
      files: ['src/processing/nfc.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
