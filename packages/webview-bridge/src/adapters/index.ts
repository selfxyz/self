// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  createIndexedDBDocumentsAdapter,
  createNoOpHapticAdapter,
  createWebAnalyticsAdapter,
} from '@selfxyz/mobile-sdk-alpha/browser';
import type { WebAnalyticsOptions } from '@selfxyz/mobile-sdk-alpha/browser';

import type { BridgeAnalyticsAdapter } from './analytics';
import type { BridgeDocumentsAdapter } from './documents';
import type { BridgeHapticAdapter } from './haptic';

export { bridgeNFCScannerAdapter, onNfcProgress } from './nfc-scanner';
export type { BridgeNFCScannerAdapter } from './nfc-scanner';

export { bridgeCryptoAdapter } from './crypto';
export type { BridgeCryptoAdapter } from './crypto';

export { bridgeAuthAdapter } from './auth';
export type { BridgeAuthAdapter } from './auth';

export { bridgeDocumentsAdapter } from './documents';
export type { BridgeDocumentsAdapter } from './documents';

export { bridgeStorageAdapter } from './storage';
export type { BridgeStorageAdapter } from './storage';

export { bridgeAnalyticsAdapter } from './analytics';
export type { BridgeAnalyticsAdapter } from './analytics';
export type ConsoleAnalyticsOptions = WebAnalyticsOptions;

export { bridgeHapticAdapter } from './haptic';
export type { BridgeHapticAdapter } from './haptic';

export { webNavigationAdapter } from './navigation';
export type { BridgeNavigationAdapter, RouteName } from './navigation';

export { bridgeLifecycleAdapter } from './lifecycle';
export type { BridgeLifecycleAdapter } from './lifecycle';

export { bridgeBiometricsAdapter } from './biometrics';
export type { BridgeBiometricsAdapter } from './biometrics';

export { bridgeCameraAdapter } from './camera';
export type { BridgeCameraAdapter, MrzScanParams, MrzScanResult } from './camera';

export function indexedDBDocumentsAdapter(): BridgeDocumentsAdapter {
  return createIndexedDBDocumentsAdapter() as BridgeDocumentsAdapter;
}

export function consoleAnalyticsAdapter(
  options?: ConsoleAnalyticsOptions,
): BridgeAnalyticsAdapter {
  return createWebAnalyticsAdapter(options) as BridgeAnalyticsAdapter;
}

export function noOpHapticAdapter(): BridgeHapticAdapter {
  const trigger = createNoOpHapticAdapter();

  return {
    trigger(type: string): void {
      trigger(type as never);
    },
  };
}
