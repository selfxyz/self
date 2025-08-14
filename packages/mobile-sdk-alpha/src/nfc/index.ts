import type { ScanResult } from '../types/public';

export type { DG1, DG2, ParsedNFCResponse } from '../processing/nfc';

export interface NFCScanOptions {
  // TODO: define NFC scan options
}

export { parseNFCResponse } from '../processing/nfc';
export async function scanNFC(_opts: NFCScanOptions): Promise<ScanResult> {
  throw new Error('Not implemented');
}
