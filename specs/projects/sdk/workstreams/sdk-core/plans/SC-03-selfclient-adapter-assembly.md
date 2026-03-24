# SC-03: Extract Reusable App Adapter Factories for SelfClient Assembly

> Last updated: 2026-03-24
> Status: Done
> Priority: Medium
> Depends on: SC-02 (Done)

- Workstream: sdk-core
- Backlog ID: SC-03
- Owner: SDK Core
- Branch: TBD
- PR: TBD

## Context

The WebView app needs browser-safe adapter factories for `SelfClient` assembly.
The SDK already had `createWebCryptoAdapter()` but was missing a network
adapter factory. This spec creates `createWebNetworkAdapter()` and exports both
from the browser entry point.

### What the SDK provides

| Adapter            | Factory                       | Location                                               | Consumer      |
| ------------------ | ----------------------------- | ------------------------------------------------------ | ------------- |
| Crypto (browser)   | `createWebCryptoAdapter()`    | `mobile-sdk-alpha/src/adapters/browser/crypto.ts`      | webview-app   |
| Crypto (RN)        | `createCryptoAdapter()`       | `mobile-sdk-alpha/src/adapters/react-native/crypto.ts` | RN app        |
| Network (browser)  | `createWebNetworkAdapter()`   | `mobile-sdk-alpha/src/adapters/browser/network.ts`     | webview-app   |
| Network (RN)       | `createNetworkAdapter()`      | `mobile-sdk-alpha/src/adapters/react-native/network.ts`| RN app        |
| Analytics          | `createWebAnalyticsAdapter()` | `mobile-sdk-alpha/src/adapters/browser/analytics.ts`   | webview-app   |

## What Was Done

### 1. Created browser network adapter factory

**Created:** `packages/mobile-sdk-alpha/src/adapters/browser/network.ts`

`createWebNetworkAdapter()` uses `globalThis.fetch` and `globalThis.WebSocket`
— browser/WebView-native, no RN dependencies.

### 2. Exported from browser barrel

**File:** `packages/mobile-sdk-alpha/src/adapters/browser/index.ts`

Added `createWebNetworkAdapter` to the barrel export.

### 3. Exported from browser entry point

**File:** `packages/mobile-sdk-alpha/src/browser.ts`

Re-exported `createWebNetworkAdapter` so `@selfxyz/mobile-sdk-alpha/browser`
consumers can import it.

## Files Modified

| File                                                        | Change                                   | Risk     |
| ----------------------------------------------------------- | ---------------------------------------- | -------- |
| `packages/mobile-sdk-alpha/src/adapters/browser/network.ts` | **Created** — browser network factory   | **Low**  |
| `packages/mobile-sdk-alpha/src/adapters/browser/index.ts`   | Added barrel export                      | **Low**  |
| `packages/mobile-sdk-alpha/src/browser.ts`                  | Added re-export                          | **Low**  |

## Files NOT Modified

| File                                                        | Why                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `app/src/providers/selfClientProvider.tsx`                  | RN app keeps its own inline adapters — avoids accidental breakage in production app |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | webview-app wiring is WV-07 scope                                                  |
| `packages/mobile-sdk-alpha/src/client.ts`                   | `createSelfClient()` factory is correct as-is                                      |
| `packages/webview-bridge/**`                                | Bridge adapters are a separate assembly path                                       |

## Design Decision: Separate RN and Browser Adapter Paths

The RN app keeps its own adapter implementations and does **not** switch to the
browser factories. This is intentional:

- `createCryptoAdapter()` (RN) uses `@noble/hashes` — more portable in React
  Native than `crypto.subtle`
- `createNetworkAdapter()` (RN) handles RN-specific WebSocket header passing
- Replacing working inline code in the production app risks regressions with
  no functional benefit

The browser factories exist for the **webview-app** consumer path (WV-07).
The RN app can optionally adopt them later as a cleanup task.

## Validation

```bash
# SDK core types + tests
cd packages/mobile-sdk-alpha && yarn types && yarn test
```

## Definition of Done

- [x] `createWebNetworkAdapter()` factory exists in `mobile-sdk-alpha/src/adapters/browser/`
- [x] Factory is exported from both `browser/index.ts` barrel and `browser.ts` entry point
- [x] RN app unchanged — keeps existing inline adapters
- [x] Browser factories available for webview-app via `@selfxyz/mobile-sdk-alpha/browser`

## Status Log

- 2026-03-12: Plan created.
- 2026-03-24: Updated — removed RN app changes from scope. RN app keeps its own adapters. Browser factories confirmed working and exported.
