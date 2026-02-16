// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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

export { bridgeHapticAdapter } from './haptic';
export type { BridgeHapticAdapter } from './haptic';

export { webNavigationAdapter } from './navigation';
export type { BridgeNavigationAdapter, RouteName } from './navigation';

export { bridgeLifecycleAdapter } from './lifecycle';
export type { BridgeLifecycleAdapter } from './lifecycle';
