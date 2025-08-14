import type { ScanResult } from '../types/public';

export interface MRZScanOptions {
  // TODO: define MRZ scan options
}

export { extractMRZInfo, formatDateToYYMMDD } from '../processing/mrz';

export async function scanMRZ(_opts: MRZScanOptions): Promise<ScanResult> {
  throw new Error('Not implemented');
}
