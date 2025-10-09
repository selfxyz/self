// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SCANNER_ERROR_CODES, sdkError } from '../../errors';
import type { NFCScannerAdapter, NFCScanOpts, NFCScanResult } from '../../types/public';

export const webNFCScannerShim: NFCScannerAdapter = {
  async scan(_opts: NFCScanOpts & { signal?: AbortSignal }): Promise<NFCScanResult> {
    throw sdkError('NFC not supported in web shim', SCANNER_ERROR_CODES.NFC_NOT_SUPPORTED, 'scanner');
  },
};
