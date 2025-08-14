import type { ScanResult } from '../types/public';

export interface NFCScanOptions {
  // TODO: define NFC scan options
}

export async function scanNFC(_opts: NFCScanOptions): Promise<ScanResult> {
  throw new Error('Not implemented');
}
