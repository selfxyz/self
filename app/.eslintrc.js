module.exports = {
  root: true,
  extends: [
    '@react-native',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-perf/all',
    'plugin:@typescript-eslint/strict',
    'plugin:sonarjs/recommended-legacy',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-perf',
    'sonarjs',
    'unused-imports',
    'import',
  ],
  ignorePatterns: [
    'ios/',
    'android/',
    'deployments/',
    'node_modules/',
    '*.js.map',
    '*.d.ts',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
    'import/ignore': ['react-native'],
  },
  rules: {
    // React Rules
    'react/react-in-jsx-scope': 'off', // Not needed in newer React versions
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react-native/no-inline-styles': 'warn', // Warning instead of off to encourage better practices
    'react-hooks/exhaustive-deps': 'warn', // Warning to catch potential issues

    // TypeScript Rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    // General Rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-duplicate-imports': 'error',

    // Unused Imports
    'unused-imports/no-unused-imports': 'error',

    // SonarJS Rules
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-identical-functions': 'warn',

    // Additional TypeScript Strictness
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',

    // New rules from the code block
    '@typescript-eslint/prefer-ts-expect-error': 'off',
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': true,
        'ts-nocheck': true,
        'ts-check': false,
        minimumDescriptionLength: 10,
      },
    ],

    // Import Rules
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/no-unused-modules': 'error',
    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
};
