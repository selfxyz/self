module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  extends: [
    '@react-native',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jest/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['header', 'simple-import-sort', 'import'],
  ignorePatterns: [
    'ios/',
    'android/',
    'deployments/',
    'node_modules/',
    'web/dist/',
    '.tamagui/*',
    '*.js.map',
    '*.d.ts',
    'metro.config.cjs',
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
    'import/ignore': ['react-native'],
  },
  rules: {
    // Import/Export Rules
    'import/order': 'off',
    'no-duplicate-imports': 'off',
    'simple-import-sort/exports': 'warn',
    'simple-import-sort/imports': 'warn',

    // Header rule
    'header/header': [
      2,
      'line',
      ' SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11',
      2,
    ],

    // Add prettier rule to show prettier errors as ESLint errors
    'prettier/prettier': ['warn', {}, { usePrettierrc: true }],

    // React Core Rules
    'react/no-unescaped-entities': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'off',

    // React Hooks Rules
    'react-hooks/exhaustive-deps': 'warn',

    // General JavaScript Rules
    // Warn on common issues but don't block development
    'no-console': 'warn',
    'no-empty-pattern': 'off',
    'prefer-const': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-redeclare': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'no-case-declarations': 'off',
    'react/no-children-prop': 'off',
    'import/no-unresolved': 'error',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-empty': 'off',

    // Override rules conflicting with TypeScript union formatting
    '@typescript-eslint/indent': 'off',
  },
  overrides: [
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
        'header/header': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
