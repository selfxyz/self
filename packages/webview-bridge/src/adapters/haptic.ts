// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface BridgeHapticAdapter {
  trigger(type: string): void;
}

export function bridgeHapticAdapter(
  bridge: WebViewBridge,
): BridgeHapticAdapter {
  return {
    trigger(type: string): void {
      bridge.fire('haptic', 'trigger', { type });
    },
  };
}

export function noOpHapticAdapter(): BridgeHapticAdapter {
  return {
    trigger(): void {},
  };
}
