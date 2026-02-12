/**
 * Bridge NFC scanner adapter.
 *
 * Routes NFC scan requests through the bridge to the native NFC reader
 * (JMRTD on Android, NFCPassportReader on iOS). Handles progress events
 * and the 120s timeout for long scans.
 */

import type { WebViewBridge } from '../bridge';
import type { NfcScanProgress } from '../types';

/** Mirrors NFCScanOpts from mobile-sdk-alpha */
export interface NFCScanOpts {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
  sessionId: string;
  useCan?: boolean;
  userId?: string;
}

/** Mirrors NFCScanResult from mobile-sdk-alpha */
export interface NFCScanResult {
  passportData: {
    mrz: string;
    dsc: string;
    dg1Hash: number[];
    dg2Hash: number[];
    dgPresents: number[];
    eContent: number[];
    signedAttr: number[];
    encryptedDigest: number[];
    documentType: string;
    documentCategory: string;
    parsed: boolean;
    mock: boolean;
  };
}

/** Mirrors NFCScannerAdapter from mobile-sdk-alpha */
export interface NFCScannerAdapter {
  scan(opts: NFCScanOpts & { signal?: AbortSignal }): Promise<NFCScanResult>;
}

const NFC_SCAN_TIMEOUT_MS = 120_000;

/**
 * Creates an NFC scanner adapter that routes through the bridge.
 */
export function bridgeNFCScannerAdapter(bridge: WebViewBridge): NFCScannerAdapter {
  return {
    async scan(opts: NFCScanOpts & { signal?: AbortSignal }): Promise<NFCScanResult> {
      const { signal, ...params } = opts;

      // Set up abort handling
      if (signal?.aborted) {
        throw { code: 'SCAN_ABORTED', message: 'Scan was aborted before starting' };
      }

      const abortPromise = signal
        ? new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => {
              bridge.fire('nfc', 'cancelScan', {});
              reject({ code: 'SCAN_ABORTED', message: 'Scan was aborted' });
            });
          })
        : null;

      const scanPromise = bridge.request<NFCScanResult>(
        'nfc',
        'scan',
        params as unknown as Record<string, unknown>,
        NFC_SCAN_TIMEOUT_MS,
      );

      if (abortPromise) {
        return Promise.race([scanPromise, abortPromise]);
      }

      return scanPromise;
    },
  };
}

/**
 * Subscribe to NFC scan progress events.
 * Returns an unsubscribe function.
 */
export function onNfcProgress(
  bridge: WebViewBridge,
  handler: (progress: NfcScanProgress) => void,
): () => void {
  return bridge.on<NfcScanProgress>('nfc', 'scanProgress', handler);
}
