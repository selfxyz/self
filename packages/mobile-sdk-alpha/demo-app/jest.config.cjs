// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@selfxyz)/)'],
  moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules'],
  moduleNameMapper: {
    '^@babel/runtime(.*)$': '<rootDir>/../../../node_modules/@babel/runtime$1',
    '^react$': '<rootDir>/../../../node_modules/react',
    '^react-native$': '<rootDir>/../../../node_modules/react-native',
    '^@selfxyz/(.*)$': '<rootDir>/../../../node_modules/@selfxyz/$1',
  },
};
