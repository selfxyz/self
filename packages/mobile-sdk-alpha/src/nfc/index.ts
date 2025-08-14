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
