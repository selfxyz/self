// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { notImplemented } from '../errors';
import type { ScanResult } from '../types/public';

/**
 * Options for MRZ scanning.
 * Reserved for future use; currently no options are accepted.
 */
export type MRZScanOptions = Record<string, never>;

// Re-export processing functions
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from '../processing/mrz';

/**
 * Scan MRZ (Machine Readable Zone) on a passport or ID card.
 * @param _opts MRZ scanning options (currently unused)
 * @returns Promise resolving to scan result
 */
export async function scanMRZ(_opts: MRZScanOptions): Promise<ScanResult> {
  // Surface a consistent, typed error for unimplemented features
  throw notImplemented('scanMRZ');
}
