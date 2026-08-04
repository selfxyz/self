// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { derivePointsAddress } from './points';

describe('derivePointsAddress', () => {
  it("derives account index 1 of m/44'/60'/0'/0 like the phone app", () => {
    // Known vector: the standard test mnemonic's second account.
    expect(derivePointsAddress('test test test test test test test test test test test junk')).toBe(
      '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    );
  });
});
