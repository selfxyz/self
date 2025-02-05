module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'ios/',
    'android/',
    'deployments/',
    'node_modules/',
  ],
  rules: {
    'react-native/no-inline-styles': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
