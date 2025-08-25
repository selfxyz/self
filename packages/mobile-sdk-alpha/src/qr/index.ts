// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { notImplemented } from '../errors';
import type { ScanResult } from '../types/public';

/**
 * Options for QR proof scanning.
 * Reserved for future use; currently no options are accepted.
 */
export type QRProofOptions = Record<string, never>;

/**
 * Scan QR code containing proof data.
 * @param _opts QR proof scanning options (currently unused)
 * @returns Promise resolving to scan result
 */
export async function scanQRProof(_opts: QRProofOptions): Promise<ScanResult> {
  // Surface a consistent, typed error for unimplemented features
  throw notImplemented('scanQRProof');
}
