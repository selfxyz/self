// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Web mock for react-native-passport-reader

// Mock PassportReader object with analytics methods
export const PassportReader = {
  configure: (
    token: string,
    enableDebug?: boolean,
    flushPolicies?: {
      flushInterval?: number;
      flushCount?: number;
      flushOnBackground?: boolean;
      flushOnForeground?: boolean;
      flushOnNetworkChange?: boolean;
    },
  ) => {
    // No-op for web
    return Promise.resolve();
  },
  trackEvent: (name: string, properties?: Record<string, unknown>) => {
    // No-op for web
    return Promise.resolve();
  },
  flush: () => {
    // No-op for web
    return Promise.resolve();
  },
  reset: () => {
    // No-op for web
    return Promise.resolve();
  },
  scan: async () => {
    throw new Error('NFC scanning is not supported on web');
  },
};
export const reset = async () => {
  // No-op for web
  return Promise.resolve();
};

export const scan = async () => {
  throw new Error('NFC scanning is not supported on web');
};
