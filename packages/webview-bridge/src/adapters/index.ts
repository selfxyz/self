// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebAnalyticsOptions } from '@selfxyz/mobile-sdk-alpha/browser';
import {
  createIndexedDBDocumentsAdapter,
  createNoOpHapticAdapter,
  createWebAnalyticsAdapter,
} from '@selfxyz/mobile-sdk-alpha/browser';

import type { BridgeAnalyticsAdapter } from './analytics';
import type { BridgeDocumentsAdapter } from './documents';
import type { BridgeHapticAdapter } from './haptic';

export type { BridgeAnalyticsAdapter } from './analytics';
export type { BridgeAuthAdapter } from './auth';

export type { BridgeBiometricsAdapter } from './biometrics';
export type { BridgeCameraAdapter, MrzScanParams, MrzScanResult } from './camera';

export type { BridgeCryptoAdapter } from './crypto';
export type {
  BridgeCustodyAdapter,
  CustodyLinkEvent,
  CustodyLinkSession,
  CustodyState,
  CustodyUnlockResult,
} from './custody';
export type { BridgeDocumentsAdapter } from './documents';

export type { BridgeHapticAdapter } from './haptic';
export type { BridgeLifecycleAdapter } from './lifecycle';

export type { BridgeNFCScannerAdapter } from './nfc-scanner';
export type { BridgeNavigationAdapter, RouteName } from './navigation';

export type { BridgeStorageAdapter } from './storage';
export type ConsoleAnalyticsOptions = WebAnalyticsOptions;
export type { CreateSdkAdaptersOpts } from './sdk-adapter-map';

export { bridgeAnalyticsAdapter } from './analytics';
export { bridgeAuthAdapter } from './auth';

export { bridgeBiometricsAdapter } from './biometrics';
export { bridgeCameraAdapter } from './camera';

export { bridgeCryptoAdapter } from './crypto';
export { bridgeCustodyAdapter } from './custody';
export { bridgeDocumentsAdapter } from './documents';

export { bridgeHapticAdapter } from './haptic';
export { bridgeLifecycleAdapter } from './lifecycle';

export { bridgeNFCScannerAdapter, onNfcProgress } from './nfc-scanner';
export { bridgeStorageAdapter } from './storage';

export function consoleAnalyticsAdapter(options?: ConsoleAnalyticsOptions): BridgeAnalyticsAdapter {
  return createWebAnalyticsAdapter(options) as BridgeAnalyticsAdapter;
}
export { createKeychainDocumentsAdapter } from './keychain-documents';
export { createSdkAdapters } from './sdk-adapter-map';

export function indexedDBDocumentsAdapter(): BridgeDocumentsAdapter {
  return createIndexedDBDocumentsAdapter() as BridgeDocumentsAdapter;
}

export function noOpHapticAdapter(): BridgeHapticAdapter {
  const trigger = createNoOpHapticAdapter();

  return {
    trigger(type: string): void {
      trigger(type as never);
    },
  };
}

export { webNavigationAdapter } from './navigation';
