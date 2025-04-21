module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['ios/', 'android/', 'deployments/', 'node_modules/'],
  rules: {
    // Preserve project-specific rule exemptions
    'react-native/no-inline-styles': 'off',
    'react-hooks/exhaustive-deps': 'off',

    // Core indentation and spacing rules
    'indent': ['warn', 2, {
      'SwitchCase': 1,
      'FunctionDeclaration': { 'parameters': 1, 'body': 1 },
      'FunctionExpression': { 'parameters': 1, 'body': 1 },
      'CallExpression': { 'arguments': 1 },
      'ArrayExpression': 1,
      'ObjectExpression': 1,
      'ImportDeclaration': 1,
    }],
    'react/jsx-indent': ['warn', 2],
    'react/jsx-indent-props': ['warn', 2],

    // Basic spacing rules
    'no-trailing-spaces': 'warn',
    'no-multi-spaces': 'warn',
    'key-spacing': ['warn', { 'beforeColon': false, 'afterColon': true }],
    'keyword-spacing': ['warn', { 'before': true, 'after': true }],

    // Line break rules
    'no-multiple-empty-lines': ['warn', { max: 1, maxBOF: 0, maxEOF: 0 }],
    'padded-blocks': ['warn', 'never'],

    // JSX formatting
    'react/jsx-first-prop-new-line': ['warn', 'multiline'],
    'react/jsx-max-props-per-line': ['warn', { 'maximum': 1, 'when': 'multiline' }],

    // Object formatting
    'object-curly-newline': ['warn', {
      'consistent': true,
    }],
    'object-property-newline': ['warn', { 'allowAllPropertiesOnSameLine': true }],
  },
};
