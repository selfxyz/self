// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Web mock for NFC scanner functionality
// NFC passport scanning is not supported on web browsers

export const parseScanResponse = (_response: unknown) => {
  throw new Error('NFC passport scanning is not supported on web browsers');
};

export const scan = async (_inputs: unknown) => {
  throw new Error('NFC passport scanning is not supported on web browsers');
};
