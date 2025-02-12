module.exports = {
  root: true,
  extends: [
    '@react-native',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-perf/all',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-perf'],
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
  },
};
