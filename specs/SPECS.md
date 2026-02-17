# Self SDK — Architecture Specification

> Last updated: 2026-02-17

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      HOST APP                               │
│              (MiniPay / RN Wallet / Self Wallet)            │
│                                                             │
│  SelfSdk.launch(request, callback)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐
│  KOTLIN NATIVE SHELL│   │   RN NATIVE SHELL   │
│     (kmp-sdk)       │   │  (rn-sdk) — NEW     │
│                     │   │                     │
│ • Android WebView   │   │ • react-native-     │
│ • iOS WKWebView     │   │   webview wrapper   │
│                     │   │                     │
│  5 Native Handlers: │   │  5 Native Handlers: │
│  ├─ NFC (JMRTD)     │   │  ├─ NFC (native mod)│
│  ├─ Camera (ML Kit) │   │  ├─ Camera (native) │
│  ├─ Biometrics      │   │  ├─ Biometrics      │
│  ├─ Keychain ★      │   │  ├─ Keychain ★      │
│  └─ Lifecycle       │   │  └─ Lifecycle        │
└─────────┬───────────┘   └──────────┬──────────┘
          │                          │
          └────────────┬─────────────┘
                       │
          ┌────────────▼────────────┐
          │     BRIDGE PROTOCOL     │
          │    (webview-bridge)     │
          │                        │
          │  JSON over postMessage  │
          │  10 domains, v1 proto   │
          │  request/response/event │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │       WEBVIEW UI        │
          │     (webview-app)       │
          │                        │
          │  React + Vite + Tamagui │
          │  9 screens, router      │
          │  Full verification flow │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │     WEBVIEW ENGINE      │
          │  (mobile-sdk-alpha)     │
          │                        │
          │  Proving machine (XState)│
          │  Document store (Zustand)│
          │  Adapter interfaces     │
          │                        │
          │  Web-native fallbacks:  │
          │  ├─ IndexedDB (docs)    │
          │  ├─ Web Crypto (hash)   │
          │  ├─ fetch (analytics)   │
          │  └─ (haptic = optional) │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │    SHARED UTILITIES     │
          │       (common/)         │
          │                        │
          │  Poseidon, Merkle trees │
          │  Passport parsing, MRZ  │
          │  Certificate handling   │
          └─────────────────────────┘

★ = Keychain is native-managed (host app controls access)
```

## Design Principles

1. **One WebView engine, two thin native shells, zero duplicated logic.**
2. Only bridge to native what the browser literally cannot do (NFC, camera, biometrics, lifecycle) plus keychain (host app policy).
3. Everything else (documents, crypto hashing, analytics, haptic) runs inside the WebView using standard web APIs.
4. The Self Wallet app will eventually migrate to use this same SDK WebView, but in the interim serves as a test environment to validate moving code into the webview engine.

## Module Table

| Module                  | Codebase Location            | Language           | What It Does                                                         | Status                                   | % Done  | Action Needed                                                                                                                                                                                               |
| ----------------------- | ---------------------------- | ------------------ | -------------------------------------------------------------------- | ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WebView Engine**      | `packages/mobile-sdk-alpha/` | TypeScript         | Core proving logic, state machines, adapter interfaces               | Working, 275 tests pass                  | **80%** | Finish removing RN deps from core (Chunk 3D optional). Add web-native fallback adapters (IndexedDB, Web Crypto) for use inside WebView                                                                      |
| **WebView UI**          | `packages/webview-app/`      | TypeScript (React) | 9 screens: country→ID→camera→NFC→confirm→prove→result                | All screens built, builds to Vite bundle | **75%** | Add biometrics + camera adapter wiring. Dynamic proof request items (currently hardcoded). Wire `SelfClientProvider` to use web fallback adapters                                                           |
| **Bridge Protocol**     | `packages/webview-bridge/`   | TypeScript         | JSON messaging layer, 10 domains, 9 adapters, timeout/error handling | 44 tests pass, solid protocol            | **78%** | Add missing biometrics + camera adapters. Add web fallback adapters for storage/documents (IndexedDB). Keep keychain as bridge-only (native)                                                                |
| **Kotlin Native Shell** | `packages/kmp-sdk/`          | Kotlin             | Android: 9 handlers, WebView host, Activity. iOS: stubs              | Android fully implemented (1608 LOC)     | **75%** | **DELETE** 4 handlers (documents, crypto, analytics, haptic) — WebView handles these. **KEEP** 5: NFC, Camera, Biometrics, Keychain, Lifecycle. iOS: implement only 3 handlers (NFC, Biometrics, Lifecycle) |
| **RN Native Shell**     | `packages/rn-sdk/` — **NEW** | React Native       | `<SelfVerification />` WebView wrapper component                     | Does not exist                           | **0%**  | **CREATE**: thin RN component wrapping `react-native-webview`, bridging 5 native capabilities using same protocol as kmp-sdk                                                                                |
| **Shared Utilities**    | `common/`                    | TypeScript         | Poseidon, Merkle trees, passport parsing, certificates               | Production, used by all packages         | **95%** | No changes needed                                                                                                                                                                                           |
| **Self Wallet App**     | `app/`                       | React Native       | Full Self wallet (current production app)                            | Production                               | **N/A** | Eventually migrates to use the SDK WebView. For now, serves as **test environment** to validate moving code to the webview engine                                                                           |

## Native Handler Matrix

What each native shell must implement, and what the WebView handles instead.

| Handler        | Must be native?    | Kotlin SDK (Android) | Kotlin SDK (iOS) | RN SDK | WebView Fallback      |
| -------------- | ------------------ | -------------------- | ---------------- | ------ | --------------------- |
| **NFC**        | YES                | KEEP (497 LOC)       | BUILD            | BUILD  | None (hardware)       |
| **Camera/MRZ** | YES                | KEEP (247 LOC)       | Phase 2          | BUILD  | None (hardware)       |
| **Biometrics** | YES                | KEEP (142 LOC)       | BUILD            | BUILD  | None (OS prompt)      |
| **Keychain** ★ | YES (host decides) | KEEP (120 LOC)       | BUILD            | BUILD  | None (native-managed) |
| **Lifecycle**  | YES                | KEEP (91 LOC)        | BUILD            | BUILD  | None (Activity/VC)    |
| **Documents**  | NO                 | **DELETE** (146 LOC) | Skip             | Skip   | IndexedDB             |
| **Crypto**     | NO                 | **DELETE** (177 LOC) | Skip             | Skip   | Web Crypto API        |
| **Analytics**  | NO                 | **DELETE** (94 LOC)  | Skip             | Skip   | console/fetch         |
| **Haptic**     | NO                 | **DELETE** (94 LOC)  | Skip             | Skip   | Skip (not critical)   |

★ Keychain stays native because some host apps (like MiniPay) won't want the WebView touching their keychain directly.

## Savings Summary

| Metric                          | Current                                 | Optimized                           | Saved                       |
| ------------------------------- | --------------------------------------- | ----------------------------------- | --------------------------- |
| Kotlin Android handlers         | 9 (1608 LOC)                            | 5 (~1097 LOC)                       | −511 LOC                    |
| Kotlin iOS handlers to build    | 9                                       | 3 (NFC, Biometrics, Lifecycle)      | −6 handlers                 |
| Specs to maintain               | 8                                       | 7 (−2 deleted, +1 new)              | −1 spec                     |
| Entire Kotlin packages to build | 3 (kmp-sdk, common-lib, proving-client) | 1 (kmp-sdk)                         | −2 packages                 |
| RN SDK new code                 | —                                       | ~200–300 LOC (thin WebView wrapper) | Shares 95% with Kotlin path |

## Bridge Protocol (Reference)

All communication between native shells and the WebView uses a versioned JSON protocol over `postMessage`.

### Message Types

```
Request  (WebView → Native)
├── type: "request"
├── version: 1
├── id: UUID
├── domain: BridgeDomain
├── method: string
├── params: Record<string, any>
└── timestamp: number

Response (Native → WebView)
├── type: "response"
├── version: 1
├── id: UUID
├── domain: BridgeDomain
├── requestId: string
├── success: boolean
├── data?: any
└── error?: { code, message, details }

Event    (Native → WebView, unsolicited)
├── type: "event"
├── version: 1
├── id: UUID
├── domain: BridgeDomain
├── event: string
└── data: any
```

### Transport

| Platform     | WebView → Native                                                | Native → WebView                                                               |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Android      | `window.SelfNativeAndroid.postMessage(json)`                    | `evaluateJavascript("window.SelfNativeBridge._handleResponse(json)")`          |
| iOS          | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` | `evaluateJavaScript("window.SelfNativeBridge._handleResponse(json)")`          |
| React Native | `window.ReactNativeWebView.postMessage(json)`                   | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse(json)")` |

### Timeouts

| Domain                              | Default Timeout |
| ----------------------------------- | --------------- |
| NFC                                 | 120 seconds     |
| All others                          | 30 seconds      |
| Fire-and-forget (analytics, haptic) | No timeout      |

## Parallel Workstreams

```
Person 1 — WebView UI + Bridge
├── webview-app screens
├── webview-bridge adapters (biometrics, camera)
├── Web fallback adapters (IndexedDB, Web Crypto)
└── SelfClientProvider wiring

Person 2 — Kotlin Native Shell
├── kmp-sdk: delete 4 handlers, keep 5
├── iOS: implement 3 handlers (NFC, Biometrics, Lifecycle)
├── Test app validation
└── MiniPay sample integration

Person 3 — SDK Core Adaptation
├── mobile-sdk-alpha: finish RN dep removal
├── Browser entry point exports
├── WebView lifecycle events
└── Web fallback adapter implementations

New — RN Native Shell
├── <SelfVerification /> component
├── 5 native handler bridges (same protocol)
├── Package setup + publishing
└── Integration test with Self Wallet
```

## Self Wallet Migration Path

The Self Wallet app (`app/`) is currently a full React Native app with its own NFC, proving, and UI code. The migration plan:

1. **Now**: Self Wallet serves as a **test environment** for validating code moved from `app/` into the webview engine (`mobile-sdk-alpha`).
2. **Phase 2**: Once the SDK ships to production (MiniPay integration works), Self Wallet integrates the `<SelfVerification />` RN component for its verification flow.
3. **Phase 3**: Remaining Self Wallet features (document management, settings) can optionally migrate to the WebView or stay native — product decision.

This avoids a risky big-bang migration while ensuring the SDK is battle-tested before Self Wallet depends on it.
