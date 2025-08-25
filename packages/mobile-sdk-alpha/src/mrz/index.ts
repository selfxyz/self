// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { notImplemented } from '../errors';
import type { ScanResult } from '../types/public';

/**
 * Options for MRZ scanning.
 * Reserved for future use; currently no options are accepted.
 */
export type MRZScanOptions = Record<string, never>;

// Re-export processing functions
export { extractMRZInfo, formatDateToYYMMDD } from '../processing/mrz';

/**
 * Scan MRZ (Machine Readable Zone) on a passport or ID card.
 * @param _opts MRZ scanning options (currently unused)
 * @returns Promise resolving to scan result
 */
export async function scanMRZ(_opts: MRZScanOptions): Promise<ScanResult> {
  // Surface a consistent, typed error for unimplemented features
  throw notImplemented('scanMRZ');
}
