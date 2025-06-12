module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
  ],
  plugins: ['simple-import-sort', 'prettier', 'jest'],
  ignorePatterns: ['ios/', 'android/', 'deployments/', 'node_modules/'],
  rules: {
    // Import sorting rules
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',

    // Add prettier rule to show prettier errors as ESLint errors
    'prettier/prettier': [
      'warn',
      {
        // Fix for TypeScript union types indentation
        typescriptBracketSpacing: true,
        typeAssertionStyle: 'as',
      },
      { usePrettierrc: true },
    ],

    // Preserve project-specific rule exemptions
    'react-native/no-inline-styles': 'off',
    'react-hooks/exhaustive-deps': 'off',

    // Override any ESLint rules that conflict with the TypeScript union type formatting
    '@typescript-eslint/indent': 'off',
  },
};
