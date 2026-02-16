// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import type { WebViewBridge } from '../bridge';

export interface BridgeHapticAdapter {
  trigger(type: string): void;
}

export function bridgeHapticAdapter(bridge: WebViewBridge): BridgeHapticAdapter {
  return {
    trigger(type: string): void {
      bridge.fire('haptic', 'trigger', { type });
    },
  };
}
