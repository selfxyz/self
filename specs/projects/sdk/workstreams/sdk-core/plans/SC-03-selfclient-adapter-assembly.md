# SC-03: Extract Reusable App Adapter Factories for SelfClient Assembly

> Last updated: 2026-03-12
> Status: Ready
> Priority: Medium
> Depends on: SC-02 (Done)

- Workstream: sdk-core
- Backlog ID: SC-03
- Owner: SDK Core
- Branch: TBD
- PR: TBD

## Context

You are extracting the generic app-side adapter factories that are still
duplicated inside the RN app's `createSelfClient()` assembly.

Today, `app/src/providers/selfClientProvider.tsx` (519 lines) still inlines
generic crypto and network adapters even though those pieces are not app-
specific. The WebView app follows a different bridge-oriented assembly path and
is intentionally out of scope for this plan.

The result:

1. Every new adapter method (like `generateKey`/`getPublicKey` in SC-02) must be
   patched in the app provider by hand — the app CI broke because its inline
   crypto adapter was missing the new methods.
2. The app's crypto adapter reimplements `createWebCryptoAdapter()` from
   `mobile-sdk-alpha/src/adapters/browser/crypto.ts` with slightly different
   algorithm normalization.
3. The app's WebSocket adapter is a copy of what could be a shared factory.

### What exists today

| Consumer    | File                                                        | LOC | Relevant duplicated adapter assembly                                |
| ----------- | ----------------------------------------------------------- | --- | ------------------------------------------------------------------- |
| RN app      | `app/src/providers/selfClientProvider.tsx`                  | 519 | crypto (hash+stubs), network (fetch+ws)                             |
| WebView app | `packages/webview-app/src/providers/SelfClientProvider.tsx` | 108 | Different bridge-oriented assembly path; out of scope for this plan |

### What the SDK already provides

| Adapter            | Factory                       | Location                                               |
| ------------------ | ----------------------------- | ------------------------------------------------------ |
| Crypto (browser)   | `createWebCryptoAdapter()`    | `mobile-sdk-alpha/src/adapters/browser/crypto.ts`      |
| Crypto (RN)        | `createCryptoAdapter()`       | `mobile-sdk-alpha/src/adapters/react-native/crypto.ts` |
| Network (fetch+ws) | **None**                      | Inlined in both consumers                              |
| Navigation         | **None** (app-specific)       | Inlined in app consumer                                |
| Analytics          | `createWebAnalyticsAdapter()` | `mobile-sdk-alpha/src/adapters/browser/analytics.ts`   |

## What You Will Do

### 1. Create a default network adapter factory

**Create:** `packages/mobile-sdk-alpha/src/adapters/browser/network.ts`

The app and webview-app both construct identical `{ http: { fetch }, ws: { connect } }`
objects using the platform's native `fetch` and `WebSocket`. Extract this into a
shared factory.

```typescript
import type { NetworkAdapter, WsConn } from '../../types/public';

export function createWebNetworkAdapter(): NetworkAdapter {
  return {
    http: {
      fetch: (input: RequestInfo, init?: RequestInit) => fetch(input, init),
    },
    ws: {
      connect: (url: string): WsConn => {
        const socket = new WebSocket(url);
        return {
          send: data => socket.send(data),
          close: () => socket.close(),
          onMessage: cb => {
            socket.addEventListener('message', ev =>
              cb((ev as MessageEvent).data),
            );
          },
          onError: cb => {
            socket.addEventListener('error', e => cb(e));
          },
          onClose: cb => {
            socket.addEventListener('close', () => cb());
          },
        };
      },
    },
  };
}
```

### 2. Export the new factory from the browser barrel

**File:** `packages/mobile-sdk-alpha/src/adapters/browser/index.ts`

Add `createWebNetworkAdapter` to the barrel export.

### 3. Export the new factory from the browser entry point

**File:** `packages/mobile-sdk-alpha/src/browser.ts`

Re-export `createWebNetworkAdapter` so `@selfxyz/mobile-sdk-alpha/browser`
consumers can import it.

### 4. Replace the app's inline network adapter

**File:** `app/src/providers/selfClientProvider.tsx`

Replace the inline `network: { http: { fetch: ... }, ws: { connect: ... } }`
block (~20 lines) with:

```typescript
import { createWebNetworkAdapter } from '@selfxyz/mobile-sdk-alpha/browser';
// ...
network: createWebNetworkAdapter(),
```

### 5. Replace the app's inline crypto adapter

**File:** `app/src/providers/selfClientProvider.tsx`

Replace the inline `crypto: { hash(...) { ... }, sign(...) { ... }, generateKey(...) { ... }, getPublicKey(...) { ... } }`
block (~30 lines) with:

```typescript
import { createWebCryptoAdapter } from '@selfxyz/mobile-sdk-alpha/browser';
// ...
crypto: createWebCryptoAdapter(),
```

The app's inline hash implementation is functionally identical to
`createWebCryptoAdapter()` but with less robust algorithm normalization. The
throwing stubs for `sign`, `generateKey`, and `getPublicKey` are identical.

### 6. Update SPEC.md backlog

**File:** `specs/projects/sdk/workstreams/sdk-core/SPEC.md`

- Add SC-03 row to backlog table
- Add SC-03 to active plans table

## Files You Will Modify

| File                                                        | Change                                             | Risk                                               |
| ----------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `packages/mobile-sdk-alpha/src/adapters/browser/network.ts` | **Create** — new network adapter factory           | **Low** — follows existing adapter factory pattern |
| `packages/mobile-sdk-alpha/src/adapters/browser/index.ts`   | Add barrel export                                  | **Low** — additive                                 |
| `packages/mobile-sdk-alpha/src/browser.ts`                  | Add re-export                                      | **Low** — additive                                 |
| `app/src/providers/selfClientProvider.tsx`                  | Replace inline crypto + network with factory calls | **Medium** — touches app provider                  |
| `specs/projects/sdk/workstreams/sdk-core/SPEC.md`           | Add SC-03 to backlog                               | **None**                                           |

## Files You Will NOT Modify

| File                                                        | Why                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | Already uses bridge adapter factories — different assembly path that is intentionally out of scope here. |
| `packages/mobile-sdk-alpha/src/client.ts`                   | `createSelfClient()` factory is correct as-is                                                            |
| `packages/mobile-sdk-alpha/src/context.tsx`                 | `SelfClientProvider` React wrapper is correct as-is                                                      |
| `packages/mobile-sdk-alpha/src/types/public.ts`             | No interface changes needed                                                                              |
| `packages/webview-bridge/**`                                | Bridge adapters are a separate assembly path                                                             |

## Constraints

- **No regressions in the RN app.** The app must continue to work identically
  after replacing inline adapters with factory calls.
- **No new dependencies.** `createWebNetworkAdapter()` uses only platform globals
  (`fetch`, `WebSocket`).
- **App-specific wiring stays in the app.** Navigation (React Navigation refs),
  analytics (Sentry + app tracking service), auth (keychain provider), documents
  (passport data provider), and event listeners are app-specific and remain in
  `selfClientProvider.tsx`. Only the generic/duplicated parts move to factories.
- **Don't touch the webview-app provider.** It has its own adapter type
  (`SelfClientAdapters`) that includes lifecycle and biometrics — adapters the
  SDK's `Adapters` interface doesn't define. That is a separate concern and not
  part of SC-03.

## Validation

```bash
# SDK core types + tests
cd packages/mobile-sdk-alpha && yarn types && yarn test

# App types
cd app && yarn types

# Full lint pass
yarn lint
```

**Expected:** All pass with zero errors.

## Definition of Done

- [ ] `createWebNetworkAdapter()` factory exists in `mobile-sdk-alpha/src/adapters/browser/`
- [ ] Factory is exported from both `browser/index.ts` barrel and `browser.ts` entry point
- [ ] App's `selfClientProvider.tsx` uses `createWebCryptoAdapter()` instead of inline crypto
- [ ] App's `selfClientProvider.tsx` uses `createWebNetworkAdapter()` instead of inline network
- [ ] `yarn types` clean in both `mobile-sdk-alpha` and `app`
- [ ] `yarn test` passes in `mobile-sdk-alpha`
- [ ] Backlog row added in SPEC.md
