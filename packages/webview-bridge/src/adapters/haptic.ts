/**
 * Bridge haptic adapter.
 *
 * Fire-and-forget bridge call to trigger native haptic feedback.
 */

import type { WebViewBridge } from '../bridge';

export type HapticType =
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError'
  | 'selection';

export interface HapticAdapter {
  trigger(type: HapticType): void;
}

/**
 * Creates a haptic adapter that fires haptic feedback through the bridge.
 */
export function bridgeHapticAdapter(bridge: WebViewBridge): HapticAdapter {
  return {
    trigger(type: HapticType): void {
      bridge.fire('haptic', 'trigger', { type });
    },
  };
}
