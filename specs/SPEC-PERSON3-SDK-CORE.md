# Person 3: SDK Core Adaptation — Implementation Spec

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

## Design Principle: Adapter Interfaces Are Already Right

The good news: `mobile-sdk-alpha` already has a clean adapter architecture. The `Adapters` interface in `src/types/public.ts` defines the contract:

```typescript
interface Adapters {
  scanner: NFCScannerAdapter;    // NFC → bridge in WebView, NativeModules in RN
  crypto: CryptoAdapter;         // WebCrypto + bridge in WebView, native in RN
  network: NetworkAdapter;       // fetch() everywhere, WsAdapter for WebSocket
  auth: AuthAdapter;             // bridge in WebView, keychain in RN
  documents: DocumentsAdapter;   // bridge in WebView, encrypted storage in RN
  navigation: NavigationAdapter; // React Router in WebView, React Navigation in RN
  storage?: StorageAdapter;      // bridge in WebView, AsyncStorage in RN
  analytics?: AnalyticsAdapter;  // bridge (fire-and-forget) in WebView, native in RN
  clock?: ClockAdapter;          // Date.now() + setTimeout everywhere
  logger?: LoggerAdapter;        // console everywhere
}
```

`createSelfClient({ config, adapters, listeners })` already wires these in. Person 1's `SelfClientProvider` calls this with bridge-backed adapter implementations. The core logic (`provingMachine`, `protocolStore`, `documents/utils`) talks only through `SelfClient` — it never reaches for native APIs directly.

**Except where it does.** That's what you're fixing.

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

---

## Dependency Graph

```
Chunk 3A (config + platform)
  ├──→ Chunk 3B (browser entry point)
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
Person 1 (webview-app)                Person 3 (mobile-sdk-alpha)             Person 2 (kmp-sdk)
─────────────────────                  ──────────────────────────              ─────────────────
Screens (React + Tamagui)              Core logic (proving, stores)           Native handlers
  │                                      │                                      │
  │ useSelfClient()                      │ createSelfClient(adapters)           │ BridgeHandler
  │ useProvingStore()                    │ useProvingStore                      │ MessageRouter
  │                                      │ useProtocolStore                     │
  ├── imports ──────────────────────────→│                                      │
  │                                      │                                      │
  │ bridge adapters                      │ Adapters interface                   │
  ├── NFCScannerAdapter ─── bridge ─────────────────────────────────────────→ NfcBridgeHandler
  ├── CryptoAdapter ──────── bridge ─────────────────────────────────────────→ CryptoBridgeHandler
  ├── AuthAdapter ────────── bridge ─────────────────────────────────────────→ SecureStorageBridgeHandler
  ├── DocumentsAdapter ──── bridge ─────────────────────────────────────────→ DocumentsBridgeHandler
  ├── AnalyticsAdapter ──── bridge ─────────────────────────────────────────→ AnalyticsBridgeHandler
  │                                      │                                      │
  │ lifecycle                            │ SdkEvents.VERIFICATION_COMPLETE      │
  ├── lifecycle.setResult() ←── event ──←│                                      │
  │                                      │                                      │
  └── lifecycle.getConfig() ── bridge ──────────────────────────────────────→ LifecycleBridgeHandler
```

**Person 3 delivers the center column.** The adapter interfaces are the contract. Person 1 implements the left side (bridge adapters + screens). Person 2 implements the right side (native handlers). Person 3 makes the center work in both RN and browser contexts.

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
