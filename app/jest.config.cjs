// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase|@selfxyz|@sentry)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleNameMapper: {
    '^@env$': '<rootDir>/tests/__setup__/@env.js',
    '\\.svg$': '<rootDir>/tests/__setup__/svgMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@$': '<rootDir>/src',
    '^@tests/(.*)$': '<rootDir>/tests/src/$1',
    '^@tests$': '<rootDir>/tests/src',
    '^@selfxyz/mobile-sdk-alpha$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/index.cjs',
    '^@selfxyz/mobile-sdk-alpha/(.*)$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/$1.cjs',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
