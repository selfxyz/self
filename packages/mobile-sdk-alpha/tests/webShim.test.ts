// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { webNFCScannerShim } from '../src/adapters/web/shims';

describe('webNFCScannerShim', () => {
  it('rejects NFC scans', async () => {
    await expect(
      webNFCScannerShim.scan({
        passportNumber: '123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'test',
      }),
    ).rejects.toMatchObject({
      code: 'SELF_ERR_NFC_NOT_SUPPORTED',
      category: 'scanner',
    });
  });
});
