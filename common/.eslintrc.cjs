module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: false },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['simple-import-sort', 'import', 'sort-exports'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.js.map',
    '*.d.ts',
    'pubkeys/',
    'sanctionedCountries/',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Enhanced Import/Export Rules
    'import/order': 'off',
    'no-duplicate-imports': 'off',

    // Import sorting with explicit groups for library structure
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
          // Internal relative imports
          ['^[./]'],
        ],
      },
    ],

    // Export sorting - using sort-exports for better type prioritization
    'sort-exports/sort-exports': [
      'error',
      { sortDir: 'asc', ignoreCase: false, sortExportKindFirst: 'type' },
    ],

    // Standard import rules
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',

    // TypeScript Rules - only essential ones
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',

    // General JavaScript Rules - minimal interference
    'no-console': 'off',
    'prefer-const': 'off',
    'no-empty': 'off',
    'no-undef': 'off',
    'no-control-regex': 'off',
    'no-useless-catch': 'off',
    'no-var': 'off',
    'no-multiple-empty-lines': 'off',

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
        '@typescript-eslint/no-var-requires': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
