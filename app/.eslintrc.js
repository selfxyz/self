module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:prettier/recommended'],
  plugins: ['simple-import-sort', 'prettier'],
  ignorePatterns: ['ios/', 'android/', 'deployments/', 'node_modules/'],
  rules: {
    // Import sorting rules
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',

    // Add prettier rule to show prettier errors as ESLint errors
    'prettier/prettier': ['warn', {}, { usePrettierrc: true }],

    // Preserve project-specific rule exemptions
    'react-native/no-inline-styles': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
