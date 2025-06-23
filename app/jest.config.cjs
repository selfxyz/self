module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleNameMapper: {
    '^@env$': '<rootDir>/tests/__setup__/@env.js',
  },
};
