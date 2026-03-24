# WV-07: SelfClient Assembly & Proving Machine Export for WebView

> Last updated: 2026-03-24
> Status: Ready
> Priority: High
> Depends on: SC-03 (Ready — creates `createWebNetworkAdapter()`)

- Workstream: webview
- Backlog ID: WV-07
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The webview-app needs to run the proving machine for ZK proof generation, but
today it has no `SelfClient` — only raw bridge adapters with incompatible
interfaces. The proving machine (`useProvingStore`) is not exported from the
SDK's browser entry point, and no adapter mapping exists to bridge the gap
between `BridgeCryptoAdapter` / `BridgeStorageAdapter` and the SDK's
`CryptoAdapter` / `DocumentsAdapter` interfaces.

This spec wires the missing pieces so WV-08 can drive the proving machine from
the tunnel flow.

## What You Will Do

### 1. Export proving machine from browser entry point

**File:** `packages/mobile-sdk-alpha/src/browser.ts`

The proving machine is already browser-compatible (zero RN imports). Add value
exports alongside the existing type-only exports:

```typescript
// Existing (keep):
export type {
  ProvingStateType,
  provingMachineCircuitType,
} from './proving/provingMachine';

// Add:
export type { ProvingState } from './proving/provingMachine';
export {
  useProvingStore,
  getPostVerificationRoute,
} from './proving/provingMachine';
```

Additive-only — no RN regression risk.

### 2. Create a keychain-backed DocumentsAdapter

**Create:** `packages/webview-bridge/src/adapters/keychain-documents.ts`

The SDK's `DocumentsAdapter` interface requires structured document CRUD. The
webview-app must persist passport data in the native keychain (security
boundary), not IndexedDB. Use the existing `secureStorage` bridge domain.

```typescript
import type { WebViewBridge } from '../bridge';
import type {
  DocumentsAdapter,
  DocumentCatalog,
  IDDocument,
} from '@selfxyz/mobile-sdk-alpha';

const CATALOG_KEY = 'self_document_catalog';
const DOC_PREFIX = 'self_doc_';

export function createKeychainDocumentsAdapter(
  bridge: WebViewBridge,
): DocumentsAdapter {
  async function storageGet(key: string): Promise<string | null> {
    const result = await bridge.request<{ value: string | null }>(
      'secureStorage',
      'get',
      { key },
    );
    return result?.value ?? null;
  }

  async function storageSet(key: string, value: string): Promise<void> {
    await bridge.request('secureStorage', 'set', { key, value });
  }

  async function storageRemove(key: string): Promise<void> {
    await bridge.request('secureStorage', 'remove', { key });
  }

  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      const raw = await storageGet(CATALOG_KEY);
      return raw ? JSON.parse(raw) : { documents: [], selectedId: null };
    },
    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      await storageSet(CATALOG_KEY, JSON.stringify(catalog));
    },
    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const raw = await storageGet(`${DOC_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    },
    async saveDocument(id: string, doc: IDDocument): Promise<void> {
      await storageSet(`${DOC_PREFIX}${id}`, JSON.stringify(doc));
    },
    async deleteDocument(id: string): Promise<void> {
      await storageRemove(`${DOC_PREFIX}${id}`);
    },
  };
}
```

Export from `packages/webview-bridge/src/adapters/index.ts` barrel.

### 3. Create SDK adapter mapping functions

**Create:** `packages/webview-bridge/src/adapters/sdk-adapter-map.ts`

Bridge adapters have different interfaces from SDK adapters. Create thin mapping
functions. The bridge crypto adapter already implements the right methods
(`hash`, `sign`, `generateKey`, `getPublicKey`) — it just needs type coercion.

```typescript
import type { WebViewBridge } from '../bridge';
import type {
  Adapters,
  CryptoAdapter,
  AuthAdapter,
  NavigationAdapter,
  NetworkAdapter,
  NFCScannerAdapter,
} from '@selfxyz/mobile-sdk-alpha';
import { bridgeCryptoAdapter } from './crypto';
import { bridgeAuthAdapter } from './auth';
import { createKeychainDocumentsAdapter } from './keychain-documents';
import {
  createWebAnalyticsAdapter,
  createWebNetworkAdapter, // from SC-03
  webNFCScannerShim,
} from '@selfxyz/mobile-sdk-alpha/browser';

export interface CreateSdkAdaptersOpts {
  bridge: WebViewBridge;
  navigate: (path: string) => void;
  goBack: () => void;
}

export function createSdkAdapters(opts: CreateSdkAdaptersOpts): Adapters {
  const { bridge, navigate, goBack } = opts;
  const bridgeCrypto = bridgeCryptoAdapter(bridge);

  const crypto: CryptoAdapter = {
    hash: bridgeCrypto.hash,
    sign: bridgeCrypto.sign,
    generateKey: bridgeCrypto.generateKey,
    getPublicKey: bridgeCrypto.getPublicKey,
  };

  const bridgeAuth = bridgeAuthAdapter(bridge);
  const auth: AuthAdapter = {
    getPrivateKey: bridgeAuth.getPrivateKey,
  };

  const navigation: NavigationAdapter = {
    goBack,
    goTo: (routeName, params) => {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>)}`
        : '';
      navigate(`/${routeName}${query}`);
    },
  };

  return {
    scanner: webNFCScannerShim(),
    crypto,
    network: createWebNetworkAdapter(),
    auth,
    documents: createKeychainDocumentsAdapter(bridge),
    navigation,
    analytics: createWebAnalyticsAdapter(),
  };
}
```

Export from `packages/webview-bridge/src/adapters/index.ts` barrel.

### 4. Replace SelfClientProvider with real SelfClient

**File:** `packages/webview-app/src/providers/SelfClientProvider.tsx`

Replace the current `SelfClientAdapters` bag-of-adapters with a real
`SelfClient` instance created via `createSelfClient()`.

```typescript
import {
  createSelfClient,
  createListenersMap,
} from '@selfxyz/mobile-sdk-alpha/browser';
import { createSdkAdapters } from '@selfxyz/webview-bridge/adapters';

// Replace SelfClientAdapters type with SelfClient from SDK
// Keep lifecycle, haptic, biometrics as supplementary adapters
// (they are WebView-specific and not part of SDK Adapters interface)

export interface WebViewAdapters {
  client: SelfClient; // real SDK client with provingMachine access
  lifecycle: BridgeLifecycleAdapter;
  haptic: BridgeHapticAdapter;
  biometrics: BridgeBiometricsAdapter;
}
```

The `SelfClient` instance gives webview-app access to:

- `client.useProvingStore` — Zustand hook for proving state
- `client.getProvingState()` — snapshot accessor
- `client.emit()` / `client.on()` — event system
- All internal stores and adapters the proving machine needs

### 5. Add dependencies and Buffer polyfill to webview-app

**File:** `packages/webview-app/package.json`

Add packages externalized by the SDK's tsup build:

| Package            | Version | Why                            |
| ------------------ | ------- | ------------------------------ |
| `socket.io-client` | ^4.8.3  | TEE status WebSocket listener  |
| `xstate`           | ^5.20.2 | Internal state machine         |
| `node-forge`       | ^1.3.3  | AES-256-GCM encryption         |
| `buffer`           | ^6.0.3  | Node.js Buffer polyfill        |
| `elliptic`         | ^6.5.4  | Crypto ops via @selfxyz/common |

`zustand` and `@selfxyz/common` are already deps.

**File:** `packages/webview-app/src/main.tsx`

Add at the very top (before any other imports):

```typescript
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
```

The proving machine uses `Buffer` at lines 196, 219, 567, 606, 826.

### 6. Update SelfClientProvider to pass config

**File:** `packages/webview-app/src/providers/SelfClientProvider.tsx`

Pass required config fields to `createSelfClient()`:

```typescript
const client = useMemo(() => {
  const adapters = createSdkAdapters({
    bridge,
    navigate,
    goBack: () => navigate(-1),
  });
  const listeners = createListenersMap();
  return createSelfClient({
    config: {
      platform: 'webview',
      debug: import.meta.env.DEV,
      env: verificationRequest?.env ?? 'prod',
    },
    adapters,
    listeners,
  });
}, [bridge, navigate]);
```

## Files You Will Create

| File                                                         | What                                               | Risk    |
| ------------------------------------------------------------ | -------------------------------------------------- | ------- |
| `packages/webview-bridge/src/adapters/keychain-documents.ts` | Keychain-backed DocumentsAdapter via secureStorage | **Low** |
| `packages/webview-bridge/src/adapters/sdk-adapter-map.ts`    | Bridge→SDK adapter mapping + factory               | **Low** |

## Files You Will Modify

| File                                                        | Change                                        | Risk       |
| ----------------------------------------------------------- | --------------------------------------------- | ---------- |
| `packages/mobile-sdk-alpha/src/browser.ts`                  | Add `useProvingStore`, `ProvingState` exports | **Low**    |
| `packages/webview-bridge/src/adapters/index.ts`             | Add barrel exports for new adapters           | **Low**    |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | Replace adapter bag with real SelfClient      | **Medium** |
| `packages/webview-app/package.json`                         | Add 5 dependencies                            | **Low**    |
| `packages/webview-app/src/main.tsx`                         | Add Buffer polyfill (2 lines)                 | **Low**    |
| `specs/projects/sdk/workstreams/webview/SPEC.md`            | Add WV-07 to backlog                          | **None**   |

## Files You Will NOT Modify

| File                                                      | Why                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` | Engine is already browser-compatible; no changes needed      |
| `packages/mobile-sdk-alpha/src/client.ts`                 | `createSelfClient()` factory is correct as-is                |
| `packages/native-shell-android/**`                        | secureStorage handler already exists and handles JSON values |
| `packages/native-shell-ios/**`                            | secureStorage handler already exists and handles JSON values |
| `packages/webview-app/src/screens/**`                     | Screen wiring is WV-08 scope                                 |

## Constraints

- **No regressions in the RN app.** Browser.ts exports are additive. No
  existing exports change.
- **Keychain is always native-managed.** Documents go through secureStorage
  bridge to native keychain. No IndexedDB fallback for passport data.
- **Bridge protocol unchanged.** No new bridge domains. Uses existing
  `secureStorage` domain for document persistence.
- **Don't wire screens.** This spec creates the SelfClient and makes
  provingMachine accessible. WV-08 wires screens to it.
- **SC-03 must land first.** `createWebNetworkAdapter()` is imported by the
  adapter mapping layer.

## Validation

```bash
# SDK types still pass (additive exports only)
cd packages/mobile-sdk-alpha && yarn types

# Bridge builds
cd packages/webview-bridge && yarn build

# webview-app builds with new imports
cd packages/webview-app && yarn build
```

## Definition of Done

- [ ] `useProvingStore` and `ProvingState` exported from `browser.ts`
- [ ] `createKeychainDocumentsAdapter()` persists documents via secureStorage bridge
- [ ] `createSdkAdapters()` maps bridge adapters to SDK Adapters interface
- [ ] `SelfClientProvider` creates a real `SelfClient` via `createSelfClient()`
- [ ] Buffer polyfill added to webview-app entry point
- [ ] `yarn types` clean in mobile-sdk-alpha
- [ ] `yarn build` clean in webview-bridge and webview-app
- [ ] Backlog row added in SPEC.md

## Status Log

- 2026-03-24: Plan created.
