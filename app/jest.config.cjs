// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|react-native-edge-to-edge|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase|@selfxyz|@sentry|@anon-aadhaar|@testing-library|react-native-svg|react-native-svg-circle-country-flags|react-native-blur-effect|react-native-webview|react-native-permissions|@didit-protocol|react-native-date-picker)/)',
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
    '^expo-camera$': '<rootDir>/tests/__setup__/expoCameraMock.js',
    '^expo-application$': '<rootDir>/tests/__setup__/expoApplicationMock.js',
    // Avoid loading lottie-react-native's nested react-native runtime in Jest.
    '^lottie-react-native$': '<rootDir>/tests/__setup__/lottieMock.js',
    // Mock react-native-blur-effect: under pnpm hoisted, it ships a nested
    // react-native copy that escapes the jest RN preset's mocks (see
    // blurEffectMock.js for details). Visual-only, not exercised in tests.
    '^react-native-blur-effect$': '<rootDir>/tests/__setup__/blurEffectMock.js',
    // Force a single react-native runtime in tests under pnpm's hoisted layout.
    '^react-native$': '<rootDir>/node_modules/react-native',
    // Map react-native-svg to the hoisted workspace copy (pnpm puts it at the
    // repo root under nodeLinker: hoisted; the app workspace's node_modules
    // does not contain a top-level entry for it).
    '^react-native-svg$': '<rootDir>/../node_modules/react-native-svg',
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
    // Resolve ZK deps from the hoisted workspace root (CI may not have
    // package-local node_modules under circuits/ with pnpm layouts).
    '^snarkjs$': '<rootDir>/../node_modules/snarkjs/build/main.cjs',
    '^ffjavascript$': '<rootDir>/../node_modules/ffjavascript/build/main.cjs',
    // Fix @anon-aadhaar/core resolution
    '^@anon-aadhaar/core$':
      '<rootDir>/../node_modules/@anon-aadhaar/core/dist/index.js',
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
