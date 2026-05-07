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
    // Export sorting is opt-in per file via overrides below. The rule
    // reorders `export const` declarations, which breaks files with
    // inter-export dependencies or intentional grouping. Only enable on
    // pure re-export barrels.
    'sort-exports/sort-exports': 'off',

    'import/first': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
  overrides: [
    {
      // Opt the public-API barrel into export sorting. This file exists only
      // to re-export from other modules. Do not add source files here.
      files: ['index.ts'],
      rules: {
        'sort-exports/sort-exports': [
          'error',
          { sortDir: 'asc', ignoreCase: false, sortExportKindFirst: 'type' },
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
      },
    },
  ],
};
