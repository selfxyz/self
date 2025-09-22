// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { webScannerShim } from '../src/adapters/web/shims';

describe('webScannerShim', () => {
  it('returns stub qr data', async () => {
    await expect(webScannerShim.scan({ mode: 'qr' })).resolves.toEqual({
      mode: 'qr',
      data: 'self://stub-qr',
    });
  });

  it('rejects MRZ scans', async () => {
    await expect(webScannerShim.scan({ mode: 'mrz' } as any)).rejects.toMatchObject({
      code: 'SELF_ERR_SCANNER_UNAVAILABLE',
      category: 'scanner',
    });
  });

  it('rejects NFC scans', async () => {
    await expect(webScannerShim.scan({ mode: 'nfc' } as any)).rejects.toMatchObject({
      code: 'SELF_ERR_NFC_NOT_SUPPORTED',
      category: 'scanner',
    });
  });

  it('rejects unknown scan modes', async () => {
    await expect(webScannerShim.scan({ mode: 'foo' as any })).rejects.toMatchObject({
      code: 'SELF_ERR_SCANNER_MODE',
      category: 'scanner',
    });
  });
});
