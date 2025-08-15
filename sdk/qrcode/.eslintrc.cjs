module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['simple-import-sort', 'import', 'sort-exports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
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
    'simple-import-sort/imports': 'error',
    'sort-exports/sort-exports': [
      'error',
      { sortDir: 'asc', ignoreCase: false, sortExportKindFirst: 'type' },
    ],

    'import/first': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
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
      },
    },
  ],
};
