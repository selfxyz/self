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
    'simple-import-sort',
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
    'sonarjs/cognitive-complexity': ['warn', 20],
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-invalid-await': 'off',
    'sonarjs/no-redundant-optional': 'off',
    'sonarjs/prefer-read-only-props': 'warn',
    'sonarjs/todo-tag': 'warn',
    'sonarjs/no-unused-vars': 'off',

    // Additional TypeScript Strictness
    '@typescript-eslint/no-floating-promises': [
      'error',
      {
        ignoreVoid: true,
        ignoreIIFE: true,
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // React Performance Rules
    'react-perf/jsx-no-new-function-as-prop': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'warn',
    'react-perf/jsx-no-new-array-as-prop': 'warn',
    'react-perf/jsx-no-jsx-as-prop': 'warn',

    // Import rules
    'import/order': 'off',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'off',

    // Handle empty object patterns in destructuring
    'no-empty-pattern': 'off',

    // Escape characters in JSX
    'react/no-unescaped-entities': 'off',
  },
};
