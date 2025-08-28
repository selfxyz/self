// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Web mock for react-native-passport-reader
export const reset = async () => {
  // No-op for web
  return Promise.resolve();
};

export const scan = async () => {
  throw new Error('NFC scanning is not supported on web');
};
