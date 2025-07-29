// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/* global jest */

// Mock for react-native-sqlite-storage
export const SQLite = {
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
};
