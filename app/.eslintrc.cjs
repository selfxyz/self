// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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
  plugins: ['header', 'simple-import-sort', 'import', 'sort-exports'],
  ignorePatterns: [
    'ios/',
    'android/',
    'deployments/',
    'node_modules/',
    'web/dist/',
    '.tamagui/*',
    '*.js.map',
    'tests/e2e/',
  ],
  settings: {
    react: { version: 'detect' },
    'import/ignore': ['react-native'],
  },
  rules: {
    // Enhanced Import/Export Rules

    'import/order': 'off',
    'no-duplicate-imports': 'off',

    // Import sorting with explicit groups for your project structure

    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Node.js built-ins
          ['^node:'],
          ['^node:.*/'],

          // External packages (including @-prefixed external packages)
          ['^[a-zA-Z]', '^@(?!selfxyz|/)'],

          // Internal workspace packages
          ['^@selfxyz/'],

          // Internal alias imports (new @/ alias)
          ['^@/'],

          // Internal relative imports
          ['^[./]'],
        ],
      },
    ],

    // Export sorting

    'sort-exports/sort-exports': [
      'error',
      { sortDir: 'asc', ignoreCase: false, sortExportKindFirst: 'type' },
    ],

    // Standard import rules

    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',

    // Header rule - DISABLED in favor of check-license-headers.mjs script
    // 'header/header': [
    //   'error',
    //   'line',
    //   ' SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11',
    // ],

    // Prevent empty lines at the beginning and end of files, and limit consecutive empty lines
    // Exception: allow one empty line after license header at file start

    'no-multiple-empty-lines': [
      'error',
      {
        max: 1,
        maxEOF: 0,
        maxBOF: 1, // Allow one empty line at beginning (for license header)
      },
    ],
    // Keep lines-around-comment rule disabled for normal comments
    // License header newlines will be enforced by the check-license-headers.mjs script

    'lines-around-comment': [
      'error',
      {
        beforeBlockComment: false,
        afterBlockComment: false,
        beforeLineComment: false,
        afterLineComment: false, // Keep disabled - license script handles this
        allowBlockStart: true,
        allowBlockEnd: false,
        allowObjectStart: false,
        allowObjectEnd: false,
        allowArrayStart: false,
        allowArrayEnd: false,
        allowClassStart: false,
        allowClassEnd: false,
        applyDefaultIgnorePatterns: false,
      },
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

    'no-console': 'off',
    'no-empty-pattern': 'off',
    'prefer-const': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-empty-object-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-expressions': 'warn',
    'no-redeclare': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'no-case-declarations': 'off',
    'react/no-children-prop': 'off',
    'import/no-unresolved': 'off', // TypeScript handles this
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-empty': 'off',

    // TypeScript Import Rules

    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],

    // Custom rule to prevent export * (bad for tree shaking)
    // This rule prevents the use of export * which disables tree shaking
    // and can significantly increase bundle size. Use selective exports instead.
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ExportAllDeclaration',
        message:
          'export * is forbidden. Use selective exports for better tree shaking. Example: export { specific1, specific2 } from "./module"',
      },
    ],

    // Override rules conflicting with TypeScript union formatting

    '@typescript-eslint/indent': 'off',
  },
  overrides: [
    {
      // Enable TypeScript project service for source files for faster parsing
      files: ['src/**/*.{ts,tsx}'],
      parserOptions: {
        project: true,
        EXPERIMENTAL_useProjectService: true,
      },
    },
    {
      files: ['docs/examples/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        'no-unused-vars': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      // Disable export sorting for files with dependency issues
      files: [
        'src/components/navbar/BaseNavBar.tsx',
        'src/navigation/index.tsx',
        'src/providers/passportDataProvider.tsx',
        'src/services/cloud-backup/helpers.ts',
        'src/integrations/haptics/index.ts',
      ],
      rules: {
        'sort-exports/sort-exports': 'off',
      },
    },
    {
      files: ['tests/**/*.{ts,tsx}'],
      env: {
        jest: true,
      },
      parserOptions: {
        project: './tsconfig.test.json',
        EXPERIMENTAL_useProjectService: true,
      },
      rules: {
        // Allow console logging and relaxed typing in tests
        'no-console': 'off',
        // Allow require() imports in tests for mocking, but block react/react-native
        '@typescript-eslint/no-require-imports': 'off',
        // Block require('react') and require('react-native') to prevent OOM issues
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "CallExpression[callee.name='require'][arguments.0.value='react']",
            message:
              "Do not use require('react') in tests. Use 'import React from \"react\"' at the top of the file to avoid out-of-memory issues in CI.",
          },
          {
            selector:
              "CallExpression[callee.name='require'][arguments.0.value='react-native']",
            message:
              "Do not use require('react-native') in tests. Use 'import { ... } from \"react-native\"' at the top of the file to avoid out-of-memory issues in CI.",
          },
        ],
        // Allow any types in tests for mocking
        '@typescript-eslint/no-explicit-any': 'off',
        // Allow test skipping without warnings
        'jest/no-disabled-tests': 'off',
      },
    },
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        // Allow console logging in test JS files
        'no-console': 'off',
        // Block require('react') and require('react-native') to prevent OOM issues
        'no-restricted-syntax': [
          'error',
          {
            selector:
              "CallExpression[callee.name='require'][arguments.0.value='react']",
            message:
              "Do not use require('react') in tests. Use 'import React from \"react\"' at the top of the file to avoid out-of-memory issues in CI.",
          },
          {
            selector:
              "CallExpression[callee.name='require'][arguments.0.value='react-native']",
            message:
              "Do not use require('react-native') in tests. Use 'import { ... } from \"react-native\"' at the top of the file to avoid out-of-memory issues in CI.",
          },
        ],
      },
    },
    {
      // Allow console logging in scripts
      files: ['scripts/**/*.cjs', 'scripts/*.cjs'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Allow require imports for conditional loading in navigation
      files: ['src/navigation/index.tsx'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      files: ['*.cjs', '*.js'],
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
        'no-console': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
