// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';
import type { EventHandler, NfcScanParams, NfcScanProgress } from '../types';

const NFC_TIMEOUT_MS = 120_000;

export interface BridgeNFCScannerAdapter {
  scan(opts: NfcScanParams & { signal?: AbortSignal }): Promise<unknown>;
}

export function bridgeNFCScannerAdapter(bridge: WebViewBridge): BridgeNFCScannerAdapter {
  return {
    scan(opts: NfcScanParams & { signal?: AbortSignal }): Promise<unknown> {
      const { signal, ...params } = opts;

      const promise = bridge.request('nfc', 'scanPassport', params as unknown as Record<string, unknown>, NFC_TIMEOUT_MS);

      if (signal) {
        const onAbort = () => {
          bridge.fire('nfc', 'cancelScan', { sessionId: params.sessionId });
        };

        if (signal.aborted) {
          bridge.fire('nfc', 'cancelScan', { sessionId: params.sessionId });
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }

        signal.addEventListener('abort', onAbort, { once: true });
        promise.finally(() => signal.removeEventListener('abort', onAbort));
      }

      return promise;
    },
  };
}

/**
 * Subscribe to NFC scan progress events.
 */
export function onNfcProgress(bridge: WebViewBridge, handler: (progress: NfcScanProgress) => void): () => void {
  return bridge.on('nfc', 'scanProgress', handler as EventHandler);
}
