/**
 * Bridge lifecycle adapter.
 *
 * Manages the SDK lifecycle: signaling readiness, dismissing the WebView,
 * and returning verification results to the host app.
 */

import type { WebViewBridge } from '../bridge';
import type { VerificationResult } from '../types';

export interface LifecycleAdapter {
  /** Signal to native that the WebView app has finished loading. */
  ready(): void;
  /** Request native to dismiss the WebView. */
  dismiss(): void;
  /** Return a verification result to the host app and dismiss. */
  setResult(result: VerificationResult): Promise<void>;
}

/**
 * Creates a lifecycle adapter for communicating WebView state to native.
 */
export function bridgeLifecycleAdapter(bridge: WebViewBridge): LifecycleAdapter {
  return {
    ready(): void {
      bridge.fire('lifecycle', 'ready', {});
    },

    dismiss(): void {
      bridge.fire('lifecycle', 'dismiss', {});
    },

    async setResult(result: VerificationResult): Promise<void> {
      await bridge.request(
        'lifecycle',
        'setResult',
        result as unknown as Record<string, unknown>,
      );
    },
  };
}
