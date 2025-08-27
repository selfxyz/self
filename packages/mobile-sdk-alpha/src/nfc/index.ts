// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { notImplemented } from '../errors';
import type { ScanResult } from '../types/public';

// Re-export types from processing
export type { DG1, DG2, ParsedNFCResponse } from '../processing/nfc';

/**
 * Options for NFC scanning.
 * Reserved for future use; currently no options are accepted.
 */
export type NFCScanOptions = Record<string, never>;

// Re-export processing functions
export { parseNFCResponse } from '../processing/nfc';

/**
 * Scan NFC chip on a passport or ID card.
 * @param _opts NFC scanning options (currently unused)
 * @returns Promise resolving to scan result
 */
export async function scanNFC(_opts: NFCScanOptions): Promise<ScanResult> {
  // Surface a consistent, typed error for unimplemented features
  throw notImplemented('scanNFC');
}
