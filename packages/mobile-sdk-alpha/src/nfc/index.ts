// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import { SdkEvents } from '../types/events';
import type { NFCScanOpts, NFCScanResult, SelfClient } from '../types/public';

// Re-export types from processing
export type { DG1, DG2, ParsedNFCResponse } from '../processing/nfc';

// Re-export processing functions
export { parseNFCResponse } from '../processing/nfc';

/**
 * Scan NFC chip on a passport or ID card.
 *
 * @param selfClient SelfClient instance
 * @param opts NFC scanning options
 * @returns Promise resolving to scan result
 */
export async function scanNFC(selfClient: SelfClient, opts: NFCScanOpts): Promise<NFCScanResult> {
  const baseContext = {
    sessionId: opts.sessionId,
    userId: opts.userId,
    platform: Platform.OS as 'ios' | 'android',
    scanType: opts.useCan ? 'can' : 'mrz',
  } as const;

  selfClient.emit(SdkEvents.NFC_EVENT, {
    level: 'info',
    context: {
      ...baseContext,
      stage: 'start',
    },
    event: 'scan_start',
  });

  try {
    return await selfClient.scanNFC(opts);
  } catch (error) {
    selfClient.emit(SdkEvents.NFC_EVENT, {
      level: 'error',
      context: {
        ...baseContext,
        stage: 'scan',
      },
      event: 'scan_failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}
