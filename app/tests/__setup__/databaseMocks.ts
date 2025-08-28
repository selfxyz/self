// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* global jest */

// Mock for react-native-sqlite-storage
export const SQLite = {
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
};
