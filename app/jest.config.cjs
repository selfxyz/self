// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  moduleFileExtensions: [
    'ios.js',
    'android.js',
    'native.js',
    'ts',
    'tsx',
    'js',
    'jsx',
    'cjs',
    'json',
    'node',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase|@selfxyz|@sentry|@anon-aadhaar|react-native-svg|react-native-svg-circle-country-flags|react-native-blur-effect)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx,cjs}',
    '<rootDir>/**/?(*.)+(spec|test).{js,jsx,ts,tsx,cjs}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/scripts/tests/', // Node.js native test runner tests
    '/babel\\.config\\.test\\.cjs',
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/tests/__setup__/@env.js',
    '\\.svg$': '<rootDir>/tests/__setup__/svgMock.js',
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/tests/__setup__/imageMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@$': '<rootDir>/src',
    '^@tests/(.*)$': '<rootDir>/tests/src/$1',
    '^@tests$': '<rootDir>/tests/src',
    // Map react-native-svg to app's node_modules for all packages
    '^react-native-svg$': '<rootDir>/node_modules/react-native-svg',
    '^@selfxyz/mobile-sdk-alpha$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/index.cjs',
    '^@selfxyz/mobile-sdk-alpha/components$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/components/index.cjs',
    '^@selfxyz/mobile-sdk-alpha/hooks$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/hooks/index.cjs',
    '^@selfxyz/mobile-sdk-alpha/onboarding/(.*)$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/flows/onboarding/$1.cjs',
    '^@selfxyz/mobile-sdk-alpha/disclosing/(.*)$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/flows/disclosing/$1.cjs',
    '^@selfxyz/mobile-sdk-alpha/(.*)\\.json$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/$1.json',
    '^@selfxyz/mobile-sdk-alpha/(.*)$':
      '<rootDir>/../packages/mobile-sdk-alpha/dist/cjs/$1.cjs',
    // Fix snarkjs resolution for @anon-aadhaar/core
    '^snarkjs$': '<rootDir>/../circuits/node_modules/snarkjs/build/main.cjs',
    // Fix ffjavascript resolution for snarkjs dependencies
    '^ffjavascript$':
      '<rootDir>/../circuits/node_modules/ffjavascript/build/main.cjs',
    // Fix @anon-aadhaar/core resolution
    '^@anon-aadhaar/core$':
      '<rootDir>/../common/node_modules/@anon-aadhaar/core/dist/index.js',
  },
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.test.cjs' }],
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
