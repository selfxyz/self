# Self Mobile SDK — Architecture & Implementation Spec

> Last updated: 2026-02-17

## Why

MiniPay (Celo) needs to embed Self's identity verification in their KMP app. Other integrators use React Native. Today the wallet is a monolithic React Native app. We're rebuilding it as:
- A **WebView engine** (core logic + state machines) backed by **web-native fallbacks** — published as npm packages
- A **WebView UI** (React + Vite) — the verification flow screens
- **Two thin native shells** — one Kotlin (for KMP hosts like MiniPay) and one React Native (for RN hosts like Self Wallet) — each hosting a WebView and bridging only what the browser cannot do

**Key principle:** One WebView engine, two thin native shells, zero duplicated logic.

---

## Architecture Overview

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

---

## Workstreams

| Person | Scope | Delivers |
|--------|-------|----------|
| **Person 1** | WebView UI + Bridge JS | `@selfxyz/webview-bridge` (npm), `@selfxyz/webview-app` (Vite bundle), web fallback adapters |
| **Person 2** | Kotlin Native Shell | `packages/kmp-sdk/` → AAR + XCFramework (5 handlers Android, 3 handlers iOS) |
| **Person 3** | SDK Core Adaptation | `@selfxyz/mobile-sdk-alpha` — platform-agnostic for browser/WebView |
| **New** | RN Native Shell | `packages/rn-sdk/` — `<SelfVerification />` thin WebView wrapper component |

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

Detailed specs:
- [SPEC-WEBVIEW-UI.md](./SPEC-WEBVIEW-UI.md) — UI / WebView / Bridge JS
- [SPEC-KMP-SDK.md](./SPEC-KMP-SDK.md) — Kotlin Native Shell (5 Android handlers, 3 iOS handlers)
- [SPEC-IOS-HANDLERS.md](./SPEC-IOS-HANDLERS.md) — iOS handlers (NFC, Biometrics, Lifecycle only)
- [SPEC-MINIPAY-SAMPLE.md](./SPEC-MINIPAY-SAMPLE.md) — MiniPay sample app integration
- [SPEC-PERSON3-SDK-CORE.md](./SPEC-PERSON3-SDK-CORE.md) — SDK Core Adaptation (making `mobile-sdk-alpha` work in WebView with web fallbacks)
- [SPEC-RN-SDK.md](./SPEC-RN-SDK.md) — RN Native Shell (`<SelfVerification />` WebView wrapper component)

---

## Module Table

| Module | Codebase Location | Language | What It Does | Status | % Done |
|--------|------------------|----------|-------------|--------|--------|
| **WebView Engine** | `packages/mobile-sdk-alpha/` | TypeScript | Core proving logic, state machines, adapter interfaces | Working, 275 tests pass | **80%** |
| **WebView UI** | `packages/webview-app/` | TypeScript (React) | 9 screens: country, ID, camera, NFC, confirm, prove, result | All screens built, Vite bundle | **75%** |
| **Bridge Protocol** | `packages/webview-bridge/` | TypeScript | JSON messaging, 10 domains, 9 adapters, timeout/error handling | 44 tests pass | **78%** |
| **Kotlin Native Shell** | `packages/kmp-sdk/` | Kotlin | Android: 5 handlers + WebView host. iOS: 3 handlers | Android implemented (1608 LOC, trimming 4 handlers) | **75%** |
| **RN Native Shell** | `packages/rn-sdk/` — **NEW** | React Native | `<SelfVerification />` WebView wrapper, 5 native handlers | Does not exist yet | **0%** |
| **Shared Utilities** | `common/` | TypeScript | Poseidon, Merkle trees, passport parsing, certificates | Production | **95%** |
| **Self Wallet App** | `app/` | React Native | Full Self wallet (current production app) | Production | **N/A** |

---

## Shared Contract: Bridge Protocol

This is the interface all native shells implement. It is the only coupling between native and web code.

### Message Format (JSON over postMessage)

```typescript
// WebView → Native (request)
{
  type: "request",
  version: 1,
  id: "uuid-v4",           // correlation ID
  domain: "nfc",            // see domain catalog below
  method: "scan",           // method within domain
  params: { ... },          // JSON-serializable payload
  timestamp: 1234567890
}

// Native → WebView (response)
{
  type: "response",
  version: 1,
  id: "uuid-v4",
  domain: "nfc",
  requestId: "uuid-of-request",
  success: true,
  data: { ... },            // result when success=true
  error: null,              // BridgeError when success=false
  timestamp: 1234567890
}

// Native → WebView (unsolicited event)
{
  type: "event",
  version: 1,
  id: "uuid-v4",
  domain: "nfc",
  event: "scanProgress",
  data: { step: "reading_dg1", percent: 40 },
  timestamp: 1234567890
}
```

### Error Format

```typescript
{ code: "NFC_NOT_SUPPORTED", message: "...", details?: { ... } }
```

### Domain Catalog

| Domain | Methods | Events | Handling | Notes |
|--------|---------|--------|----------|-------|
| `nfc` | `scan`, `cancelScan`, `isSupported` | `scanProgress`, `tagDiscovered`, `scanError` | **Native** | 120s timeout, progress streaming |
| `biometrics` | `authenticate`, `isAvailable`, `getBiometryType` | — | **Native** | Required for key access |
| `secureStorage` | `get`, `set`, `remove` | — | **Native** | Keychain — host app controls access |
| `camera` | `scanMRZ`, `isAvailable` | — | **Native** | MRZ OCR from camera |
| `lifecycle` | `ready`, `dismiss`, `setResult` | — | **Native** | WebView to host app communication |
| `crypto` | `sign`, `generateKey`, `getPublicKey` | — | **Native** (sign only) | `hash()` uses Web Crypto inside WebView |
| `documents` | `loadCatalog`, `saveCatalog`, `loadById`, `save`, `delete` | — | **Web** (IndexedDB) | No bridge round-trip needed |
| `analytics` | `trackEvent`, `trackNfcEvent`, `logNfcEvent` | — | **Web** (console/fetch) | Fire-and-forget, no PII |
| `haptic` | `trigger` | — | **Web** (skipped) | Not critical, omitted |
| `navigation` | `goBack`, `goTo` | — | **Web** (React Router) | WebView-internal only |

**Summary:** 5 domains bridge to native (nfc, biometrics, secureStorage, camera, lifecycle). `crypto.sign` also bridges to native, but `crypto.hash` uses Web Crypto. 4 domains are handled entirely in the WebView (documents, analytics, haptic, navigation).

### NFC Scan Params (most complex domain)

```typescript
{
  passportNumber: string,
  dateOfBirth: string,     // YYMMDD
  dateOfExpiry: string,    // YYMMDD
  canNumber?: string,
  skipPACE?: boolean,
  skipCA?: boolean,
  extendedMode?: boolean,
  usePacePolling?: boolean,
  sessionId: string,
  useCan?: boolean,
  userId?: string
}
```

### NFC Scan Result

```typescript
{
  passportData: {
    mrz: string,
    dsc: string,            // PEM certificate
    dg1Hash: number[],
    dg2Hash: number[],
    dgPresents: number[],
    eContent: number[],
    signedAttr: number[],
    encryptedDigest: number[],
    documentType: string,   // "passport" | "id_card"
    documentCategory: string,
    parsed: boolean,
    mock: boolean
  }
}
```

### Transport Mechanism

| Platform | WebView to Native | Native to WebView |
|----------|------------------|------------------|
| **Android** | `window.SelfNativeAndroid.postMessage(json)` via `addJavascriptInterface` | `evaluateJavascript("window.SelfNativeBridge._handleResponse(json)")` |
| **iOS** | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` via `WKScriptMessageHandler` | `evaluateJavaScript("window.SelfNativeBridge._handleResponse(json)")` |
| **React Native** | `window.ReactNativeWebView.postMessage(json)` | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse(json)")` |

**JS side** (injected at document start by native, or self-initializing in WebViewBridge class):
```javascript
window.SelfNativeBridge = {
  _pending: {},  // id → { resolve, reject, timeout }
  _listeners: {}, // domain:event → [callback]

  request(domain, method, params) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const msg = { type: "request", version: 1, id, domain, method, params, timestamp: Date.now() };
      this._pending[id] = { resolve, reject, timeout: setTimeout(() => { ... }, 30000) };
      // Android: SelfNativeAndroid.postMessage(JSON.stringify(msg))
      // iOS: webkit.messageHandlers.SelfNativeIOS.postMessage(JSON.stringify(msg))
      // RN: window.ReactNativeWebView.postMessage(JSON.stringify(msg))
    });
  },

  _handleResponse(json) { /* resolve/reject pending promise by requestId */ },
  _handleEvent(json) { /* dispatch to listeners by domain:event */ },
  on(domain, event, cb) { /* register listener */ },
  off(domain, event, cb) { /* unregister listener */ },
};
```

### Timeouts

| Domain | Default Timeout |
|--------|----------------|
| NFC | 120 seconds |
| All others | 30 seconds |
| Fire-and-forget (analytics, haptic) | No timeout |

---

## Native Handler Matrix

What each native shell must implement, and what the WebView handles instead.

| Handler | Must be native? | Kotlin SDK (Android) | Kotlin SDK (iOS) | RN SDK | WebView Fallback |
|---------|-----------------|---------------------|-------------------|--------|-----------------|
| **NFC** | YES | KEEP (497 LOC) | BUILD | BUILD | None (hardware) |
| **Camera/MRZ** | YES | KEEP (247 LOC) | Phase 2 | BUILD | None (hardware) |
| **Biometrics** | YES | KEEP (142 LOC) | BUILD | BUILD | None (OS prompt) |
| **Keychain** | YES (host decides) | KEEP (120 LOC) | BUILD | BUILD | None (native-managed) |
| **Lifecycle** | YES | KEEP (91 LOC) | BUILD | BUILD | None (Activity/VC) |
| **Documents** | NO | **DELETE** (146 LOC) | Skip | Skip | IndexedDB |
| **Crypto** | NO | **DELETE** (177 LOC) | Skip | Skip | Web Crypto API |
| **Analytics** | NO | **DELETE** (94 LOC) | Skip | Skip | console/fetch |
| **Haptic** | NO | **DELETE** (94 LOC) | Skip | Skip | Skip (not critical) |

Keychain stays native because some host apps (like MiniPay) will not want the WebView touching their keychain directly.

---

## Adapter Mapping

How `mobile-sdk-alpha` adapter interfaces map to bridge domains or web-native fallbacks:

| SDK Adapter Interface | Bridge to Native? | Implementation | Notes |
|----------------------|-------------------|----------------|-------|
| `NFCScannerAdapter` | Yes | `nfc.scan` bridge | Core flow: scan passport NFC chip |
| `CryptoAdapter.sign()` | Yes | `crypto.sign` bridge | Native secure enclave |
| `CryptoAdapter.hash()` | No | Web Crypto API | Runs entirely in WebView |
| `AuthAdapter` | Yes | `secureStorage.get` bridge (with `requireBiometric: true`) | Private key gated by biometrics |
| `StorageAdapter` | Yes | `secureStorage.*` bridge | Only for keychain access (native-managed) |
| `DocumentsAdapter` | No | IndexedDB | Runs entirely in WebView |
| `AnalyticsAdapter` | No | console/fetch | Runs entirely in WebView |
| `NavigationAdapter` | No | React Router | WebView-internal |
| `NetworkAdapter` | No | `fetch()` | Works in WebView |
| `ClockAdapter` | No | `Date.now()` + `setTimeout` | Works in WebView |
| `LoggerAdapter` | No | `console.*` | Works in WebView |

---

## How the Pieces Connect

```
Person 1 delivers:                     Person 2 delivers:

@selfxyz/webview-bridge (npm)         Kotlin Native Shell (AAR + XCFramework)
@selfxyz/webview-app (Vite bundle)    ├─ WebView host (Android + iOS)
  ↓                                   ├─ 5 native bridge handlers
  ↓ dist/index.html + bundle.js       ├─ Asset bundling
  ↓                                   ├─ SelfSdk.launch() API
  └────── bundled into ──────────────→ Kotlin SDK artifact

                                       New delivers:
Person 3 delivers:
                                       RN Native Shell (@selfxyz/rn-sdk)
@selfxyz/mobile-sdk-alpha (npm)       ├─ <SelfVerification /> component
  ↓                                   ├─ 5 native handler bridges
  ↓ core logic, adapters,             ├─ Same bridge protocol as Kotlin shell
  ↓ web fallbacks                     ├─ Loads same Vite bundle
  └────── imported by ───────────────→ webview-app + rn-sdk
```

**Kotlin path:** Person 2's Gradle/SPM build copies Person 1's Vite output (`dist/`) into the SDK's bundled assets. The KMP test app launches a WebView and loads `dist/index.html`.

**RN path:** The `<SelfVerification />` component wraps `react-native-webview`, loads the same Vite bundle, and bridges the same 5 native capabilities using `window.ReactNativeWebView.postMessage`.

**Bridge contract:** All three native transports (Android, iOS, RN) implement the same JSON protocol. Person 1 tests with `MockNativeBridge` (JS). Person 2 tests with a mock WebView that sends/receives bridge JSON. The RN shell tests end-to-end within Self Wallet.

---

## Self Wallet Migration Path

The Self Wallet app (`app/`) is currently a full React Native app with its own NFC, proving, and UI code. The migration plan:

1. **Now**: Self Wallet serves as a **test environment** for validating code moved from `app/` into the webview engine (`mobile-sdk-alpha`). As chunks of logic are extracted and proven to work in the WebView, confidence grows.
2. **Phase 2**: Once the SDK ships to production (MiniPay integration works), Self Wallet integrates the `<SelfVerification />` RN component for its verification flow. This replaces the current native verification screens with the shared WebView flow.
3. **Phase 3**: Remaining Self Wallet features (document management, settings) can optionally migrate to the WebView or stay native — product decision.

This avoids a risky big-bang migration while ensuring the SDK is battle-tested before Self Wallet depends on it.

---

## Savings Summary

| Metric | Current | Optimized | Saved |
|--------|---------|-----------|-------|
| Kotlin Android handlers | 9 (1608 LOC) | 5 (~1097 LOC) | -511 LOC |
| Kotlin iOS handlers to build | 9 | 3 (NFC, Biometrics, Lifecycle) | -6 handlers |
| Specs to maintain | 8 | 7 (-2 deleted, +1 new) | -1 spec |
| Entire Kotlin packages to build | 3 (kmp-sdk, common-lib, proving-client) | 1 (kmp-sdk) | -2 packages |
| RN SDK new code | -- | ~200-300 LOC (thin WebView wrapper) | Shares 95% with Kotlin path |

---

## Dependency Graph

```
Phase 1 (parallel — no inter-dependencies):
  Chunk 1F (bridge package)           ──→ Chunk 1E (app shell)
  Chunk 2A (KMP setup + bridge)       ──→ Chunks 2B, 2C
  Person 3 (SDK core adaptation)      ──→ web fallback adapters

Phase 2 (parallel — after Phase 1):
  Chunk 1B, 1C, 1D (UI screens)      ──→ Chunk 1E (app shell)
  Chunk 2B (Android 5 handlers)       ──→ Chunk 2F (SDK API + test app)
  Chunk 2C (iOS 3 handlers)           ──→ Chunk 2F
  RN SDK (new)                        ──→ Uses bridge from Phase 1

Phase 3 (integration):
  Chunk 1E (Vite bundle)              ──→ Final integration
  Chunk 2F (Kotlin SDK artifact)      ──→ Final integration
  RN SDK + Self Wallet                ──→ Final integration
```

---

## Design Tokens (shared across all shells)

### Colors (from `packages/mobile-sdk-alpha/src/constants/colors.ts`)

| Token | Value | Usage |
|-------|-------|-------|
| `black` | `#000000` | Primary text, buttons |
| `white` | `#ffffff` | Backgrounds |
| `amber50` | `#FFFBEB` | Button text on dark bg |
| `slate50` | `#F8FAFC` | Page backgrounds |
| `slate300` | `#CBD5E1` | Borders |
| `slate400` | `#94A3B8` | Placeholder text |
| `slate500` | `#64748B` | Secondary text |
| `blue600` | `#2563EB` | Links, accents |
| `green500` / `green600` | `#22C55E` / `#16A34A` | Success states |
| `red500` / `red600` | `#EF4444` / `#DC2626` | Error states |

### Fonts

| Token | Family | File |
|-------|--------|------|
| `advercase` | `Advercase-Regular` | `Advercase-Regular.otf` |
| `dinot` | `DINOT-Medium` | `DINOT-Medium.otf` |
| `dinotBold` | `DINOT-Bold` | `DINOT-Bold.otf` |
| `plexMono` | `IBMPlexMono-Regular` | `IBMPlexMono-Regular.otf` |

Font files are at `app/web/fonts/`.

### Tamagui Config

Both `app/tamagui.config.ts` and `packages/webview-app/tamagui.config.ts` share the same configuration. Key: extends `@tamagui/config/v3` with custom fonts (advercase, dinot, plexMono) using `createFont()` with shared size/lineHeight/letterSpacing scales.

---

## Verification Plan

### Person 1 validates:
```bash
# Build bridge package
cd packages/webview-bridge && npm run build && npx vitest run

# Build WebView app
cd packages/webview-app && npx tsc --noEmit && npx vite build

# Dev server for visual testing
cd packages/webview-app && npx vite dev  # → http://localhost:5173
```

### Person 2 validates:
```bash
# Compile shared module
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinJvm
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Compile Android
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid

# Compile iOS (3 handlers only: NFC, Biometrics, Lifecycle)
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64

# Test app
cd packages/kmp-test-app && ./gradlew :androidApp:installDebug
```

### Person 3 validates:
```bash
# Run SDK core tests
cd packages/mobile-sdk-alpha && npx vitest run

# Verify web fallback adapters work in browser
cd packages/mobile-sdk-alpha && npx vitest run --filter="IndexedDB|WebCrypto|fallback"
```

### RN SDK validates:
```bash
# Build RN package
cd packages/rn-sdk && npm run build

# Integration test in Self Wallet
cd app && npx react-native run-ios  # or run-android
```

### Integration test:
1. Person 1 runs `vite build` to produce `dist/`
2. **Kotlin path:** Person 2 copies `dist/` into KMP test app assets. KMP test app launches WebView, loads `dist/index.html`
3. **RN path:** `<SelfVerification />` loads the same Vite bundle via `react-native-webview`
4. Tap "Launch Verification" — WebView renders screens
5. Bridge messages flow between JS and native (visible in console)
6. NFC scan on physical device with real passport (final validation)

---

## Key Reference Files

| File | What it Contains |
|------|-----------------|
| `packages/mobile-sdk-alpha/src/types/public.ts` | All adapter interfaces (NFCScannerAdapter, CryptoAdapter, etc.) |
| `packages/mobile-sdk-alpha/src/constants/colors.ts` | Color tokens |
| `packages/mobile-sdk-alpha/src/constants/fonts.ts` | Font family names |
| `packages/webview-bridge/src/` | Bridge protocol types, adapters, message handling |
| `app/tamagui.config.ts` | Tamagui configuration (fonts, scales) |
| `app/web/fonts/` | Font files (otf) |
| `app/android/.../RNPassportReaderModule.kt` | Android NFC implementation to port |
| `app/ios/PassportReader.swift` | iOS NFC implementation to reference |
| `app/src/screens/` | Existing RN app screens (UI reference) |
