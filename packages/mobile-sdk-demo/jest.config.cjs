// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@selfxyz)/)'],
  moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules'],
  moduleNameMapper: {
    '^@selfxyz/common$': '<rootDir>/../../common/dist/cjs/index.cjs',
    '^@selfxyz/mobile-sdk-alpha$': '<rootDir>/../mobile-sdk-alpha/dist/cjs/index.cjs',
  },
};
