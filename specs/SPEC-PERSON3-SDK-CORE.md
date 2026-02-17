# WebView Engine — Implementation Spec

## Overview

You are making **`@selfxyz/mobile-sdk-alpha`** work cleanly inside a browser/WebView context. This package is the "UI backend" — it contains all core logic (proving machine, stores, document management, protocol state) that Person 1's screen components consume via `useSelfClient()`.

Today the package is entangled with React Native. Your job is to sever those ties so the same core logic runs in both:
- **React Native** (existing Self Wallet app — must not regress)
- **Browser/WebView** (Person 1's `@selfxyz/webview-app` running inside Person 2's KMP shell)

You are NOT building screens or native handlers. You are making the engine portable.

---

## The Problem

`mobile-sdk-alpha` currently has React Native leaking into core logic:

| File | Issue |
|------|-------|
| `src/proving/provingMachine.ts:6` | `import { Platform } from 'react-native'` — `getPlatform()` helper |
| `src/proving/provingMachine.ts:543,547` | `__DEV__` global for TEE attestation validation |
| `src/constants/fonts.ts:10` | `Platform.OS === 'ios'` for font family selection |
| `src/nfc/index.ts:27` | `Platform.OS` for logging scan type |
| `src/adapters/react-native/nfc-scanner.ts` | `NativeModules`, `Platform`, `Buffer` — full RN NFC impl |
| `src/bridge/nativeEvents.native.ts` | `NativeEventEmitter`, `NativeModules` |
| `src/haptic/index.ts`, `trigger.ts` | `Platform`-dependent vibration APIs |
| `src/components/MRZScannerView.tsx` | `requireNativeComponent()`, `NativeModules`, `UIManager` |
| `src/flows/onboarding/document-nfc-screen.tsx` | `NativeEventEmitter`, `NativeModules`, `Platform`, `Linking` |
| `src/documents/useCountries.tsx` | `react-native-localize` for device locale |
| `src/stores/selfAppStore.tsx` | `socket.io-client` (works in browser, but needs WsAdapter) |

Some of these are in "leaf" files (components, adapters) that the WebView will never import. Others are in core files (proving machine, fonts, stores) that the WebView **must** import.

---

## Design Principles

### Adapter Interfaces Are Already Right

The good news: `mobile-sdk-alpha` already has a clean adapter architecture. The `Adapters` interface in `src/types/public.ts` defines the contract:

```typescript
interface Adapters {
  scanner: NFCScannerAdapter;    // NFC → bridge to native (hardware required)
  crypto: CryptoAdapter;         // hash() → Web Crypto API (web fallback), sign() → bridge to native (biometric-gated key ops)
  network: NetworkAdapter;       // fetch() everywhere, WsAdapter for WebSocket
  auth: AuthAdapter;             // bridge to native (keychain, native-managed)
  documents: DocumentsAdapter;   // IndexedDB (web fallback, NOT bridge)
  navigation: NavigationAdapter; // React Router in WebView, React Navigation in RN
  storage?: StorageAdapter;      // bridge to native (keychain, native-managed)
  analytics?: AnalyticsAdapter;  // console/fetch (web fallback, NOT bridge)
  haptic?: HapticAdapter;        // no-op in WebView (not critical)
  clock?: ClockAdapter;          // Date.now() + setTimeout everywhere
  logger?: LoggerAdapter;        // console everywhere
}
```

**Adapter mapping — web fallback vs bridge:**

| Adapter | WebView Strategy | Why |
|---------|-----------------|-----|
| `NFCScannerAdapter` | Bridge to native | Hardware access (NFC radio) |
| `CryptoAdapter.hash()` | **Web Crypto API (web fallback)** | Standard web API, no native needed |
| `CryptoAdapter.sign()` | Bridge to native | Biometric-gated key operations |
| `AuthAdapter` | Bridge to native | Keychain access, host app policy |
| `DocumentsAdapter` | **IndexedDB (web fallback)** | Standard web storage, no native needed |
| `StorageAdapter` | Bridge to native | Keychain/SecureStorage, native-managed |
| `AnalyticsAdapter` | **console/fetch (web fallback)** | No native dependency |
| `HapticAdapter` | No-op | Not critical for verification flow |
| `NavigationAdapter` | React Router (web) | Standard web routing |
| `NetworkAdapter` | `fetch()` / `WebSocket` (web) | Standard web APIs |

`createSelfClient({ config, adapters, listeners })` already wires these in. Person 1's `SelfClientProvider` calls this with bridge-backed adapter implementations. The core logic (`provingMachine`, `protocolStore`, `documents/utils`) talks only through `SelfClient` — it never reaches for native APIs directly.

**Except where it does.** That's what you're fixing.

### Keychain/SecureStorage Must Remain Native-Managed

Keychain/SecureStorage MUST remain native-managed. The WebView does NOT get direct keychain access. Host apps (like MiniPay) have their own keychain policies. The `StorageAdapter` always bridges to native for keychain operations. The `AuthAdapter` (which wraps keychain-backed private key access) always bridges to native as well. This is a security boundary, not a convenience choice.

---

## Self Wallet as Test Environment

The Self Wallet app (`app/`) currently reimplements much of what `mobile-sdk-alpha` provides: NFC scanning, document storage, auth/keychain access, analytics, and navigation. During SDK development, the Self Wallet serves as a **test environment** to validate moving code from `app/` into the WebView engine (`mobile-sdk-alpha`).

The migration path:

1. **Now**: Self Wallet is the reference implementation. As Person 3 makes `mobile-sdk-alpha` portable, the Self Wallet app validates that existing RN flows do not regress.
2. **Phase 2**: Once the SDK ships to production (MiniPay integration works), Self Wallet integrates the `<SelfVerification />` RN component for its verification flow, replacing its bespoke NFC/proving/disclosure screens.
3. **Phase 3**: Remaining Self Wallet features (document management, settings, rewards) can optionally migrate to the WebView or stay native — this is a product decision, not an SDK concern.

This avoids a risky big-bang migration while ensuring the SDK is battle-tested before Self Wallet depends on it. The **SDK vs App Gap Summary** table at the bottom of this spec documents the migration backlog between `app/` and `mobile-sdk-alpha`.

---

## Scope of Work

### 1. Remove `Platform` from Core Logic

**`src/proving/provingMachine.ts`** — Lines 6, 214

```typescript
// BEFORE
import { Platform } from 'react-native';
const getPlatform = (): 'ios' | 'android' => (Platform.OS === 'ios' ? 'ios' : 'android');
```

The `getPlatform()` function is used only for the `ProofContext.platform` field in structured logging. This should be injected through config or derived from the environment.

**Fix:** Add a `platform` field to `Config` and default it based on user-agent detection:

```typescript
// In src/types/public.ts — extend Config
export interface Config {
  // ... existing fields
  /**
   * Platform identifier for structured logging. Defaults to auto-detection
   * from the environment (user-agent sniffing in browser, 'unknown' elsewhere).
   */
  platform?: 'ios' | 'android' | 'web' | string;
}
```

```typescript
// In provingMachine.ts — replace getPlatform()
const getPlatform = (selfClient: SelfClient): string => {
  return selfClient.config.platform ?? 'unknown';
};
```

The RN host app passes `platform: Platform.OS` in config. The WebView host passes `platform: 'webview'` or auto-detects from user-agent. No `react-native` import needed.

---

### 2. Remove `__DEV__` from Core Logic

**`src/proving/provingMachine.ts`** — Lines 543, 547

```typescript
// BEFORE
const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, __DEV__);
if (!__DEV__ && !pcr0Mapping) { ... }
```

`__DEV__` is a React Native global. In Vite, the equivalent is `import.meta.env.DEV`. Neither should leak into core logic.

**Fix:** Add a `debug` field to `Config` (or reuse the existing `devConfig`):

```typescript
// In src/types/public.ts — extend Config
export interface Config {
  // ... existing fields
  /**
   * When true, relaxes TEE attestation checks (skips PCR0 mapping validation).
   * Must NEVER be true in production builds.
   */
  debug?: boolean;
}
```

```typescript
// In provingMachine.ts
const isDebug = selfClient.config.debug ?? false;
const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, isDebug);
if (!isDebug && !pcr0Mapping) { ... }
```

The RN app passes `debug: __DEV__`. The WebView app passes `debug: import.meta.env.DEV`.

---

### 3. Fix `fonts.ts` Platform Dependency

**`src/constants/fonts.ts`** — Line 10

```typescript
// BEFORE
import { Platform } from 'react-native';
export const dinot = Platform.OS === 'ios' ? 'DINOT-Medium' : 'dinot';
```

Fonts need platform-specific family names because iOS and Android register fonts differently. The WebView uses CSS `@font-face` so it needs the CSS family name.

**Fix:** Export platform-agnostic font tokens and let the host resolve them:

```typescript
// src/constants/fonts.ts — NO react-native import
/**
 * Logical font tokens. The actual font-family string depends on the platform:
 * - iOS: 'DINOT-Medium' (PostScript name)
 * - Android: 'dinot' (asset filename stem)
 * - Web/WebView: 'DINOT-Medium' (CSS @font-face family)
 *
 * The host app's Tamagui config or StyleSheet maps these tokens to platform values.
 * For backwards compat, we export the token names directly.
 */
export const advercase = 'Advercase-Regular';
export const dinot = 'DINOT-Medium';
export const dinotBold = 'DINOT-Bold';
export const plexMono = 'IBMPlexMono-Regular';
```

This is a **breaking change for Android** if anything reads `dinot` and expects `'dinot'` (the Android asset name). The fix: update the Android Tamagui config to use `createFont()` with the correct face mapping. The font token should represent the design intent, not the platform filename.

**If this is too risky**, provide a platform-aware factory instead:

```typescript
export const getFontFamily = (platform: 'ios' | 'android' | 'web'): typeof fontTokens => ({
  advercase: 'Advercase-Regular',
  dinot: platform === 'android' ? 'dinot' : 'DINOT-Medium',
  dinotBold: platform === 'android' ? 'dinot_bold' : 'DINOT-Bold',
  plexMono: 'IBMPlexMono-Regular',
});
```

---

### 4. Make Proving Machine Use `NetworkAdapter.ws` Instead of Raw WebSocket

**`src/proving/provingMachine.ts`** uses `new WebSocket(url)` directly (lines 925, 1387). It also uses `socket.io-client` directly (line 676).

The `NetworkAdapter` already defines a `WsAdapter` interface:

```typescript
interface WsAdapter {
  connect(url: string, opts?): WsConn;
}
interface WsConn {
  send(data: string | ArrayBufferView | ArrayBuffer): void;
  close(): void;
  onMessage(cb: (data: any) => void): void;
  onError(cb: (e: any) => void): void;
  onClose(cb: () => void): void;
}
```

But the proving machine doesn't use it. It creates raw `WebSocket` instances and uses `addEventListener` directly.

**Fix:** Refactor the proving machine to use `WsAdapter` from the `SelfClient` adapters. This is the largest refactor in the spec.

**Why it matters:** In the WebView, `WebSocket` works natively in the browser — so this isn't strictly broken. But using the adapter:
- Enables the host to intercept/log connections
- Enables mock testing without real WebSockets
- Is consistent with the adapter architecture

**Approach:**

a. Add `network` to the things `SelfClient` exposes (or pass it through config):

```typescript
// In client.ts — expose network adapter on SelfClient
return {
  // ... existing
  network: _adapters.network,
};
```

b. In `provingMachine.ts`, replace `new WebSocket(url)` with `selfClient.network.ws.connect(url)`:

```typescript
// BEFORE
const ws = new WebSocket(wsRpcUrl);
ws.addEventListener('message', handler);
ws.addEventListener('open', handler);
ws.addEventListener('error', handler);
ws.addEventListener('close', handler);

// AFTER
const conn = selfClient.network.ws.connect(wsRpcUrl);
conn.onMessage(handler);
conn.onError(handler);
conn.onClose(handler);
// Note: WsConn doesn't have onOpen — extend the interface or handle in connect()
```

> **Decision needed:** The current `WsConn` interface lacks `onOpen`. Either:
> - (a) Add `onOpen(cb: () => void): void` to `WsConn`
> - (b) Have `connect()` return a Promise that resolves when open
> - (c) Keep using raw `WebSocket` in browser (it works) and only refactor for testability later
>
> **Recommendation:** Option (a) — add `onOpen` to `WsConn`. It's a one-line interface change.

c. For `socket.io-client` usage (status listener at line 676): This is trickier. Socket.IO is a higher-level protocol with rooms, namespaces, reconnection. Options:
- Keep `socket.io-client` as a direct dependency (it works in browser)
- Abstract behind a new `StatusAdapter` interface

**Recommendation:** Keep `socket.io-client` for now. It's isomorphic (browser + Node) and doesn't depend on React Native. Refactoring it is low priority.

---

### 5. Ensure `Buffer` Polyfill Story Is Clean

`Buffer` is used in `provingMachine.ts` indirectly through `@selfxyz/common/utils/proving`:
- `clientKey`, `clientPublicKeyHex`, `ec` — elliptic curve operations
- `encryptAES256GCM` — AES encryption using `node-forge`
- `getPayload` — payload construction

These all come from `@selfxyz/common` which has its own `Buffer` dependency. In the WebView, Vite needs a `buffer` polyfill.

**Fix for `webview-app`** (Person 1's responsibility, but Person 3 should document):

```typescript
// vite.config.ts
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  // ...
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
    },
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
});
```

Person 3 should verify that `@selfxyz/common` functions work in a browser with this polyfill. If they don't, the fixes go in `@selfxyz/common`, not in `mobile-sdk-alpha`.

---

### 6. Create Clean Browser Entry Point

**`src/browser.ts`** already exists but is a near-copy of `src/index.ts` with a few web-safe swaps. This is the right pattern but needs to be extended.

**What the WebView imports:**
- `createSelfClient`, `createListenersMap` — factory
- `SelfClientProvider`, `useSelfClient` — React context
- Adapter type interfaces — `Adapters`, `NFCScannerAdapter`, etc.
- Constants — `colors`, `fonts`
- Store types — `ProvingState`, `ProtocolState`, etc.
- Document utils — `loadSelectedDocument`, `storePassportData`, etc.
- Proving machine — `useProvingStore`, `ProvingStateType`, `provingMachineCircuitType`
- Events — `SdkEvents`, `SDKEventMap`
- Error classes — `SdkError`, etc.

**What the WebView must NOT import:**
- `reactNativeScannerAdapter` — RN-specific NFC adapter
- `MRZScannerView` — native component
- `RCTFragment` — Android-specific
- `nativeEvents.native.ts` — RN event emitter
- `haptic/trigger.ts` — RN haptic module
- `ExpandableBottomLayout` — RN View/ScrollView component (unless ported to web)
- Any file that imports from `react-native` directly

**Fix:** Audit `src/browser.ts` and ensure it only re-exports web-safe modules. Use `package.json` `exports` field to direct bundlers:

```json
{
  "exports": {
    ".": {
      "react-native": "./src/index.ts",
      "import": "./src/browser.ts",
      "default": "./src/browser.ts"
    },
    "./constants/colors": "./src/constants/colors.ts",
    "./constants/fonts": "./src/constants/fonts.ts"
  }
}
```

This way, when `webview-app` does `import { useSelfClient } from '@selfxyz/mobile-sdk-alpha'`, it gets `browser.ts` which excludes RN-specific code. When the RN app imports the same path, it gets `index.ts`.

**The browser entry point should export both bridge adapters AND web fallback adapters.** This allows `SelfClientProvider` to choose the right implementation for each adapter:

```typescript
// src/browser.ts — export web fallback adapter factories
export { createIndexedDBDocumentsAdapter } from './adapters/browser/documents';
export { createWebCryptoAdapter } from './adapters/browser/crypto';
export { createWebAnalyticsAdapter } from './adapters/browser/analytics';
export { createNoOpHapticAdapter } from './adapters/browser/haptic';

// Also re-export bridge adapter factories (for adapters that MUST bridge to native)
export { createBridgeNFCAdapter } from './adapters/bridge/nfc';
export { createBridgeCryptoAdapter } from './adapters/bridge/crypto'; // provides sign()
export { createBridgeAuthAdapter } from './adapters/bridge/auth';
export { createBridgeStorageAdapter } from './adapters/bridge/storage';
```

This way, `SelfClientProvider` in the `webview-app` can compose adapters:

```typescript
const adapters: Adapters = {
  scanner: createBridgeNFCAdapter(bridge),           // bridge — hardware
  crypto: {
    ...createBridgeCryptoAdapter(bridge),             // bridge — sign()
    ...createWebCryptoAdapter(),                      // web fallback — hash()
  },
  auth: createBridgeAuthAdapter(bridge),              // bridge — keychain
  documents: createIndexedDBDocumentsAdapter(),        // web fallback
  analytics: createWebAnalyticsAdapter({ debug }),     // web fallback
  storage: createBridgeStorageAdapter(bridge),         // bridge — keychain
  // ...
};
```

---

### 7. Decouple `selfAppStore` from Direct Socket.IO

**`src/stores/selfAppStore.tsx`** creates a `socket.io-client` connection directly for the relay server (app listener for QR code scanning flow).

In the WebView/SDK context, the "self app" relay flow may not be needed — the KMP host app receives the `VerificationRequest` directly via `SelfSdk.launch()`. The WebView doesn't need to listen on a Socket.IO relay for incoming requests.

**Fix options:**

a. **Make the store's socket creation conditional.** If no relay URL is configured, skip Socket.IO entirely:

```typescript
startAppListener: (selfClient, relayUrl?) => {
  if (!relayUrl) return; // WebView mode — request comes via lifecycle bridge
  // ... existing Socket.IO logic
}
```

b. **Move the Socket.IO dependency behind `NetworkAdapter.ws`** so the host controls connection creation.

**Recommendation:** Option (a) for now. The `selfAppStore` relay flow is only relevant for the standalone Self Wallet app where users scan a QR code. In the embedded SDK flow (MiniPay), the `VerificationRequest` arrives via the KMP `SelfSdk.launch()` API and is passed to the WebView as initial configuration.

---

### 8. Add WebView Lifecycle Integration Points

When running inside a WebView, the SDK needs hooks that don't exist in the RN app:

**a. Initialization from host config:**

The KMP host calls `SelfSdk.launch(request, callback)`. This request needs to reach the WebView. Person 2's `LifecycleBridgeHandler` handles `setResult` (WebView → host), but the reverse flow (host → WebView config) needs to be defined.

**Fix:** Add an `initialConfig` concept:

```typescript
// In src/types/public.ts
export interface SdkInitialConfig {
  /** Verification request from the host app. */
  verificationRequest?: VerificationRequest;
  /** Environment override. */
  env?: 'prod' | 'stg';
  /** Platform identifier for logging. */
  platform?: string;
  /** Debug mode. */
  debug?: boolean;
}

export interface VerificationRequest {
  userId?: string;
  scope?: string;
  disclosures?: string[];
  selfApp?: unknown; // SelfApp payload from host
}
```

The WebView's `SelfClientProvider` reads this from a bridge call on mount:

```typescript
// In webview-app's SelfClientProvider (Person 1 implements, Person 3 defines the type)
const config = await bridge.request('lifecycle', 'getConfig', {});
```

Person 2 adds a `getConfig` method to `LifecycleBridgeHandler` that returns the serialized `VerificationRequest` + env config.

**b. Result delivery:**

The proving machine currently calls `selfClient.getSelfAppState().handleProofResult(success)` on completion. In the WebView, this should additionally call `lifecycle.setResult(result)` to notify the KMP host.

**Fix:** Emit a `SdkEvents.VERIFICATION_COMPLETE` event that the WebView's lifecycle adapter listens for:

```typescript
// Add to src/types/events.ts
VERIFICATION_COMPLETE = 'verification_complete',

// In SDKEventMap
[SdkEvents.VERIFICATION_COMPLETE]: {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  error?: { code: string; message: string };
};
```

Person 1's `SelfClientProvider` subscribes:

```typescript
selfClient.on(SdkEvents.VERIFICATION_COMPLETE, (result) => {
  lifecycle.setResult(result);
});
```

---

## Web Fallback Adapter Implementations

The optimized architecture moves several adapters from "bridge to native" to "web-native fallback" — these run entirely inside the WebView using standard web APIs, eliminating unnecessary native round-trips. This section describes what Person 3 needs to implement.

### a. IndexedDB Documents Adapter

A web-native implementation of `DocumentsAdapter` using IndexedDB. This replaces the bridge-to-native approach for document storage in the WebView context. Documents are stored as encrypted JSON blobs.

```typescript
// src/adapters/browser/documents.ts
export function createIndexedDBDocumentsAdapter(): DocumentsAdapter {
  // Uses IndexedDB 'self-sdk-documents' database
  // Object store: 'documents' (key: document ID, value: encrypted JSON blob)
  // Object store: 'catalog' (key: 'catalog', value: DocumentCatalog JSON)
  //
  // Implements:
  //   loadDocumentCatalog() → reads from 'catalog' store
  //   saveDocumentCatalog(catalog) → writes to 'catalog' store
  //   loadDocumentById(id) → reads from 'documents' store by key
  //   saveDocument(id, data) → writes encrypted blob to 'documents' store
  //   deleteDocument(id) → removes entry from 'documents' store
  //
  // IndexedDB is available in all modern WebViews (Android WebView, WKWebView).
  // Data persists across WebView sessions within the same origin.
}
```

**Implementation notes:**
- Use the `idb` npm package (or raw IndexedDB API) for async key-value access
- Database name: `'self-sdk-documents'`, version `1`
- Two object stores: `'documents'` and `'catalog'`
- Document encryption is handled by the caller (SDK core) before passing to `saveDocument` — the adapter stores opaque blobs

### b. Web Crypto Adapter Enhancement

The existing `CryptoAdapter` has two methods with different bridging requirements:

- **`hash()`**: Should use the Web Crypto API (`crypto.subtle.digest`). This is a pure computation with no key material involved — no reason to bridge to native.
- **`sign()`**: Must still bridge to native. Signing requires private key access, which is gated behind biometric authentication on the native side. The WebView does not have direct access to keychain-stored keys.

```typescript
// src/adapters/browser/crypto.ts
export function createWebCryptoAdapter(): Partial<CryptoAdapter> {
  return {
    hash: async (algorithm: string, data: Uint8Array): Promise<Uint8Array> => {
      // Map algorithm string to Web Crypto algorithm identifier
      // 'sha-256' → 'SHA-256', 'sha-1' → 'SHA-1', etc.
      const buf = await crypto.subtle.digest(algorithm.toUpperCase(), data);
      return new Uint8Array(buf);
    },
    // sign() is NOT provided here — it must come from the bridge adapter
    // because it requires biometric-gated native key access.
  };
}

// Usage in SelfClientProvider: merge web crypto hash with bridge-backed sign
// const crypto = {
//   ...createBridgeCryptoAdapter(bridge),  // provides sign()
//   ...createWebCryptoAdapter(),            // overrides hash() with Web Crypto
// };
```

### c. Console/Fetch Analytics Adapter

A web-native implementation of `AnalyticsAdapter`. In development, events log to console. In production, events can be sent via `fetch` to an analytics endpoint.

```typescript
// src/adapters/browser/analytics.ts
export function createWebAnalyticsAdapter(options?: {
  endpoint?: string;
  debug?: boolean;
}): AnalyticsAdapter {
  const { endpoint, debug = false } = options ?? {};

  const send = (event: string, payload: Record<string, unknown>) => {
    if (debug) {
      console.log(`[analytics] ${event}`, payload);
    }
    if (endpoint) {
      // Fire-and-forget — no await, no error handling needed
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload, timestamp: Date.now() }),
      }).catch(() => {}); // Silently ignore failures
    }
  };

  return {
    trackEvent: (event, payload) => send(event, payload ?? {}),
    trackNfcEvent: (name, props) => send(`nfc:${name}`, props ?? {}),
    logNFCEvent: (level, msg, ctx, details) =>
      send(`nfc:log:${level}`, { msg, ctx, details }),
  };
}
```

### d. No-Op Haptic Adapter

Haptic feedback is not critical in the WebView context. Provide a no-op implementation.

```typescript
// src/adapters/browser/haptic.ts
export function createNoOpHapticAdapter(): HapticAdapter {
  return {
    trigger: () => {}, // Silent no-op
  };
}
```

---

## Files You Will Modify

| File | Change | Risk |
|------|--------|------|
| `src/proving/provingMachine.ts` | Remove `Platform` import, replace `__DEV__` with `config.debug`, optionally refactor WS to use adapter | **High** — core proving logic, must not regress |
| `src/types/public.ts` | Add `platform`, `debug` to `Config`; add `onOpen` to `WsConn`; add `network` to `SelfClient`; add `SdkInitialConfig` | **Medium** — type-only changes, but public API |
| `src/constants/fonts.ts` | Remove `Platform` import, export static tokens | **Medium** — affects font rendering on Android |
| `src/nfc/index.ts` | Remove `Platform.OS`, get platform from `SelfClient` context | **Low** — logging only |
| `src/stores/selfAppStore.tsx` | Make Socket.IO conditional | **Medium** — affects QR flow in Self Wallet |
| `src/types/events.ts` | Add `VERIFICATION_COMPLETE` event | **Low** — additive |
| `src/client.ts` | Wire new config fields, expose `network` adapter | **Low** — additive |
| `src/browser.ts` | Audit and clean up exports | **Low** — web-only entry |
| `src/config/defaults.ts` | Add defaults for `platform`, `debug` | **Low** — additive |
| `package.json` | Update `exports` field for conditional entry points | **Medium** — affects bundler resolution |

---

## Files You Will NOT Modify

| File | Why |
|------|-----|
| `src/adapters/react-native/*` | RN-specific, never imported by WebView |
| `src/components/*` | RN UI components, Person 1 builds web equivalents |
| `src/flows/*` | RN screen flows, replaced by Person 1's webview-app screens |
| `src/bridge/nativeEvents.native.ts` | RN-only, `.native.ts` suffix means bundlers skip it on web |
| `src/haptic/*` | Delegated to adapters in WebView (bridge fire-and-forget) |
| `src/layouts/*` | RN layout components |

---

## Chunking Guide (Claude Code Sessions)

### Chunk 3A: Config & Platform Abstraction (start here — no dependencies)

**Goal:** Remove all `Platform` and `__DEV__` imports from core logic.

**Steps:**
1. Add `platform` and `debug` fields to `Config` in `src/types/public.ts`
2. Update `src/config/defaults.ts` with sensible defaults
3. Update `src/proving/provingMachine.ts`:
   - Remove `import { Platform } from 'react-native'`
   - Replace `getPlatform()` to read from `selfClient.config.platform`
   - Replace `__DEV__` with `selfClient.config.debug`
4. Update `src/constants/fonts.ts` — remove `Platform` import
5. Update `src/nfc/index.ts` — remove `Platform.OS` from logging
6. Update `src/client.ts` — wire new config fields
7. Validate: existing RN app tests still pass, `tsc --noEmit` clean

**Estimated effort:** Small. Mostly search-and-replace with config wiring.

### Chunk 3B: Browser Entry Point & Package Exports (after 3A)

**Goal:** Clean browser entry point that excludes all RN-specific code.

**Steps:**
1. Audit `src/browser.ts` — ensure no transitive `react-native` imports
2. Update `package.json` `exports` field with conditional `react-native` vs `import` resolution
3. Verify that `webview-app` can import core types, stores, and `createSelfClient` without pulling in RN
4. Validate: `vite build` in `webview-app` produces no `react-native` references in bundle

**Estimated effort:** Small-medium. May require tracing import chains to find hidden RN deps.

### Chunk 3C: WebView Lifecycle Events (after 3A)

**Goal:** Define the integration points between the proving machine and the WebView host.

**Steps:**
1. Add `VERIFICATION_COMPLETE` event to `src/types/events.ts` and `SDKEventMap`
2. Add `SdkInitialConfig` and `VerificationRequest` types to `src/types/public.ts`
3. Emit `VERIFICATION_COMPLETE` in the proving machine on `completed` and `failure` states
4. Document for Person 1 how `SelfClientProvider` subscribes and calls `lifecycle.setResult()`
5. Document for Person 2 what `LifecycleBridgeHandler.getConfig()` should return
6. Validate: type-check clean, no runtime changes to existing flows

**Estimated effort:** Small. Mostly type definitions and a few `emit()` calls.

### Chunk 3D: WsAdapter Integration (after 3A, optional)

**Goal:** Refactor proving machine to use `NetworkAdapter.ws` instead of raw `WebSocket`.

**Steps:**
1. Add `onOpen` to `WsConn` interface in `src/types/public.ts`
2. Expose `network` on `SelfClient` interface and in `client.ts`
3. Refactor `initTeeConnection` in `provingMachine.ts` to use `selfClient.network.ws.connect()`
4. Refactor `_reconnectTeeWebSocket` similarly
5. Update `_closeConnections` to use `WsConn.close()`
6. Create a default `WsAdapter` implementation using browser `WebSocket` in `src/adapters/browser/ws.ts`
7. Validate: proving flow works end-to-end in RN app

**Estimated effort:** Medium-large. The proving machine WebSocket handling is complex with reconnection logic. This chunk is optional if raw `WebSocket` works fine in the WebView (it does).

### Chunk 3E: Conditional SelfApp Store (after 3A)

**Goal:** Make the Socket.IO relay in `selfAppStore` optional.

**Steps:**
1. Make `startAppListener` skip Socket.IO when no relay URL is provided
2. Add a `setSelfApp` method that accepts a pre-built `SelfApp` payload (for WebView mode where the host provides the request directly)
3. Validate: QR scanning flow in RN app still works, WebView mode can set SelfApp without Socket.IO

**Estimated effort:** Small. The store already has `setSelfApp()`.

### Chunk 3F: Web Fallback Adapter Implementations (after 3B)

**Goal:** Create web-native adapter implementations for use inside the WebView, eliminating unnecessary bridge round-trips for documents, crypto hashing, and analytics.

**Steps:**
1. Create `src/adapters/browser/documents.ts` — `createIndexedDBDocumentsAdapter()` using IndexedDB for document storage
2. Create `src/adapters/browser/crypto.ts` — `createWebCryptoAdapter()` providing `hash()` via `crypto.subtle.digest`
3. Create `src/adapters/browser/analytics.ts` — `createWebAnalyticsAdapter()` using `console.log` (dev) and `fetch` (prod)
4. Create `src/adapters/browser/haptic.ts` — `createNoOpHapticAdapter()` as a silent no-op
5. Create `src/adapters/browser/index.ts` — barrel export for all web fallback adapters
6. Update `src/browser.ts` to re-export all web fallback adapter factories
7. Add unit tests for each adapter: `tests/adapters/browser/documents.test.ts`, etc.
8. Validate: test harness works with web fallback adapters instead of mock adapters

**Estimated effort:** Medium. IndexedDB adapter requires async database initialization and error handling. Web Crypto and analytics adapters are straightforward.

**Dependencies:** Chunk 3B must be complete (browser entry point exists to export from).

---

## Dependency Graph

```
Chunk 3A (config + platform)
  ├──→ Chunk 3B (browser entry point)
  │     └──→ Chunk 3F (web fallback adapters)
  ├──→ Chunk 3C (lifecycle events)
  ├──→ Chunk 3D (WsAdapter refactor) [optional]
  └──→ Chunk 3E (conditional selfAppStore)

Person 1 (screens)  ←── depends on ──→  Person 3 (SDK core)
Person 2 (KMP)      ←── contract via ──→ Person 3 (lifecycle types)
```

Person 1 can start building screens before Person 3 is complete — they just mock the `useSelfClient()` return. But Person 1 **cannot ship a working WebView** until Person 3's Chunks 3A + 3B + 3C are done.

Person 2 is independent, but Chunk 3C defines the `VerificationRequest` type and lifecycle event shapes that Person 2's `LifecycleBridgeHandler` must implement.

---

## Validation Plan

### After each chunk:

```bash
# Type-check (must be clean)
cd packages/mobile-sdk-alpha && npx tsc --noEmit

# Existing tests (must pass — no regressions)
cd packages/mobile-sdk-alpha && npm test

# Verify no react-native in browser entry
cd packages/mobile-sdk-alpha && npx madge --no-spinner src/browser.ts | grep -i "react-native"
# Should return nothing
```

### Integration validation (after all chunks):

```bash
# WebView app builds without RN
cd packages/webview-app && npx vite build
# Check bundle for RN references
grep -r "react-native" packages/webview-app/dist/ && echo "FAIL: RN leaked" || echo "PASS"

# RN app still works (manual)
# Run the Self Wallet app, complete a full onboarding + disclosure flow
```

---

## Key Reference Files

| File | What to Look At |
|------|-----------------|
| `packages/mobile-sdk-alpha/src/client.ts` | `createSelfClient()` factory — this is the integration point |
| `packages/mobile-sdk-alpha/src/types/public.ts` | All adapter interfaces and `SelfClient` type |
| `packages/mobile-sdk-alpha/src/context.tsx` | `SelfClientProvider` and `useSelfClient()` — React integration |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` | Proving state machine — largest file, most RN contamination |
| `packages/mobile-sdk-alpha/src/stores/` | Zustand stores (protocol, selfApp, mrz) |
| `packages/mobile-sdk-alpha/src/browser.ts` | Existing browser entry point (incomplete) |
| `packages/mobile-sdk-alpha/src/constants/` | Colors (clean), fonts (needs fix) |
| `packages/mobile-sdk-alpha/src/documents/utils.ts` | Document CRUD — clean, uses adapters |
| `packages/mobile-sdk-alpha/package.json` | Exports and dependencies |

---

## Relationship to Person 1 and Person 2

```
  CODE IMPORTS                    RUNTIME BRIDGE (postMessage)
  ────────────                    ────────────────────────────

  Person 1 (webview-app)          Person 3 (webview engine)           Person 2 (kmp-sdk)
  ───────────────────────         ─────────────────────────           ─────────────────
  Screens (React + Tamagui)       Core logic (proving, stores)        Native handlers
        │                               │                                   │
        │ useSelfClient()               │ Adapters interface                │ BridgeHandlers
        │ useProvingStore()             │ createSelfClient(adapters)        │ MessageRouter
        │                               │ SdkEvents                        │
        ├── imports ──────────────────→ │                                   │
        │                               │                                   │
        │ implements adapter            │                                   │
        │ interfaces from P3:           │                                   │
        │  NFCScannerAdapter            │                                   │
        │  CryptoAdapter                │                                   │
        │  AuthAdapter             ─ ─ ─ ─ ─ WebView bridge ─ ─ ─ ─ ─     │
        │  DocumentsAdapter        :    │    (postMessage /              :  │
        │  AnalyticsAdapter        :    │     evaluateJavascript)        :  │
        │                          :    │                                :  │
        │ adapters call bridge ──→ : ───────────────────────────────────→ : │
        │                          :    │                                :  │
        │                          : ←─────────────────────────────────── : │
        │                          ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
        │                               │                                   │
        │ lifecycle events              │                                   │
        │←── VERIFICATION_COMPLETE ────←│                                   │
        │── lifecycle.setResult() ──→ bridge ─────────────────────────────→ │
        │←── lifecycle.getConfig() ←─ bridge ←────────────────────────────← │
```

**Key principle: Person 1 only imports from Person 3.** Person 1 never imports from Person 2.

- **Code imports** (left side): Person 1 imports adapter interfaces, hooks, and `createSelfClient` from Person 3. Person 1 *implements* adapter interfaces that internally use the bridge protocol.
- **Runtime bridge** (right side): The bridge is a message-passing boundary (`postMessage` / `evaluateJavascript`), not a code dependency. Person 1's adapter implementations send bridge messages; Person 2's handlers receive them. Neither side imports code from the other.
- **Person 3 delivers the engine.** It defines all contracts (adapter interfaces, event types, lifecycle types) and contains the core logic. Person 1 and Person 2 only couple to Person 3's interfaces — never to each other.

---

## Test Plan & Integration Harness

The core challenge: Person 3 sits in the middle. You can't wait for Person 1's screens or Person 2's native shell to validate your work. You need a way to exercise the full SDK logic in a browser **now**, while the other workstreams are still in progress.

### Existing Test Infrastructure

`mobile-sdk-alpha` already has solid test coverage:

| Path | What |
|------|------|
| `tests/proving/provingMachine.test.ts` | State machine transitions with actor mocks |
| `tests/proving/provingMachine.integration.test.ts` | Integration flow |
| `tests/proving/actorMock.ts` | Minimal XState actor stub (`send`, `subscribe`, `emitState`) |
| `tests/proving/internal/statusHandlers.test.ts` | Pure function tests for TEE status parsing |
| `tests/proving/internal/websocketHandlers.test.ts` | WS message handling |
| `tests/proving/internal/payloadGenerator.test.ts` | Encrypted payload generation |
| `tests/utils/testHelpers.ts` | Mock adapters (`mockScanner`, `mockNetwork`, `mockCrypto`, `mockDocuments`, `mockAuth`, `mockNavigation`) |
| `tests/mock/generator.test.ts` | Mock document generation (534 lines) |
| `src/mock/generator.ts` | `generateMockDocument()` — creates valid signed mock passports |

The test runner is Vitest with jsdom environment. The `tests/setup.ts` already mocks React Native modules (`Platform.OS = 'web'`).

### Level 1: Unit Tests (run in Vitest, no browser needed)

These validate Person 3's changes don't break existing logic. **Run after every chunk.**

```bash
cd packages/mobile-sdk-alpha && npx vitest run
```

**Add these new tests:**

#### `tests/proving/provingMachine.platform.test.ts` — Config-based platform detection

```typescript
// After Chunk 3A: verify Platform import is gone, config.platform is used
import { createSelfClient, createListenersMap } from '../../src/client';
import { mockAdapters } from '../utils/testHelpers';

describe('platform via config', () => {
  it('uses config.platform for proof context', () => {
    const { map } = createListenersMap();
    const client = createSelfClient({
      config: { platform: 'webview' },
      adapters: mockAdapters,
      listeners: map,
    });
    // Verify proof context uses 'webview' not 'ios'/'android'
    // (spy on emit for PROOF_EVENT and check context.platform)
  });

  it('defaults platform to "unknown" when not provided', () => {
    const { map } = createListenersMap();
    const client = createSelfClient({
      config: {},
      adapters: mockAdapters,
      listeners: map,
    });
    // Verify context.platform is 'unknown'
  });
});
```

#### `tests/proving/provingMachine.debug.test.ts` — Debug mode replaces __DEV__

```typescript
// After Chunk 3A: verify __DEV__ is gone, config.debug is used
describe('debug mode via config', () => {
  it('relaxes attestation checks when debug=true', () => { /* ... */ });
  it('enforces PCR0 mapping when debug=false', () => { /* ... */ });
});
```

#### `tests/browser-entry.test.ts` — Browser export tree-shaking

```typescript
// After Chunk 3B: verify browser entry has no RN imports
import { describe, it, expect } from 'vitest';
import * as browserExports from '../../src/browser';

describe('browser entry point', () => {
  it('exports createSelfClient', () => {
    expect(browserExports.createSelfClient).toBeDefined();
  });
  it('exports useSelfClient', () => {
    expect(browserExports.useSelfClient).toBeDefined();
  });
  it('exports useProvingStore', () => {
    expect(browserExports.useProvingStore).toBeDefined();
  });
  // Verify key types are re-exported
});
```

### Level 2: Browser Smoke Test Harness (Vite mini-app)

This is the key tool for Person 3. A **minimal Vite app** that exercises `createSelfClient` with mock adapters in a real browser — no Person 1 screens, no Person 2 native shell needed.

#### Create: `packages/mobile-sdk-alpha/test-harness/`

```
packages/mobile-sdk-alpha/test-harness/
  index.html
  main.tsx
  mock-adapters.ts      # Browser-compatible mock adapters
  ProveFlowPanel.tsx    # UI to drive proving state machine
  StoreInspector.tsx    # Shows live zustand state
  vite.config.ts
  package.json          # private, not published
```

#### `package.json`

```json
{
  "name": "@selfxyz/sdk-test-harness",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@selfxyz/mobile-sdk-alpha": "workspace:^",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.1.0",
    "typescript": "^5.9.3"
  }
}
```

#### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force browser entry point
      'react-native': 'react-native-web',
    },
  },
  define: { global: 'globalThis' },
});
```

#### `mock-adapters.ts` — Full mock adapter set for browser

```typescript
import type { Adapters, DocumentCatalog, IDDocument } from '@selfxyz/mobile-sdk-alpha';

// In-memory document store (survives page navigation, not reload)
const documentStore = new Map<string, IDDocument>();
let catalog: DocumentCatalog = { documents: [] };

export function createMockAdapters(): Adapters {
  return {
    scanner: {
      // Mock NFC: resolves after 2s delay simulating a scan
      scan: async (opts) => {
        console.log('[mock-nfc] scan requested', opts);
        await new Promise(r => setTimeout(r, 2000));
        // Use generateMockDocument() from the SDK itself
        const { generateMockDocument } = await import('@selfxyz/mobile-sdk-alpha');
        const doc = await generateMockDocument({
          age: 30,
          expiryYears: 10,
          isInOfacList: false,
          selectedAlgorithm: 'sha256 rsa 65537 2048',
          selectedCountry: 'USA',
          selectedDocumentType: 'mock_passport',
        });
        return { passportData: doc as any };
      },
    },
    crypto: {
      hash: async (input) => {
        const buf = await crypto.subtle.digest('SHA-256', input);
        return new Uint8Array(buf);
      },
      sign: async (data, keyRef) => {
        console.log('[mock-crypto] sign requested', { keyRef, dataLen: data.length });
        // Return dummy signature
        return new Uint8Array(64);
      },
    },
    network: {
      http: { fetch: globalThis.fetch.bind(globalThis) },
      ws: {
        connect: (url) => {
          console.log('[mock-ws] connect', url);
          const ws = new WebSocket(url);
          return {
            send: (d) => ws.send(d),
            close: () => ws.close(),
            onMessage: (cb) => ws.addEventListener('message', (e) => cb(e.data)),
            onError: (cb) => ws.addEventListener('error', cb),
            onClose: (cb) => ws.addEventListener('close', cb),
          };
        },
      },
    },
    auth: {
      getPrivateKey: async () => {
        // Deterministic test key (DO NOT use in production)
        return 'deadbeef'.repeat(8);
      },
    },
    documents: {
      loadDocumentCatalog: async () => catalog,
      saveDocumentCatalog: async (c) => { catalog = c; },
      loadDocumentById: async (id) => documentStore.get(id) ?? null,
      saveDocument: async (id, data) => { documentStore.set(id, data); },
      deleteDocument: async (id) => { documentStore.delete(id); },
    },
    navigation: {
      goBack: () => console.log('[mock-nav] goBack'),
      goTo: (route, params) => console.log('[mock-nav] goTo', route, params),
    },
    analytics: {
      trackEvent: (event, payload) => console.log('[analytics]', event, payload),
      trackNfcEvent: (name, props) => console.log('[analytics:nfc]', name, props),
      logNFCEvent: (level, msg, ctx, details) => console.log(`[nfc:${level}]`, msg, details),
    },
  };
}
```

#### `ProveFlowPanel.tsx` — Drive the proving machine from a browser

```tsx
import { useState, useEffect } from 'react';
import {
  createSelfClient,
  createListenersMap,
  SdkEvents,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { createMockAdapters } from './mock-adapters';

export function ProveFlowPanel() {
  const [client, setClient] = useState<SelfClient | null>(null);
  const [provingState, setProvingState] = useState<string>('not-initialized');
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    setLogs(prev => [`[${new Date().toISOString().slice(11,19)}] ${msg}`, ...prev].slice(0, 200));
  };

  // Initialize client once
  useEffect(() => {
    const { map, addListener } = createListenersMap();

    // Listen to all SDK events
    addListener(SdkEvents.PROOF_EVENT, (payload) => {
      log(`PROOF: ${payload.event} [${payload.level}] ${JSON.stringify(payload.details ?? {})}`);
    });

    const c = createSelfClient({
      config: { platform: 'webview-harness', debug: true },
      adapters: createMockAdapters(),
      listeners: map,
    });
    setClient(c);
    log('SelfClient created');

    // Subscribe to proving state changes
    const unsub = c.useProvingStore.subscribe((state) => {
      setProvingState(state.currentState ?? 'idle');
      log(`State → ${state.currentState}`);
    });

    return () => unsub();
  }, []);

  if (!client) return <div>Loading...</div>;

  const provingStore = client.useProvingStore;

  return (
    <div style={{ fontFamily: 'monospace', padding: 20 }}>
      <h2>SDK Core Test Harness</h2>

      {/* Current State */}
      <div style={{ fontSize: 24, margin: '16px 0', padding: 12, background: '#f0f0f0', borderRadius: 8 }}>
        Proving State: <strong>{provingState}</strong>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => {
          log('Starting DSC flow...');
          provingStore.getState().init(client, 'dsc');
        }}>
          Init DSC
        </button>
        <button onClick={() => {
          log('Starting Register flow...');
          provingStore.getState().init(client, 'register');
        }}>
          Init Register
        </button>
        <button onClick={() => {
          log('Starting Disclose flow...');
          provingStore.getState().init(client, 'disclose');
        }}>
          Init Disclose
        </button>
        <button onClick={() => {
          log('User confirmed');
          provingStore.getState().setUserConfirmed(client);
        }}>
          Confirm (user tap)
        </button>
      </div>

      {/* Store Inspector */}
      <details open>
        <summary><strong>Proving Store Snapshot</strong></summary>
        <pre style={{ background: '#1a1a1a', color: '#0f0', padding: 12, overflow: 'auto', maxHeight: 300 }}>
          {JSON.stringify({
            currentState: provingStore.getState().currentState,
            circuitType: provingStore.getState().circuitType,
            env: provingStore.getState().env,
            uuid: provingStore.getState().uuid,
            userConfirmed: provingStore.getState().userConfirmed,
            hasPassportData: !!provingStore.getState().passportData,
            hasSharedKey: !!provingStore.getState().sharedKey,
            error_code: provingStore.getState().error_code,
            reason: provingStore.getState().reason,
          }, null, 2)}
        </pre>
      </details>

      {/* Event Log */}
      <details open>
        <summary><strong>Event Log</strong> ({logs.length})</summary>
        <div style={{ background: '#1a1a1a', color: '#ccc', padding: 12, maxHeight: 400, overflow: 'auto', fontSize: 12 }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </details>
    </div>
  );
}
```

#### `main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProveFlowPanel } from './ProveFlowPanel';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveFlowPanel />
  </React.StrictMode>,
);
```

#### `index.html`

```html
<!DOCTYPE html>
<html>
<head><title>SDK Core Test Harness</title></head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

### How to Use the Harness

```bash
cd packages/mobile-sdk-alpha/test-harness
yarn install
yarn dev
# → http://localhost:5174
```

**What you can test:**

| Action | What it validates |
|--------|-------------------|
| Page loads without errors | Browser entry point works, no RN imports leak |
| Click "Init DSC" | `createSelfClient` works, proving machine initializes, `generateMockDocument` produces a valid document in browser |
| Watch state transitions | `idle → parsing_id_document → fetching_data → ...` proves the state machine runs in browser context |
| Check console for `[mock-*]` logs | Adapter calls flow correctly through `SelfClient` to mock implementations |
| State reaches `validating_document` | Protocol store fetches work (real network calls to Self API) |
| State reaches `init_tee_connexion` | WebSocket creation works in browser |
| State reaches `error` with `debug: true` | Attestation check uses `config.debug` instead of `__DEV__` |
| `VERIFICATION_COMPLETE` event fires | Lifecycle event wiring works (Chunk 3C) |

**What will fail (and that's OK):**
- TEE connection will fail (no real TEE endpoint for mock passports) — you'll see the state hit `error` after `init_tee_connexion`. This is expected. The point is validating the **path to that point** works in a browser.
- NFC scan returns mock data — not a real passport. This is intentional.

### Level 3: Integration Gate (before merging with Person 1 / Person 2)

Once all three workstreams converge, run these checks:

#### Gate 1: Bundle Purity

```bash
# Verify no react-native leaked into Vite build
cd packages/webview-app && npx vite build 2>&1
# Check the bundle
grep -r "NativeModules\|NativeEventEmitter\|requireNativeComponent" dist/ && echo "FAIL" || echo "PASS"
```

#### Gate 2: Proving State Machine in WebView

Using Person 1's webview-app + Person 2's KMP test app (or the dev server):

1. Load the WebView in an Android emulator or iOS simulator
2. Open Chrome DevTools (android) or Safari Inspector (ios) on the WebView
3. In console: `window.SelfNativeBridge` should exist (bridge initialized)
4. Navigate to the onboarding flow
5. Watch console for proving state transitions:
   ```
   State → parsing_id_document
   State → fetching_data
   State → validating_document
   State → init_tee_connexion
   State → ready_to_prove
   ```
6. Each transition should produce `[analytics]` and `PROOF_EVENT` logs

#### Gate 3: Full End-to-End (requires physical device + passport)

1. Build KMP SDK with bundled WebView assets
2. Install test app on physical Android device with NFC
3. Tap "Launch Verification"
4. Scan a real passport
5. Complete disclosure flow
6. Verify `VERIFICATION_COMPLETE` event reaches the KMP host via `lifecycle.setResult()`

#### Gate 4: RN App Regression

```bash
# Existing Self Wallet app must still work
cd app && npx react-native run-android
# Complete: onboarding → scan passport → register → disclose
# All flows must behave identically to before Person 3's changes
```

### Test Matrix

| Test | When | What it catches | Who runs it |
|------|------|-----------------|-------------|
| `vitest run` | After every change | Logic regressions | Person 3 (CI) |
| `tsc --noEmit` | After every change | Type errors | Person 3 (CI) |
| Test harness `vite dev` | After Chunks 3A+3B | RN imports leaking into browser, `Platform`/`__DEV__` not removed | Person 3 |
| Test harness "Init DSC" | After Chunks 3A+3C | Proving machine runs in browser, events fire | Person 3 |
| `madge src/browser.ts` | After Chunk 3B | Circular deps, transitive RN imports | Person 3 (CI) |
| Bundle purity check | Before integration | Stray RN code in Vite output | Person 1 + 3 |
| WebView DevTools | Integration phase | Bridge + SDK + native working together | All three |
| Physical device scan | Final validation | Real NFC + TEE + proving | All three |
| RN app regression | Before merge | Existing app not broken | Person 3 |

---

## Important Notes

1. **No regressions in the RN app.** Every change must be backwards-compatible. The existing Self Wallet app must continue working exactly as before.
2. **`@selfxyz/common` is out of scope.** If `common` has `Buffer` or Node-specific issues, file those separately. Person 3 only owns `mobile-sdk-alpha`.
3. **Don't refactor what works.** The adapter architecture is sound. The proving machine state machine is correct. You're removing platform contamination, not redesigning the system.
4. **Chunk 3D is optional.** Raw `WebSocket` works in the browser. The `WsAdapter` refactor is a cleanliness improvement, not a blocker. Skip it if time is tight.
5. **Coordinate with Person 1 on types.** When you add `SdkInitialConfig` or `VERIFICATION_COMPLETE`, tell Person 1 so they can wire it into `SelfClientProvider` and the lifecycle adapter.
6. **Coordinate with Person 2 on lifecycle.** When you define `VerificationRequest`, tell Person 2 so `LifecycleBridgeHandler.getConfig()` returns the right shape.
7. **The test harness is your primary development tool.** Keep it running while you work. Every change should be visible in the harness immediately via Vite HMR.

---

## Completion Status

*Audit date: 2026-02-17*

### Chunk Status

| Chunk | Description | Status |
|-------|-------------|--------|
| 3A | Config & Platform Abstraction | **Done** |
| 3B | Browser Entry Point & Package Exports | **Done** |
| 3C | WebView Lifecycle Events | **Done** |
| 3D | WsAdapter Integration | **Skipped** (optional, non-blocking — raw `WebSocket` works in browser) |
| 3E | Conditional SelfApp Store | **Done** |
| 3F | Web Fallback Adapter Implementations | **Pending** — IndexedDB documents, Web Crypto hash, console/fetch analytics, no-op haptic |

4 of 6 chunks complete. Chunk 3D is explicitly optional per spec design — the proving machine's raw `WebSocket` usage works natively in browser/WebView contexts. Refactoring to `WsAdapter` remains a cleanliness improvement that can be picked up later for testability and host-level interception. **Chunk 3F is pending work** — it implements the web-native fallback adapters that allow the WebView to handle documents, crypto hashing, and analytics without bridging to native.

### What's Left

**Chunk 3F — Web Fallback Adapter Implementations (blocking for WebView integration)**

The WebView engine needs browser-native adapters so it can handle documents, crypto hashing, and analytics without bridging to native for every operation. None of these exist yet:

| Adapter | File to Create | Implementation |
|---------|---------------|----------------|
| `createIndexedDBDocumentsAdapter()` | `src/adapters/browser/documents.ts` | IndexedDB-backed `DocumentsAdapter` with two object stores (`documents`, `catalog`) |
| `createWebCryptoAdapter()` | `src/adapters/browser/crypto.ts` | `crypto.subtle.digest` for `hash()`, `sign()` left to bridge adapter |
| `createWebAnalyticsAdapter()` | `src/adapters/browser/analytics.ts` | `console.log` (dev) + `fetch` (prod) fire-and-forget |
| `createNoOpHapticAdapter()` | `src/adapters/browser/haptic.ts` | Silent no-op |
| Barrel export | `src/adapters/browser/index.ts` | Re-exports all browser adapter factories |

Once created, `src/browser.ts` must re-export these factories so `webview-app` can import them.

**Minor items from PR #1765 review:**

| Item | Description | Location |
|------|-------------|----------|
| `proof` field never populated | `VERIFICATION_COMPLETE` event type includes `proof?: unknown` but all three emission sites (`completed`, `failure`, `error` states in `provingMachine.ts`) never pass proof data. Consumers will get `undefined`. Remove the field or populate it once real proof data is available. | `src/proving/provingMachine.ts` — `emitVerificationComplete()` helper |
| Remaining `__DEV__` references | PR replaced `__DEV__` with `config.debug` in attestation validation but there may be other `__DEV__` references in the proving machine or elsewhere. Audit needed. | `src/proving/provingMachine.ts` |
| `plexMono` font hardcoded | Changed from `Platform.OS === 'ios' ? 'IBM Plex Mono' : 'IBMPlexMono-Regular'` to just `'IBMPlexMono-Regular'`. Architecturally correct (logical tokens) but may break iOS font rendering if the PostScript name differs. Needs verification on iOS device or a platform-aware `getFontFamily()` factory. | `src/constants/fonts.ts` |

**Chunk 3F implementation notes (from PR #1765 CodeRabbit review):**

| Item | Description | Action |
|------|-------------|--------|
| SHA algorithm name mapping | `crypto.subtle.digest` requires hyphenated identifiers (`"SHA-256"`, not `"sha256"`). The spec's `.toUpperCase()` transform is insufficient — implementers must normalize input (e.g. `sha256` → `SHA-256`) before calling `crypto.subtle.digest`. | Fix in `createWebCryptoAdapter()` implementation |
| `fake-indexeddb` needed for tests | jsdom does not provide IndexedDB. Chunk 3F unit tests for `createIndexedDBDocumentsAdapter()` require `fake-indexeddb` as a devDependency and a Vitest setup file to install `fake-indexeddb/auto`. | Add to devDependencies when implementing Chunk 3F |

### SDK vs App Gap Summary

During audit, the following gaps were identified where the RN app (`app/`) reimplements functionality that the SDK (`mobile-sdk-alpha`) should ideally provide. These gaps define the backlog for future convergence specs.

**Gaps where the app reimplements what the SDK should provide:**

| Gap | App Code | SDK Has | Migration Priority |
|-----|----------|---------|-------------------|
| NFC scanner | `app/src/integrations/nfc/` (2 files, custom NativeModules) | `reactNativeScannerAdapter` (incomplete) | **P1** — both WebView and RN need this |
| Document storage | `app/src/providers/passportDataProvider.tsx` (972 lines, Keychain) | `DocumentsAdapter` interface only | **P1** — both need this |
| Auth adapter | `app/src/providers/authProvider.tsx` (Keychain + biometric) | `AuthAdapter` interface only | **P2** — WebView uses bridge, RN needs Keychain impl |
| SelfClient wiring | `app/src/providers/selfClientProvider.tsx` (509 lines) | No default adapter set | **P2** — `createReactNativeAdapters()` helper |
| Analytics adapter | `app/src/services/analytics.ts` (349 lines, Segment+Mixpanel) | `AnalyticsAdapter` interface only | **P3** — app-specific backends |
| Screen flows | `app/src/screens/` (70 screens) vs SDK (9 screens) | Onboarding partial, disclosing stubs | **P3** — large effort, defer |
| Navigation | `app/src/navigation/` (14 modules) | `NavigationAdapter` interface only | **P3** — inherently app-specific |

**Legitimately app-only (no migration needed):**

Points/rewards, referrals, cloud backup, push notifications, KYC (Sumsub), Starfall, app updates, deep links, settings, proof history DB, Turnkey wallet — these are Self Wallet app features with no SDK equivalent needed.
