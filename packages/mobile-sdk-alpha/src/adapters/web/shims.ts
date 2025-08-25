// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SCANNER_ERROR_CODES, sdkError } from '../../errors';
import type { ScannerAdapter, ScanOpts, ScanResult } from '../../types/public';

export const webScannerShim: ScannerAdapter = {
  async scan(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult> {
    switch (opts.mode) {
      case 'qr':
        return { mode: 'qr', data: 'self://stub-qr' };
      case 'mrz':
        throw sdkError('MRZ scan not supported in web shim', SCANNER_ERROR_CODES.UNAVAILABLE, 'scanner');
      case 'nfc':
        throw sdkError('NFC not supported in web shim', SCANNER_ERROR_CODES.NFC_NOT_SUPPORTED, 'scanner');
      default:
        throw sdkError('Unknown scan mode', SCANNER_ERROR_CODES.INVALID_MODE, 'scanner');
    }
  },
};
