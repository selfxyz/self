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
    // Import/Export Rules
    'import/order': 'off',
    'no-duplicate-imports': 'error',
    'simple-import-sort/exports': 'off',
    'simple-import-sort/imports': 'error',
    'unused-imports/no-unused-imports': 'error',

    // React Core Rules
    'react/no-unescaped-entities': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'warn',

    // React Hooks Rules
    'react-hooks/exhaustive-deps': 'warn',

    // React Performance Rules
    'react-perf/jsx-no-jsx-as-prop': 'warn',
    'react-perf/jsx-no-new-array-as-prop': 'warn',
    'react-perf/jsx-no-new-function-as-prop': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'warn',

    // TypeScript Core Rules
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': [
      'error',
      {
        ignoreVoid: true,
        ignoreIIFE: true,
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/strict-boolean-expressions': 'off',

    // SonarJS Rules
    'sonarjs/cognitive-complexity': ['warn', 20],
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-invalid-await': 'off',
    'sonarjs/no-redundant-optional': 'off',
    'sonarjs/no-unused-vars': 'off',
    'sonarjs/prefer-read-only-props': 'off',
    'sonarjs/todo-tag': 'off',

    // General JavaScript Rules
    'no-console': 'off',
    'no-empty-pattern': 'off',
    'prefer-const': 'warn',
  },
};
