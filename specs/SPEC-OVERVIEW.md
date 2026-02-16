# Self Mobile SDK — Architecture & Implementation Spec

## Why

MiniPay (Celo) needs to embed Self's identity verification in their KMP app. Today the wallet is a monolithic React Native app. We're rebuilding it as:
- A **React WebView** (UI layer) — published as npm packages
- A **single KMP module** (native layer) — hosts the WebView and provides NFC, biometrics, storage, camera, crypto via a bridge

MiniPay expects a single Kotlin Multiplatform interface that works on both iOS and Android.

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│  Host App (MiniPay, Self Wallet, etc.)       │
│  ↓ calls SelfSdk.launch(request, callback)   │
├──────────────────────────────────────────────┤
│  KMP SDK (single Kotlin module)              │
│  shared/                                      │
│    commonMain/  Bridge protocol, MessageRouter│
│                 SDK public API, data models   │
│    androidMain/ WebView host (Android WebView)│
│                 NFC (JMRTD), Biometrics,      │
│                 SecureStorage, Camera, Crypto  │
│    iosMain/     WebView host (WKWebView)      │
│                 NFC (CoreNFC), Biometrics,     │
│                 SecureStorage, Camera, Crypto  │
├──────────────────────────────────────────────┤
│  Bridge Layer (postMessage JSON protocol)     │
├──────────────────────────────────────────────┤
│  WebView (bundled inside SDK artifact)        │
│    @selfxyz/webview-bridge → npm (protocol)   │
│    @selfxyz/webview-app    → Vite bundle      │
│    @selfxyz/mobile-sdk-alpha → core logic     │
│    Vite build → single HTML + JS bundle       │
└──────────────────────────────────────────────┘
```

**Key principle:** No separate `android-sdk/` or `ios-sdk/` modules. Everything is in `shared/` using KMP `expect/actual`. MiniPay gets one dependency that works on both platforms.

---

## Workstreams

| Person | Scope | Delivers |
|--------|-------|----------|
| **Person 1** | UI + WebView + Bridge JS | `@selfxyz/webview-bridge` (npm), `@selfxyz/webview-app` (Vite bundle) |
| **Person 2** | KMP SDK + Native Handlers + Test App | `packages/kmp-sdk/` → AAR + XCFramework, test app |

Detailed specs:
- [SPEC-WEBVIEW-UI.md](./SPEC-WEBVIEW-UI.md) — UI / WebView / Bridge JS
- [SPEC-KMP-SDK.md](./SPEC-KMP-SDK.md) — KMP SDK / Native Handlers (Android complete, iOS stubs)
- [SPEC-IOS-HANDLERS.md](./SPEC-IOS-HANDLERS.md) — iOS handlers via Swift wrapper pattern
- [SPEC-COMMON-LIB.md](./SPEC-COMMON-LIB.md) — Pure Kotlin common library (Poseidon, trees, parsing)
- [SPEC-PROVING-CLIENT.md](./SPEC-PROVING-CLIENT.md) — Native proving client (headless, no WebView)
- [SPEC-MINIPAY-SAMPLE.md](./SPEC-MINIPAY-SAMPLE.md) — MiniPay sample app (headless demo)

---

## Shared Contract: Bridge Protocol

This is the interface both workstreams implement. It's the only coupling between them.

### Message Format (JSON over postMessage)

```typescript
// WebView → Native (request)
{
  type: "request",
  version: 1,
  id: "uuid-v4",           // correlation ID
  domain: "nfc",            // see domain list below
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

| Domain | Methods | Events | Notes |
|--------|---------|--------|-------|
| `nfc` | `scan`, `cancelScan`, `isSupported` | `scanProgress`, `tagDiscovered`, `scanError` | 120s timeout, progress streaming |
| `biometrics` | `authenticate`, `isAvailable`, `getBiometryType` | — | Required for key access |
| `secureStorage` | `get`, `set`, `remove` | — | Encrypted key-value store |
| `camera` | `scanMRZ`, `isAvailable` | — | MRZ OCR from camera |
| `crypto` | `sign`, `generateKey`, `getPublicKey` | — | `hash()` stays in WebView (Web Crypto API) |
| `haptic` | `trigger` | — | Fire-and-forget |
| `analytics` | `trackEvent`, `trackNfcEvent`, `logNfcEvent` | — | Fire-and-forget, no PII |
| `lifecycle` | `ready`, `dismiss`, `setResult` | — | WebView → host app communication |
| `documents` | `loadCatalog`, `saveCatalog`, `loadById`, `save`, `delete` | — | Encrypted document CRUD |
| `navigation` | `goBack`, `goTo` | — | WebView-internal only (no bridge round-trip) |

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

**Android:**
- WebView → Native: `addJavascriptInterface("SelfNativeAndroid")` exposes `postMessage(json)` to JS
- Native → WebView: `evaluateJavascript("window.SelfNativeBridge._handleResponse('...')")` and `_handleEvent('...')`

**iOS:**
- WebView → Native: `WKScriptMessageHandler` named `"SelfNativeIOS"` receives `postMessage(json)`
- Native → WebView: `evaluateJavaScript("window.SelfNativeBridge._handleResponse('...')")` and `_handleEvent('...')`

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
    });
  },

  _handleResponse(json) { /* resolve/reject pending promise by requestId */ },
  _handleEvent(json) { /* dispatch to listeners by domain:event */ },
  on(domain, event, cb) { /* register listener */ },
  off(domain, event, cb) { /* unregister listener */ },
};
```

---

## Adapter Mapping

How `mobile-sdk-alpha` adapter interfaces map to bridge domains:

| SDK Adapter Interface | Bridge? | Bridge Domain.Method | Notes |
|----------------------|---------|---------------------|-------|
| `NFCScannerAdapter` | Yes | `nfc.scan` | Core flow: scan passport NFC chip |
| `CryptoAdapter.hash()` | No | — | Web Crypto API in WebView |
| `CryptoAdapter.sign()` | Yes | `crypto.sign` | Native secure enclave |
| `AuthAdapter` | Yes | `secureStorage.get` (with `requireBiometric: true`) | Private key gated by biometrics |
| `DocumentsAdapter` | Yes | `documents.*` | CRUD on encrypted passport data |
| `StorageAdapter` | Yes | `secureStorage.*` | Key-value storage |
| `NavigationAdapter` | No | — | React Router (WebView-internal) |
| `NetworkAdapter` | No | — | `fetch()` works in WebView |
| `ClockAdapter` | No | — | `Date.now()` + `setTimeout` |
| `AnalyticsAdapter` | Yes | `analytics.*` | Fire-and-forget |
| `LoggerAdapter` | No | — | Console in WebView |

---

## How the Pieces Connect

```
Person 1 delivers:                     Person 2 delivers:

@selfxyz/webview-bridge (npm)         KMP SDK (AAR + XCFramework)
@selfxyz/webview-app (Vite bundle)    ├─ WebView host
  ↓                                   ├─ Native bridge handlers
  ↓ dist/index.html + bundle.js       ├─ Asset bundling
  ↓                                   ├─ SelfSdk.launch() API
  └────── bundled into ──────────────→ SDK artifact
```

**Integration point:** Person 2's Gradle/SPM build copies Person 1's Vite output (`dist/`) into the SDK's bundled assets. During development, Person 2 uses a mock HTML page or connects to Person 1's Vite dev server (`http://10.0.2.2:5173`).

**Bridge contract:** Both sides implement the same JSON protocol. Person 1 tests with `MockNativeBridge` (JS). Person 2 tests with a mock WebView that sends/receives bridge JSON.

---

## Dependency Graph

```
Phase 1 (parallel — no inter-dependencies):
  Chunk 1F (bridge package)           ──→ Chunk 1E (app shell)
  Chunk 2A (KMP setup + bridge)       ──→ Chunks 2B, 2C, 2D, 2E

Phase 2 (parallel — after Phase 1):
  Chunk 1B, 1C, 1D (UI screens)      ──→ Chunk 1E (app shell)
  Chunks 2B, 2C (Android)            ──→ Chunk 2F (SDK API + test app)
  Chunks 2D, 2E (iOS)                ──→ Chunk 2F

Phase 3 (integration):
  Chunk 1E (app shell output)         ──→ Final integration
  Chunk 2F (SDK API + test app)       ──→ Final integration
```

---

## Cleanup: What to Delete Before Starting

The previous prototype code should be deleted:

| Path | Reason |
|------|--------|
| `packages/webview-bridge/` | Will be recreated with same name but clean implementation |
| `packages/webview-app/` | Will be recreated with proper architecture |
| `packages/kmp-shell/` | Will be recreated as `packages/kmp-sdk/` |

**Keep:** `packages/mobile-sdk-alpha/` changes (Platform.OS removal, platform config).

---

## Design Tokens (shared between Person 1 and Person 2)

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

# Compile iOS
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64

# Test app
cd packages/kmp-test-app && ./gradlew :androidApp:installDebug
```

### Integration test:
1. Person 1 runs `vite build` → produces `dist/`
2. Person 2 copies `dist/` into KMP test app assets
3. KMP test app launches WebView → loads `dist/index.html`
4. Tap "Launch Verification" → WebView renders screens
5. Bridge messages flow between JS and native (visible in console)
6. NFC scan on physical device with real passport (final validation)

---

## Key Reference Files

| File | What it Contains |
|------|-----------------|
| `packages/mobile-sdk-alpha/src/types/public.ts` | All adapter interfaces (NFCScannerAdapter, CryptoAdapter, etc.) |
| `packages/mobile-sdk-alpha/src/constants/colors.ts` | Color tokens |
| `packages/mobile-sdk-alpha/src/constants/fonts.ts` | Font family names |
| `app/tamagui.config.ts` | Tamagui configuration (fonts, scales) |
| `app/web/fonts/` | Font files (otf) |
| `app/android/.../RNPassportReaderModule.kt` | Android NFC implementation to port |
| `app/ios/PassportReader.swift` | iOS NFC implementation to reference |
| `app/src/screens/` | Existing RN app screens (UI reference) |
