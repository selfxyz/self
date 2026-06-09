# SDK Core Adaptation — Implementation Spec

> Last updated: 2026-03-12
> Owner: SDK Core
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Context

**What you own:**

- **`@selfxyz/mobile-sdk-alpha`** — the WebView engine (proving machine, stores, adapters, document management)
- **Browser entry point** (`src/browser.ts`) — the import path for WebView consumers, with zero `react-native` transitive imports
- **Web fallback adapter implementations** — IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics
- **Platform abstraction** for adapter interfaces — making the engine portable across RN and browser/WebView contexts

**Architecture context:**

```
┌──────────────────────────────────────┐
│         WebView UI                   │
│     (webview-app, screens, router)   │
│  Consumes: useSelfClient(), stores,  │
│  proving machine, adapter interfaces │
└──────────────────┬───────────────────┘
                   │
    ╔══════════════╧═══════════════╗
    ║  SDK Engine (YOU)            ║
    ║   (mobile-sdk-alpha)         ║
    ║  Proving machine (XState)    ║
    ║  Document store (Zustand)    ║
    ║  Adapter interfaces          ║
    ║  Two entry points:           ║
    ║  ├─ src/index.ts (RN)        ║
    ║  └─ src/browser.ts (WebView) ║
    ╚══════════════╤═══════════════╝
                   │
    ┌──────────────┴───────────────┐
    │     Shared Utilities         │
    │  (common/)                   │
    └──────────────────────────────┘
```

**Dependencies:**

| Direction     | Role / Package  | What                                                                        | Status |
| ------------- | --------------- | --------------------------------------------------------------------------- | ------ |
| **You need**  | Nobody          | Independent in Phase 1                                                      | Ready  |
| **Needs you** | WebView UI      | Adapter interfaces, core logic (`useSelfClient()`, stores, proving machine) | Active |
| **Needs you** | Paused RN shell | Browser entry point working in RN WebView context                           | Done   |

**Status:**

- [x] All chunks done (4A–4F) — config, browser entry, lifecycle events, conditional store, web fallbacks
- [x] Bridge-layer fallback duplicates removed
- [x] `generateKey()`/`getPublicKey()` exposed in `CryptoAdapter` and `BridgeCryptoAdapter` interfaces
- [ ] Reusable adapter assembly factories extracted from app provider

## Execution Model

- This file holds stable SDK core context and the follow-up backlog.
- PR-sized execution lives in [`plans/`](./plans/).
- For quick pickup, read the backlog and active plans first.

## Backlog

| ID        | Title                                                                        | Status | Priority | Depends On | Plan                                                                                       | PR  |
| --------- | ---------------------------------------------------------------------------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------------------ | --- |
| SC-01     | Consolidate bridge-layer fallback duplicates with engine-owned adapters      | Done   | High     | -          | [plans/SC-01-fallback-adapter-dedup.md](./plans/SC-01-fallback-adapter-dedup.md)           | -   |
| SC-02     | Expose `generateKey()` and `getPublicKey()` in bridge crypto adapter surface | Done   | Medium   | SC-01      | [plans/SC-02-crypto-bridge-surface.md](./plans/SC-02-crypto-bridge-surface.md)             | -   |
| SC-03     | Extract reusable app adapter factories for SelfClient assembly               | Done   | Medium   | SC-02      | [plans/SC-03-selfclient-adapter-assembly.md](./plans/SC-03-selfclient-adapter-assembly.md) | -   |
| SELF-2854 | Block Google USAT proof attempts when wallet has no high-security ID         | Ready  | High     | SELF-2862  | [plans/SELF-2854-google-usat-block.md](./plans/SELF-2854-google-usat-block.md)             | -   |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                       | IDs       | Status |
| ------------------------------------------------------------------------------------------ | --------- | ------ |
| [plans/SC-01-fallback-adapter-dedup.md](./plans/SC-01-fallback-adapter-dedup.md)           | SC-01     | Done   |
| [plans/SC-02-crypto-bridge-surface.md](./plans/SC-02-crypto-bridge-surface.md)             | SC-02     | Done   |
| [plans/SC-03-selfclient-adapter-assembly.md](./plans/SC-03-selfclient-adapter-assembly.md) | SC-03     | Done   |
| [plans/SELF-2854-google-usat-block.md](./plans/SELF-2854-google-usat-block.md)             | SELF-2854 | Ready  |

## Completion Checklist

- [ ] Backlog rows reflect the remaining follow-ups
- [ ] Each follow-up has a linked plan file
- [ ] Browser entry and RN compatibility invariants remain explicit

## Overview

You are making **`@selfxyz/mobile-sdk-alpha`** work cleanly inside a browser/WebView context. This package is the "WebView engine" — it contains all core logic (proving machine, stores, document management, protocol state) that the WebView UI consumes via `useSelfClient()`.

Today the package is entangled with React Native. Your job is to sever those ties so the same core logic runs in both:

- **React Native** (existing Self app app — must not regress)
- **Browser/WebView** (`@selfxyz/webview-app` running inside a host WebView or browser surface)

You are NOT building screens or native handlers. You are making the engine portable.

## Prerequisites

- Familiarity with XState (state machine library powering the proving machine)
- Familiarity with Zustand (state management for stores)
- `Adapters` = the adapter interfaces in `src/types/public.ts` that decouple core logic from platform APIs
- `Browser entry point` = `src/browser.ts`, the import path used by WebView consumers (must have zero `react-native` imports)
- Read [SDK Overview](../../OVERVIEW.md) for architecture context

## The Problem

`mobile-sdk-alpha` currently has React Native leaking into core logic:

| File                                           | Issue                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `src/proving/provingMachine.ts:6`              | `import { Platform } from 'react-native'` — `getPlatform()` helper    |
| `src/proving/provingMachine.ts:543,547`        | `__DEV__` global for TEE attestation validation                       |
| `src/constants/fonts.ts:10`                    | `Platform.OS === 'ios'` for font family selection                     |
| `src/nfc/index.ts:27`                          | `Platform.OS` for logging scan type                                   |
| `src/adapters/react-native/nfc-scanner.ts`     | `NativeModules`, `Platform`, `Buffer` — full RN NFC impl              |
| `src/bridge/nativeEvents.native.ts`            | `NativeEventEmitter`, `NativeModules`                                 |
| `src/haptic/index.ts`, `trigger.ts`            | `Platform`-dependent vibration APIs                                   |
| `src/components/MRZScannerView.tsx`            | `requireNativeComponent()`, `NativeModules`, `UIManager`              |
| `src/flows/onboarding/document-nfc-screen.tsx` | `NativeEventEmitter`, `NativeModules`, `Platform`, `Linking`          |
| `src/documents/useCountries.tsx`               | `react-native-localize` for device locale                             |
| `src/stores/selfAppStore.tsx`                  | `socket.io-client` (works in browser, but needs conditional creation) |

Some are in leaf files the WebView never imports. Others are in core files (proving machine, fonts, stores) the WebView **must** import.

## Design Principles

1. **Adapter interfaces are already right.** The `Adapters` interface in `src/types/public.ts` defines the contract. Don't redesign — remove contamination only.
2. **Keychain/SecureStorage must remain native-managed.** The WebView does NOT get direct keychain access. `StorageAdapter` and `AuthAdapter` always bridge to native. This is a security boundary.
3. **Web fallback adapters eliminate unnecessary bridge round-trips.** Documents (IndexedDB), crypto hashing (Web Crypto), analytics (console/fetch), and haptic (no-op) all run inside the WebView.
4. **Don't refactor what works.** The proving machine state machine is correct. The adapter architecture is sound. You're removing platform contamination, not redesigning.
5. **`@selfxyz/common` is out of scope.** If `common/` has Buffer or Node-specific issues, file those separately.

## Definition of Done

> **Done when:** `cd packages/mobile-sdk-alpha && npx vitest run` passes, `npx tsc --noEmit` is clean, `src/browser.ts` has zero transitive `react-native` imports (verified by `madge`), and the `webview-app` Vite build produces no `react-native` references in the output bundle.

## Scope of Work

### 1. Remove `Platform` from Core Logic

**`src/proving/provingMachine.ts`** — Lines 6, 214

```typescript
// BEFORE
import { Platform } from 'react-native';
const getPlatform = (): 'ios' | 'android' =>
  Platform.OS === 'ios' ? 'ios' : 'android';
```

**Fix:** Add a `platform` field to `Config` and default it based on environment:

```typescript
// AFTER — in src/types/public.ts, extend Config
export interface Config {
  // ... existing fields
  platform?: 'ios' | 'android' | 'web' | (string & {});
}

// In provingMachine.ts — replace getPlatform()
const getPlatform = (selfClient: SelfClient): string => {
  return selfClient.config.platform ?? 'unknown';
};
```

The RN app passes `platform: Platform.OS` in config. The WebView passes `platform: 'webview'`.

#### Input / Output

**Input:** `createSelfClient({ config: { platform: 'webview' }, adapters, listeners })`

**Expected Output:** Proof context uses `'webview'` as platform field.

**Edge case — no platform provided:**

```text
Input:  createSelfClient({ config: {}, adapters, listeners })
Output: Proof context uses 'unknown' as platform field
```

---

### 2. Remove `__DEV__` from Core Logic

**`src/proving/provingMachine.ts`** — Lines 543, 547

```typescript
// BEFORE
const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, __DEV__);
if (!__DEV__ && !pcr0Mapping) { ... }
```

**Fix:** Add a `debug` field to `Config`:

```typescript
// AFTER
const isDebug = selfClient.config.debug ?? false;
const { userPubkey, serverPubkey, imageHash, verified } = validatePKIToken(attestationToken, isDebug);
if (!isDebug && !pcr0Mapping) { ... }
```

The RN app passes `debug: __DEV__`. The WebView passes `debug: import.meta.env.DEV`.

#### Input / Output

**Input:** `config: { debug: true }` with invalid PCR0 mapping

**Expected Output:** Attestation check passes (relaxed in debug mode)

**Edge case — production with invalid attestation:**

```
Input:  config: { debug: false } with invalid PCR0 mapping
Output: Proving machine transitions to error state with code 'ATTESTATION_FAILED'
```

---

### 3. Fix `fonts.ts` Platform Dependency

**`src/constants/fonts.ts`** — Line 10

```typescript
// BEFORE
import { Platform } from 'react-native';
export const dinot = Platform.OS === 'ios' ? 'DINOT-Medium' : 'dinot';
```

```typescript
// AFTER — NO react-native import
export const advercase = 'Advercase-Regular';
export const dinot = 'DINOT-Medium';
export const dinotBold = 'DINOT-Bold';
export const plexMono = 'IBMPlexMono-Regular';
```

If this breaks Android font rendering, provide a `getFontFamily(platform)` factory instead.

---

### 4. WebView Lifecycle Events

**Create:** `VERIFICATION_COMPLETE` event in `src/types/events.ts`

```typescript
// SKELETON
VERIFICATION_COMPLETE = 'verification_complete',

// In SDKEventMap
[SdkEvents.VERIFICATION_COMPLETE]: {
  success: boolean;
  userId?: string;
  verificationId?: string;
  error?: { code: string; message: string };
};
```

**Create:** `SdkInitialConfig` type in `src/types/public.ts`

```typescript
export interface SdkInitialConfig {
  verificationRequest?: VerificationRequest;
  env?: 'prod' | 'stg';
  platform?: string;
  debug?: boolean;
}

/** Placeholder until the active host config contract defines a concrete `selfApp` shape. */
export type SelfAppConfig = Record<string, unknown>;

export interface VerificationRequest {
  userId?: string;
  scope?: string;
  disclosures?: string[];
  selfApp?: SelfAppConfig;
}
```

#### Input / Output

**Input:** Proving machine reaches `completed` state

**Expected Output:**

```json
{
  "event": "verification_complete",
  "data": {
    "success": true,
    "userId": "user-123",
    "verificationId": "ver-456"
  }
}
```

**Error case — proving fails:**

```json
{
  "event": "verification_complete",
  "data": {
    "success": false,
    "error": { "code": "PROVING_FAILED", "message": "TEE connection failed" }
  }
}
```

---

### 5. Conditional SelfApp Store

**`src/stores/selfAppStore.tsx`** — Make Socket.IO relay optional.

```typescript
// BEFORE — always creates Socket.IO connection
startAppListener: (selfClient, relayUrl) => { ... Socket.IO logic ... }

// AFTER — skip when no relay URL
startAppListener: (selfClient, relayUrl?) => {
  if (!relayUrl) return; // WebView mode — request comes via lifecycle bridge
  // ... existing Socket.IO logic
};
```

---

### 6. Web Fallback Adapter Implementations

**Create:** `src/adapters/browser/documents.ts`

```typescript
// SKELETON
export function createIndexedDBDocumentsAdapter(): DocumentsAdapter {
  // IndexedDB 'self-sdk-documents' database, version 1
  // Object stores: 'documents' (key: ID, value: encrypted blob), 'catalog'
  // Implements: loadDocumentCatalog, saveDocumentCatalog, loadDocumentById, saveDocument, deleteDocument
}
```

**Create:** `src/adapters/browser/crypto.ts`

```typescript
// SKELETON — hash() only, sign() left to bridge adapter
export function createWebCryptoAdapter(): CryptoAdapter {
  return {
    hash: async (data: Uint8Array, algorithm?: string): Promise<Uint8Array> => {
      const normalizedAlgo = (algorithm ?? 'sha256')
        .toUpperCase()
        .replace(/^SHA(\d)/, 'SHA-$1');
      const buf = await crypto.subtle.digest(normalizedAlgo, data);
      return new Uint8Array(buf);
    },
    sign: async (_data: Uint8Array, _keyRef: string) => {
      throw new Error(
        'sign() requires bridge adapter — use webCryptoAdapter(bridge) instead',
      );
    },
  };
}
```

**Create:** `src/adapters/browser/analytics.ts`

```typescript
// SKELETON
export function createWebAnalyticsAdapter(options?: {
  endpoint?: string;
  debug?: boolean;
}): AnalyticsAdapter {
  // console.log in dev, fire-and-forget fetch in prod
}
```

**Create:** `src/adapters/browser/haptic.ts`

```typescript
// SKELETON
export function createNoOpHapticAdapter(): HapticAdapter {
  return { trigger: () => {} };
}
```

**Create:** `src/adapters/browser/index.ts` — barrel export

#### Input / Output — IndexedDB Documents

**Input:** `adapter.saveDocument('doc-123', { mrz: '...', dg1Hash: [...] })`

**Expected Output:** Document stored in IndexedDB, `adapter.loadDocumentById('doc-123')` returns the same data.

**Error case — IndexedDB unavailable:**

```text
Input:  Browser with IndexedDB disabled
Output: Adapter throws with descriptive error, not silent failure
```

#### Input / Output — Web Crypto Hash

**Input:** `adapter.hash(new Uint8Array([1, 2, 3]), 'sha256')`

**Expected Output:** SHA-256 hash as `Uint8Array`

**Edge case — algorithm name normalization:**

```text
Input:  adapter.hash(data, 'sha-256')  // already hyphenated
Output: Same hash result (normalize handles both formats)
```

---

### 7. Clean Browser Entry Point

**`src/browser.ts`** — Audit and ensure zero transitive `react-native` imports.

Update `package.json` `exports` field:

```json
{
  "exports": {
    ".": {
      "react-native": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "import": "./dist/browser.js",
      "default": "./dist/browser.js"
    }
  }
}
```

Re-export web fallback adapter factories from `src/browser.ts`.

---

## Files You Will Modify

| File                            | Change                                                                             | Risk                                |
| ------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `src/proving/provingMachine.ts` | Remove `Platform` import, replace `__DEV__` with `config.debug`                    | **High** — core proving logic       |
| `src/types/public.ts`           | Add `platform`, `debug` to `Config`; add `SdkInitialConfig`, `VerificationRequest` | **Medium** — public API types       |
| `src/types/events.ts`           | Add `VERIFICATION_COMPLETE` event                                                  | **Low** — additive                  |
| `src/constants/fonts.ts`        | Remove `Platform` import                                                           | **Medium** — affects font rendering |
| `src/nfc/index.ts`              | Remove `Platform.OS` from logging                                                  | **Low** — logging only              |
| `src/stores/selfAppStore.tsx`   | Make Socket.IO conditional                                                         | **Medium** — affects QR flow        |
| `src/client.ts`                 | Wire new config fields, expose `network` adapter                                   | **Low** — additive                  |
| `src/browser.ts`                | Audit exports, re-export web fallback adapters                                     | **Low** — web-only entry            |
| `package.json`                  | Update `exports` field                                                             | **Medium** — bundler resolution     |

## Files You Will NOT Modify

| File                                | Why                                                         |
| ----------------------------------- | ----------------------------------------------------------- |
| `src/adapters/react-native/*`       | RN-specific, never imported by WebView                      |
| `src/components/*`                  | RN UI components, WebView UI builds browser equivalents     |
| `src/flows/*`                       | RN screen flows, replaced by `webview-app`                  |
| `src/bridge/nativeEvents.native.ts` | RN-only, `.native.ts` suffix means bundlers skip it on web  |
| `src/haptic/*`                      | Delegated to adapters in WebView                            |
| `src/layouts/*`                     | RN layout components                                        |
| `common/`                           | Out of scope — this workstream only owns `mobile-sdk-alpha` |

## Chunking Guide

### Chunk 4A: Config & Platform Abstraction — S ~3k tokens

**Goal:** Remove all `Platform` and `__DEV__` imports from core logic.

**Steps:**

1. Add `platform` and `debug` fields to `Config` in `src/types/public.ts`
2. Update `src/config/defaults.ts` with sensible defaults
3. Update `src/proving/provingMachine.ts`: remove `import { Platform } from 'react-native'`, replace `getPlatform()` to read from `selfClient.config.platform`, replace `__DEV__` with `selfClient.config.debug`
4. Update `src/constants/fonts.ts` — remove `Platform` import
5. Update `src/nfc/index.ts` — remove `Platform.OS` from logging
6. Update `src/client.ts` — wire new config fields
7. Validate: `cd packages/mobile-sdk-alpha && npx vitest run && npx tsc --noEmit`

**You Will NOT:**

- Add logic to Kotlin or Swift code
- Import `react-native` in any file outside `src/adapters/react-native/`
- Duplicate types that exist in `mobile-sdk-alpha`
- Refactor the proving machine's state transitions or XState logic
- Modify `@selfxyz/common`

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/mobile-sdk-alpha && npx vitest run && npx tsc --noEmit
grep -r "from 'react-native'" src/proving/ src/constants/ src/nfc/ --include="*.ts" --include="*.tsx" | grep -v ".native." | grep -v "adapters/react-native"
```

**Expected Output:**

```
vitest: All tests pass
tsc: No errors
grep: No output (no RN imports in core files)
```

#### Tests

| Test                                   | Type | What it validates                              |
| -------------------------------------- | ---- | ---------------------------------------------- |
| `tests/proving/provingMachine.test.ts` | Unit | Existing tests pass with config-based platform |
| New: `provingMachine.platform.test.ts` | Unit | `config.platform` used in proof context        |
| New: `provingMachine.debug.test.ts`    | Unit | `config.debug` replaces `__DEV__`              |

---

### Chunk 4B: Browser Entry Point & Package Exports — S ~2k tokens

**Depends on:** Chunk 4A

**Goal:** Clean browser entry point that excludes all RN-specific code.

**Steps:**

1. Audit `src/browser.ts` — ensure no transitive `react-native` imports
2. Update `package.json` `exports` field with conditional `react-native` vs `import` resolution
3. Verify that `webview-app` can import core types, stores, and `createSelfClient` without pulling in RN
4. Validate: `npx madge --no-spinner src/browser.ts | grep -i "react-native"` returns nothing

**You Will NOT:**

- Modify the RN entry point (`src/index.ts`)
- Remove any existing exports (backwards compat)
- Touch proving machine internals

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/mobile-sdk-alpha
npx madge --no-spinner src/browser.ts | grep -i "react-native"
npx tsc --noEmit
```

**Expected Output:**

```
madge: No output (no RN in dependency tree)
tsc: No errors
```

#### Tests

| Test                               | Type       | What it validates                                                              |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| New: `tests/browser-entry.test.ts` | Unit       | Browser exports include `createSelfClient`, `useSelfClient`, `useProvingStore` |
| `madge` dependency check           | Build gate | No transitive RN imports                                                       |

---

### Chunk 4C: WebView Lifecycle Events — S ~2k tokens

**Depends on:** Chunk 4A

**Goal:** Define integration points between proving machine and WebView host.

**Steps:**

1. Add `VERIFICATION_COMPLETE` event to `src/types/events.ts` and `SDKEventMap`
2. Add `SdkInitialConfig` and `VerificationRequest` types to `src/types/public.ts`
3. Emit `VERIFICATION_COMPLETE` in the proving machine on `completed` and `failure` states
4. Document for the WebView UI workstream how `SelfClientProvider` subscribes
5. Validate: type-check clean, no runtime changes to existing flows

**You Will NOT:**

- Modify bridge protocol types (those are in `webview-bridge`)
- Build WebView UI components
- Implement the lifecycle adapter in the active WebView UI workstream

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/mobile-sdk-alpha && npx tsc --noEmit && npx vitest run
```

**Expected Output:**

```
tsc: No errors
vitest: All tests pass (new event type is additive)
```

#### Tests

| Test                               | Type | What it validates                                  |
| ---------------------------------- | ---- | -------------------------------------------------- |
| Existing proving machine tests     | Unit | No regressions                                     |
| New: lifecycle event emission test | Unit | `VERIFICATION_COMPLETE` fires on completed/failure |

---

### Chunk 4D: WsAdapter Integration — M ~5k tokens [OPTIONAL]

**Depends on:** Chunk 4A

**Goal:** Refactor proving machine to use `NetworkAdapter.ws` instead of raw `WebSocket`.

This chunk is **optional** — raw `WebSocket` works natively in the browser. Skip if time is tight.

**Steps:**

1. Add `onOpen` to `WsConn` interface in `src/types/public.ts`
2. Expose `network` on `SelfClient` interface
3. Refactor `initTeeConnection` in `provingMachine.ts` to use `selfClient.network.ws.connect()`
4. Create default `WsAdapter` in `src/adapters/browser/ws.ts`
5. Validate: proving flow compiles and typechecks in RN SDK build

**You Will NOT:**

- Change the Socket.IO client usage (that's separate)
- Modify WebSocket reconnection strategy
- Break existing test mocks

---

### Chunk 4E: Conditional SelfApp Store — S ~2k tokens

**Depends on:** Chunk 4A

**Goal:** Make the Socket.IO relay in `selfAppStore` optional.

**Steps:**

1. Make `startAppListener` skip Socket.IO when no relay URL is provided
2. Verify QR scanning flow in RN app still works
3. Validate: `npx vitest run`

**You Will NOT:**

- Remove Socket.IO dependency entirely (still needed for Self app)
- Change the store's state shape
- Modify other stores

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/mobile-sdk-alpha && npx vitest run
```

**Expected Output:** All tests pass.

#### Tests

| Test                         | Type | What it validates                            |
| ---------------------------- | ---- | -------------------------------------------- |
| Existing store tests         | Unit | No regressions                               |
| New: store without relay URL | Unit | No Socket.IO connection when no URL provided |

---

### Chunk 4F: Web Fallback Adapter Implementations — M ~6k tokens

**Depends on:** Chunk 4B

**Goal:** Create web-native adapter implementations for IndexedDB documents, Web Crypto hashing, console/fetch analytics, and no-op haptic.

**Steps:**

1. Create `src/adapters/browser/documents.ts` — `createIndexedDBDocumentsAdapter()`
2. Create `src/adapters/browser/crypto.ts` — `createWebCryptoAdapter()` with algorithm name normalization
3. Create `src/adapters/browser/analytics.ts` — `createWebAnalyticsAdapter()`
4. Create `src/adapters/browser/haptic.ts` — `createNoOpHapticAdapter()`
5. Create `src/adapters/browser/index.ts` — barrel export
6. Update `src/browser.ts` to re-export all web fallback adapter factories
7. Add unit tests with `fake-indexeddb` devDependency
8. Validate: `npx vitest run`

**You Will NOT:**

- Implement `sign()` in the web crypto adapter (bridge handles that)
- Give the WebView direct keychain access
- Modify existing RN adapters
- Import `react-native` in any browser adapter

**Implementation notes:**

- Add `fake-indexeddb` (`^6.0.0`) as a `devDependency` in `packages/mobile-sdk-alpha/package.json`. jsdom does not provide IndexedDB.
- In `vitest.config.ts`, add the setup file that imports `fake-indexeddb/auto` before tests run:

```typescript
// vitest.config.ts (or vitest.setup.ts)
import 'fake-indexeddb/auto';
```

- SHA algorithm name mapping: `crypto.subtle.digest` requires hyphenated identifiers (`"SHA-256"`, not `"sha256"`). The `createWebCryptoAdapter` must normalize input: `algo.toUpperCase().replace(/^SHA(\d)/, 'SHA-$1')`.

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/mobile-sdk-alpha && npx vitest run
# Verify browser exports include web fallback adapters
npx tsx -e "import * as m from './src/adapters/browser/index.ts'; console.log(Object.keys(m))"
```

**Expected Output:**

```text
vitest: All tests pass including new adapter tests
exports: ['createIndexedDBDocumentsAdapter', 'createWebCryptoAdapter', 'createWebAnalyticsAdapter', 'createNoOpHapticAdapter']
```

#### Tests

| Test                                       | Type | What it validates                            |
| ------------------------------------------ | ---- | -------------------------------------------- |
| `tests/adapters/browser/documents.test.ts` | Unit | IndexedDB CRUD with `fake-indexeddb`         |
| `tests/adapters/browser/crypto.test.ts`    | Unit | Web Crypto hash with algorithm normalization |
| `tests/adapters/browser/analytics.test.ts` | Unit | Console logging, fetch fire-and-forget       |
| `tests/adapters/browser/haptic.test.ts`    | Unit | No-op doesn't throw                          |

---

## Dependency Graph

```
Chunk 4A (config + platform) — no deps, start here
  ├──→ Chunk 4B (browser entry point)
  │     └──→ Chunk 4F (web fallback adapters)
  ├──→ Chunk 4C (lifecycle events)
  ├──→ Chunk 4D (WsAdapter refactor) [optional]
  └──→ Chunk 4E (conditional selfAppStore)

WebView UI          ←── depends on ──→  SDK Core
Paused native shells←── historical contract via ──→ SDK Core (lifecycle/config types)
```

## Completion Status

_Audit date: 2026-03-02_

| Chunk | Description                           | Size  | Status                                                  |
| ----- | ------------------------------------- | ----- | ------------------------------------------------------- |
| 4A    | Config & Platform Abstraction         | S ~3k | **Done**                                                |
| 4B    | Browser Entry Point & Package Exports | S ~2k | **Done**                                                |
| 4C    | WebView Lifecycle Events              | S ~2k | **Done**                                                |
| 4D    | WsAdapter Integration                 | M ~5k | **Skipped** (optional — raw WebSocket works in browser) |
| 4E    | Conditional SelfApp Store             | S ~2k | **Done**                                                |
| 4F    | Web Fallback Adapter Implementations  | M ~6k | **Done**                                                |

5 of 6 chunks complete. Chunk 4D remains optional and skipped by design.

### Remaining Follow-Ups

- Consolidate bridge-layer fallback duplicates with engine-owned adapters.
- Expose `generateKey()` / `getPublicKey()` in bridge crypto adapter surface.

**Implementation notes from PR review:**

- SHA algorithm name mapping: `crypto.subtle.digest` requires hyphenated identifiers (`"SHA-256"`, not `"sha256"`). Normalize input before calling.
- `fake-indexeddb` needed for tests: jsdom does not provide IndexedDB.
- `proof` field in `VERIFICATION_COMPLETE` is never populated — remove or populate later.

## Validation Plan

```bash
# After every chunk (must pass):
cd packages/mobile-sdk-alpha && npx tsc --noEmit
cd packages/mobile-sdk-alpha && npx vitest run

# Verify no react-native in browser entry (after 4B):
cd packages/mobile-sdk-alpha && npx madge --no-spinner src/browser.ts | grep -i "react-native"
# Should return nothing

# After all chunks — integration validation:
cd packages/webview-app && npx vite build
grep -r "NativeModules\|NativeEventEmitter\|requireNativeComponent" packages/webview-app/dist/ && echo "FAIL" || echo "PASS"

# RN app still works (manual):
# Run Self app app, complete full onboarding + disclosure flow
```

## Coordination Notes

- **WebView UI:** When `VERIFICATION_COMPLETE` event and `SdkInitialConfig` types are added (Chunk 4C), wire them into `SelfClientProvider` and the active host callback surface.
- **Paused native shells:** Historical KMP/RN handlers may later reuse the same `VerificationRequest` and lifecycle/config shapes, but that coordination is paused and is not a current delivery dependency.
- **WebView UI:** After Chunk 4F, import web fallback adapter factories from `@selfxyz/mobile-sdk-alpha` for `SelfClientProvider` wiring.

## Key Reference Files

| File                                                      | What to Look At                                             |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/mobile-sdk-alpha/src/client.ts`                 | `createSelfClient()` factory — integration point            |
| `packages/mobile-sdk-alpha/src/types/public.ts`           | All adapter interfaces and `SelfClient` type                |
| `packages/mobile-sdk-alpha/src/context.tsx`               | `SelfClientProvider` and `useSelfClient()`                  |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` | Proving state machine — largest file, most RN contamination |
| `packages/mobile-sdk-alpha/src/stores/`                   | Zustand stores (protocol, selfApp, mrz)                     |
| `packages/mobile-sdk-alpha/src/browser.ts`                | Browser entry point                                         |
| `packages/mobile-sdk-alpha/src/constants/`                | Colors (clean), fonts (needs fix)                           |
| `packages/mobile-sdk-alpha/src/documents/utils.ts`        | Document CRUD — clean, uses adapters                        |
| `packages/mobile-sdk-alpha/package.json`                  | Exports and dependencies                                    |

## Related Specs

| Spec                                                     | Relationship                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [SDK Overview](../../OVERVIEW.md)                        | Parent architecture spec                                                                  |
| [WebView UI Spec](../webview/SPEC.md)                    | Sibling — builds WebView UI that consumes your adapter interfaces and browser entry point |
| [Native Shells Spec](../../paused/native-shells/SPEC.md) | Paused sibling — retained native handlers that may reuse your lifecycle types later       |
| [RN SDK Spec](../../paused/rn-sdk/SPEC.md)               | Paused sibling — retained RN shell that may reuse your browser entry point later          |
| [MiniPay Sample Spec](../../paused/integrations/SPEC.md) | Paused downstream — historical KMP sample that depends on SDK core                        |

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

### Architecture (brief)

Chunks 4A–4E removed React Native contamination from core logic. `Platform` and `__DEV__` replaced with config fields (`config.platform`, `config.debug`). Browser entry point (`src/browser.ts`) serves web consumers with zero transitive RN imports. `VERIFICATION_COMPLETE` event provides lifecycle integration for WebView hosts. Socket.IO in `selfAppStore` made conditional. Chunk 4D (WsAdapter) intentionally skipped — raw WebSocket works in browser contexts.

### Deviations from Spec

| Spec said                               | We did                               | Why                                                              |
| --------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Chunk 4D: Refactor to WsAdapter         | Skipped                              | Raw WebSocket works in browser; testability improvement deferred |
| `plexMono` font: platform-aware factory | Hardcoded to `'IBMPlexMono-Regular'` | Simpler; may need iOS verification                               |

### Lessons / Gotchas

- `__DEV__` is a React Native global that doesn't exist in Vite — always inject via config
- Font family names differ by platform (PostScript name vs asset filename) — verify on all platforms when changing
- `madge` is the fastest way to verify no RN imports leak into browser entry

---

## Follow-Up (Out of Scope)

| Item                                                   | Discovered during | Suggested spec                  |
| ------------------------------------------------------ | ----------------- | ------------------------------- |
| `@selfxyz/common` Buffer polyfill for browser          | Chunk 4B          | New spec: common-browser-compat |
| `proof` field never populated in VERIFICATION_COMPLETE | PR #1765 review   | Chunk 4F or follow-up           |
| Remaining `__DEV__` references outside proving machine | PR #1765 review   | Audit in Chunk 4F               |
| `plexMono` font may break iOS rendering                | Chunk 4A          | Manual verification needed      |

## SDK vs App Gap Summary

Gaps where the RN app (`app/`) reimplements what the SDK should provide:

| Gap               | App Code                                                    | SDK Has                                  | Priority |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------- | -------- |
| NFC scanner       | `app/src/integrations/nfc/` (2 files)                       | `reactNativeScannerAdapter` (incomplete) | **P1**   |
| Document storage  | `app/src/providers/passportDataProvider.tsx` (972 lines)    | `DocumentsAdapter` interface only        | **P1**   |
| Auth adapter      | `app/src/providers/authProvider.tsx` (Keychain + biometric) | `AuthAdapter` interface only             | **P2**   |
| SelfClient wiring | `app/src/providers/selfClientProvider.tsx` (509 lines)      | No default adapter set                   | **P2**   |
| Analytics adapter | `app/src/services/analytics.ts` (349 lines)                 | `AnalyticsAdapter` interface only        | **P3**   |

## Spec Deviations

| Suggestion skipped                  | Reason                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| BEFORE/AFTER for every task         | Tasks 4-7 are new file creation, not modification — used CREATE + SKELETON pattern instead |
| `--remote` recommendation per chunk | All chunks are S or M size — local execution is fine                                       |
