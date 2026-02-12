// Bridge adapter implementations
export { bridgeNFCScannerAdapter, onNfcProgress } from './nfc-scanner';
export type { NFCScannerAdapter, NFCScanOpts, NFCScanResult } from './nfc-scanner';

export { bridgeCryptoAdapter } from './crypto';
export type { CryptoAdapter } from './crypto';

export { bridgeAuthAdapter } from './auth';
export type { AuthAdapter } from './auth';

export { bridgeDocumentsAdapter } from './documents';
export type { DocumentsAdapter, DocumentCatalog, IDDocument } from './documents';

export { bridgeStorageAdapter } from './storage';
export type { StorageAdapter } from './storage';

export { bridgeAnalyticsAdapter } from './analytics';
export type { AnalyticsAdapter } from './analytics';

export { bridgeHapticAdapter } from './haptic';
export type { HapticAdapter, HapticType } from './haptic';

export { webNavigationAdapter } from './navigation';
export type { NavigationAdapter, RouteName } from './navigation';

export { bridgeLifecycleAdapter } from './lifecycle';
export type { LifecycleAdapter } from './lifecycle';
