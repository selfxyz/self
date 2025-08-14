import type { ScanResult } from '../types/public';

export interface QRProofOptions {
  // TODO: define QR proofing options
}

export async function scanQRProof(_opts: QRProofOptions): Promise<ScanResult> {
  throw new Error('Not implemented');
}
