# Self SDK — Architecture Specification

> Last updated: 2026-02-17
> Owner: Self Engineering
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app (MiniPay, Self Wallet, others) — some Kotlin (KMP), some React Native — with zero duplicated logic.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire verification flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status Checklist

- [x] Architecture finalized (WebView engine + two native shells)
- [x] Bridge protocol defined and tested (62 tests pass)
- [x] WebView UI screens built (10 screens, routing works)
- [x] WebView engine core working (275+ tests pass, XState proving machine)
- [x] Android native shell implemented (5 handlers, WebView host, Activity)
- [ ] Delete 4 unnecessary Android handlers (documents, crypto, analytics, haptic)
- [ ] iOS native shell implemented (Swift providers via PR #1762, not yet merged)
- [ ] Biometrics bridge adapter (domain defined, no adapter implementation)
- [ ] Camera bridge adapter wiring in webview-app
- [ ] Web fallback adapters (IndexedDB for docs, Web Crypto for hashing)
- [ ] Browser entry point with zero RN transitive imports
- [ ] RN SDK (`<SelfVerification />` component — does not exist yet)
- [ ] MiniPay sample integration
- [ ] Dynamic proof request items (currently hardcoded in ProvingScreen)
- [ ] MRZ data confirmation screen (PR #1767, not yet merged)
- [ ] Self Wallet migration to `<SelfVerification />`
- [ ] Production publishing (npm + AAR + XCFramework)

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
          │  10 screens, router     │
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

1. **One WebView engine, two thin native shells, zero duplicated logic.** All core logic lives in TypeScript inside the WebView. Native code is the minimum required glue.
2. **Only bridge to native what the browser cannot do.** NFC, camera, biometrics, and lifecycle require hardware/OS APIs. Keychain stays native because the host app controls access. Everything else runs in the WebView.
3. **TypeScript is the primary surface area.** ZK circuits are the backend. The proving machine, state machines, stores, document management, and UI all run as TypeScript in the WebView. If you're writing logic in Kotlin or Swift, you're doing it wrong.
4. **The bridge protocol is the only coupling.** Native shells and the WebView share a JSON contract, not code. Any native shell that implements the protocol works with the same WebView bundle.
5. **Self Wallet is the test environment, not the target.** The SDK ships to third-party hosts (MiniPay). Self Wallet validates the SDK before others depend on it, then migrates to use it.

## Module Table

| Module                  | Location                     | Language               | What It Does                                                                                | Status                                                      | % Done  | Action Needed                                                                                                                     |
| ----------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **WebView Engine**      | `packages/mobile-sdk-alpha/` | TypeScript             | Proving machine (XState), stores (Zustand), adapter interfaces, 105 source files            | 275+ tests pass, RN adapters built                          | **80%** | Browser entry point with zero RN imports. Web fallback adapters (IndexedDB, Web Crypto). Finish decoupling core from RN peer deps |
| **WebView UI**          | `packages/webview-app/`      | TypeScript (React)     | 10 screens: home, country, ID, camera, NFC, confirm, proving, result, settings, coming-soon | All screens render, routing works, bridge integration wired | **75%** | Biometrics + camera adapter wiring. Dynamic proof request items. Wire SelfClientProvider to web fallback adapters                 |
| **Bridge Protocol**     | `packages/webview-bridge/`   | TypeScript             | JSON messaging, 10 domains, 9 adapters, timeout/error handling, mock transport              | 62 tests pass, production-ready protocol                    | **80%** | Add biometrics adapter (domain defined, no implementation). Web fallback adapters for documents/storage                           |
| **Kotlin Native Shell** | `packages/kmp-sdk/`          | Kotlin                 | Android: 9 handlers + WebView host + Activity. iOS: stubs (Swift providers in PR #1762)     | Android fully implemented, iOS stubs                        | **70%** | Delete 4 handlers (documents, crypto, analytics, haptic). iOS: implement via Swift provider pattern                               |
| **Swift Providers**     | `packages/self-sdk-swift/`   | Swift                  | iOS native implementations: NFC, biometrics, crypto, secure storage, WebView hosting        | In PR #1762 (not merged)                                    | **30%** | Merge PR #1762. Complete NFC + biometrics + lifecycle providers                                                                   |
| **RN Native Shell**     | `packages/rn-sdk/` — **NEW** | React Native           | `<SelfVerification />` WebView wrapper, 5 native handler bridges                            | Does not exist                                              | **0%**  | Create thin wrapper: ~200-300 LOC, same bridge protocol as KMP                                                                    |
| **Shared Utilities**    | `common/`                    | TypeScript             | Poseidon, Merkle trees, passport parsing, certificates, 150+ files, 88+ exports             | Production, 98% browser-compatible                          | **95%** | No changes needed. Only 2 files require Node.js (optional)                                                                        |
| **Self Wallet App**     | `app/`                       | React Native (v0.76.9) | Full wallet: documents, NFC, proving, KYC, recovery, settings, Turnkey wallet               | Production (v2.9.16)                                        | **N/A** | Test environment for SDK. Eventually migrates to `<SelfVerification />`                                                           |

## Decision Matrix

| Capability      | Must be native?    | KMP Android              | KMP iOS       | RN SDK | WebView Fallback      |
| --------------- | ------------------ | ------------------------ | ------------- | ------ | --------------------- |
| **NFC**         | YES                | KEEP (497 LOC)           | BUILD (Swift) | BUILD  | None (hardware)       |
| **Camera/MRZ**  | YES                | KEEP (247 LOC)           | Phase 2       | BUILD  | None (hardware)       |
| **Biometrics**  | YES                | KEEP (142 LOC)           | BUILD (Swift) | BUILD  | None (OS prompt)      |
| **Keychain**    | YES (host decides) | KEEP (120 LOC)           | BUILD (Swift) | BUILD  | None (native-managed) |
| **Lifecycle**   | YES                | KEEP (91 LOC)            | DONE (86 LOC) | BUILD  | None (Activity/VC)    |
| **Documents**   | NO                 | **DELETE** (146 LOC)     | Skip          | Skip   | IndexedDB             |
| **Crypto hash** | NO                 | **DELETE** (177 LOC)     | Skip          | Skip   | Web Crypto API        |
| **Crypto sign** | YES                | KEEP (in crypto handler) | BUILD (Swift) | BUILD  | None (secure enclave) |
| **Analytics**   | NO                 | **DELETE** (94 LOC)      | Skip          | Skip   | console/fetch         |
| **Haptic**      | NO                 | **DELETE** (94 LOC)      | Skip          | Skip   | Not critical          |

## Impact Summary

| Metric                          | Current                                 | After                          | Saved                                  |
| ------------------------------- | --------------------------------------- | ------------------------------ | -------------------------------------- |
| Kotlin Android handlers         | 9 (1,608 LOC)                           | 5 (~1,097 LOC)                 | -511 LOC                               |
| Kotlin iOS handlers to build    | 9                                       | 3 (NFC, Biometrics, Lifecycle) | -6 handlers                            |
| Entire Kotlin packages to build | 3 (kmp-sdk, common-lib, proving-client) | 1 (kmp-sdk)                    | -2 packages                            |
| RN SDK new code                 | —                                       | ~200-300 LOC (thin wrapper)    | Shares 95% with Kotlin path            |
| Code shared across platforms    | ~20%                                    | ~95% (WebView engine)          | Massive reduction in per-platform work |

## Shared Contracts / Protocols

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

### Domain Catalog

| Domain          | Methods                                                    | Events                                       | Handling                | Notes                            |
| --------------- | ---------------------------------------------------------- | -------------------------------------------- | ----------------------- | -------------------------------- |
| `nfc`           | `scan`, `cancelScan`, `isSupported`                        | `scanProgress`, `tagDiscovered`, `scanError` | **Native**              | 120s timeout, progress streaming |
| `biometrics`    | `authenticate`, `isAvailable`, `getBiometryType`           | —                                            | **Native**              | Required for key access          |
| `secureStorage` | `get`, `set`, `remove`                                     | —                                            | **Native**              | Keychain — host app controls     |
| `camera`        | `scanMRZ`, `isAvailable`                                   | —                                            | **Native**              | MRZ OCR from camera              |
| `lifecycle`     | `ready`, `dismiss`, `setResult`                            | —                                            | **Native**              | WebView ↔ host communication     |
| `crypto`        | `sign`, `generateKey`, `getPublicKey`                      | —                                            | **Native** (sign)       | `hash()` uses Web Crypto         |
| `documents`     | `loadCatalog`, `saveCatalog`, `loadById`, `save`, `delete` | —                                            | **Web** (IndexedDB)     | No bridge round-trip             |
| `analytics`     | `trackEvent`, `trackNfcEvent`, `logNfcEvent`               | —                                            | **Web** (console/fetch) | Fire-and-forget                  |
| `haptic`        | `trigger`                                                  | —                                            | **Web** (skip)          | Not critical                     |
| `navigation`    | `goBack`, `goTo`                                           | —                                            | **Web** (React Router)  | WebView-internal                 |

### Adapter Interface Mapping

| SDK Adapter Interface  | Bridges to Native? | Implementation                                    | Notes                             |
| ---------------------- | ------------------ | ------------------------------------------------- | --------------------------------- |
| `NFCScannerAdapter`    | Yes                | `nfc.scan` bridge call                            | Core flow: scan passport NFC chip |
| `CryptoAdapter.sign()` | Yes                | `crypto.sign` bridge call                         | Native secure enclave             |
| `CryptoAdapter.hash()` | No                 | Web Crypto API                                    | Runs entirely in WebView          |
| `AuthAdapter`          | Yes                | `secureStorage.get` with `requireBiometric: true` | Private key gated by biometrics   |
| `StorageAdapter`       | Yes                | `secureStorage.*` bridge calls                    | Keychain access only              |
| `DocumentsAdapter`     | No                 | IndexedDB                                         | Runs entirely in WebView          |
| `AnalyticsAdapter`     | No                 | console/fetch                                     | Fire-and-forget                   |
| `NavigationAdapter`    | No                 | React Router                                      | WebView-internal                  |
| `NetworkAdapter`       | No                 | `fetch()`                                         | Works in WebView                  |
| `ClockAdapter`         | No                 | `Date.now()` + `setTimeout`                       | Works in WebView                  |
| `LoggerAdapter`        | No                 | `console.*`                                       | Works in WebView                  |

### Transport

| Platform         | WebView → Native                                                | Native → WebView                                                               |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Android**      | `window.SelfNativeAndroid.postMessage(json)`                    | `evaluateJavascript("window.SelfNativeBridge._handleResponse(json)")`          |
| **iOS**          | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` | `evaluateJavaScript("window.SelfNativeBridge._handleResponse(json)")`          |
| **React Native** | `window.ReactNativeWebView.postMessage(json)`                   | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse(json)")` |

### Timeouts

| Domain                              | Default Timeout |
| ----------------------------------- | --------------- |
| NFC                                 | 120 seconds     |
| All others                          | 30 seconds      |
| Fire-and-forget (analytics, haptic) | No timeout      |

### NFC Scan — I/O Example (Most Complex Domain)

**Request (WebView → Native):**

```json
{
  "type": "request",
  "version": 1,
  "id": "a1b2c3d4-...",
  "domain": "nfc",
  "method": "scan",
  "params": {
    "passportNumber": "AB1234567",
    "dateOfBirth": "900115",
    "dateOfExpiry": "300115",
    "sessionId": "sess-uuid",
    "skipPACE": false,
    "extendedMode": false
  },
  "timestamp": 1708200000000
}
```

**Event (Native → WebView, during scan):**

```json
{
  "type": "event",
  "version": 1,
  "id": "e5f6g7h8-...",
  "domain": "nfc",
  "event": "scanProgress",
  "data": { "step": "reading_dg1", "percent": 40 },
  "timestamp": 1708200005000
}
```

**Response (Native → WebView, on success):**

```json
{
  "type": "response",
  "version": 1,
  "id": "r9s0t1u2-...",
  "domain": "nfc",
  "requestId": "a1b2c3d4-...",
  "success": true,
  "data": {
    "passportData": {
      "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<",
      "dsc": "-----BEGIN CERTIFICATE-----\nMIIC...",
      "dg1Hash": [72, 101, 108, ...],
      "dg2Hash": [23, 45, 67, ...],
      "eContent": [...],
      "signedAttr": [...],
      "encryptedDigest": [...],
      "documentType": "passport",
      "parsed": true,
      "mock": false
    }
  },
  "timestamp": 1708200010000
}
```

**Error case — NFC not supported:**

```json
{
  "type": "response",
  "version": 1,
  "id": "r9s0t1u2-...",
  "domain": "nfc",
  "requestId": "a1b2c3d4-...",
  "success": false,
  "error": {
    "code": "NFC_NOT_SUPPORTED",
    "message": "Device does not support NFC"
  },
  "timestamp": 1708200001000
}
```

## Workstreams

```
Person 1 — WebView UI + Bridge          OVERVIEW | SPEC
├── webview-app screens + SelfClientProvider wiring
├── webview-bridge adapters (biometrics, camera)
├── Web fallback adapters (IndexedDB, Web Crypto)
└── Dynamic proof request items

Person 2 — Kotlin/Swift Native Shells   OVERVIEW | SPEC
├── kmp-sdk: delete 4 handlers, keep 5
├── iOS: Swift provider implementations (PR #1762)
├── Test app validation
└── MiniPay sample integration           integrations/OVERVIEW | integrations/SPEC

Person 3 — SDK Core Adaptation           OVERVIEW | SPEC
├── mobile-sdk-alpha: finish RN dep removal
├── Browser entry point exports (zero RN imports)
├── WebView lifecycle events
└── Web fallback adapter implementations

Person 4 — RN Native Shell (NEW)        OVERVIEW | SPEC
├── <SelfVerification /> component (~200-300 LOC)
├── 5 native handler bridges (same protocol)
├── Package setup + publishing
└── Integration test with Self Wallet
```

Links:
- Person 1: [Overview](./person1-webview/OVERVIEW.md) | [Spec](./person1-webview/SPEC.md)
- Person 2: [Overview](./person2-native-shells/OVERVIEW.md) | [Spec](./person2-native-shells/SPEC.md)
- Person 3: [Overview](./person3-sdk-core/OVERVIEW.md) | [Spec](./person3-sdk-core/SPEC.md)
- Person 4: [Overview](./person4-rn-sdk/OVERVIEW.md) | [Spec](./person4-rn-sdk/SPEC.md)
- Integrations: [Overview](./integrations/OVERVIEW.md) | [MiniPay Spec](./integrations/SPEC-MINIPAY-SAMPLE.md)

## Input / Output — System Level

**Input (host app launches verification):**

```typescript
// Kotlin (MiniPay)
SelfSdk.launch(
  activity = this,
  request = SelfVerificationRequest(
    userId = "user-uuid",
    disclosures = listOf("nationality", "date_of_birth", "document_expiry"),
    scope = "minipay-kyc-v1"
  ),
  callback = { result ->
    when (result) {
      is SelfVerificationResult.Success -> handleProof(result.proof)
      is SelfVerificationResult.Dismissed -> showCancelled()
      is SelfVerificationResult.Error -> showError(result.error)
    }
  }
)

// React Native (Self Wallet)
<SelfVerification
  userId="user-uuid"
  disclosures={["nationality", "date_of_birth"]}
  scope="self-wallet-v1"
  onComplete={(result) => handleResult(result)}
  onDismiss={() => navigation.goBack()}
/>
```

**Output (verification complete):**

```json
{
  "type": "proofGenerated",
  "proof": {
    "verified": true,
    "disclosures": {
      "nationality": "NLD",
      "date_of_birth": "1990-01-15",
      "document_expiry": "2030-01-15"
    },
    "circuitType": "register",
    "timestamp": 1708200060000
  }
}
```

**Error output:**

```json
{
  "type": "error",
  "error": {
    "code": "PASSPORT_NOT_SUPPORTED",
    "message": "This passport type is not supported for verification"
  }
}
```

## How the Pieces Connect

```
Person 1 delivers:                     Person 2 delivers:

@selfxyz/webview-bridge (npm)         Kotlin Native Shell (AAR + XCFramework)
@selfxyz/webview-app (Vite bundle)    ├─ WebView host (Android + iOS)
  ↓                                   ├─ 5 native bridge handlers
  ↓ dist/index.html + bundle.js       ├─ Asset bundling
  ↓                                   ├─ SelfSdk.launch() API
  └────── bundled into ──────────────→ Kotlin SDK artifact

                                       Person 4 delivers:
Person 3 delivers:
                                       RN Native Shell (@selfxyz/rn-sdk)
@selfxyz/mobile-sdk-alpha (npm)       ├─ <SelfVerification /> component
  ↓                                   ├─ 5 native handler bridges
  ↓ core logic, adapters,             ├─ Same bridge protocol as Kotlin shell
  ↓ web fallbacks                     ├─ Loads same Vite bundle
  └────── imported by ───────────────→ webview-app + rn-sdk
```

## In-Flight PRs

| PR                                                    | Title                                           | Impact                                                                                                                                           | Files                    | Status |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------ |
| [#1762](https://github.com/selfxyz/selfapp/pull/1762) | iOS bridge handlers with Swift provider pattern | Adds `self-sdk-swift` package, Swift native providers (NFC, biometrics, crypto, storage), rewires KMP iOS handlers from stubs to provider-backed | 82 files (+6,187/-5,513) | Open   |
| [#1767](https://github.com/selfxyz/selfapp/pull/1767) | MRZ data confirmation for NFC scanning          | Adds DataConfirmationScreen in Self Wallet app, diff calculator utility with tests, new analytics constants                                      | 7 files (+227/-1)        | Open   |

## Migration Path

1. **Phase 1 (Now):** Self Wallet serves as a **test environment** for validating code moved from `app/` into the WebView engine (`mobile-sdk-alpha`). SDK core, bridge, and UI are being built in parallel.
2. **Phase 2:** Once the SDK ships to production (MiniPay integration works), Self Wallet integrates the `<SelfVerification />` RN component for its verification flow. This replaces native verification screens with the shared WebView flow.
3. **Phase 3:** Remaining Self Wallet features (document management, settings, cloud backup) can optionally migrate to the WebView or stay native — product decision.

## Dependency Graph

```
Phase 1 (parallel — no inter-dependencies):
  Person 1: Bridge package + web adapters
  Person 2: KMP setup + Android handlers
  Person 3: SDK core RN dep removal + browser entry point

Phase 2 (after Phase 1):
  Person 1: UI screens wired to bridge
  Person 2: iOS Swift providers (NFC, Biometrics, Lifecycle)
  Person 3: Web fallback adapter implementations
  Person 4: RN SDK <SelfVerification /> component

Phase 3 (integration):
  Person 1: Vite bundle finalized
  Person 2: KMP test app + MiniPay sample
  Person 4: RN SDK integration with Self Wallet
  All: End-to-end NFC scan on physical device
```

## Verification Plan

```bash
# Person 1 — WebView UI + Bridge
cd packages/webview-bridge && yarn build && yarn vitest run
cd packages/webview-app && npx tsc --noEmit && npx vite build

# Person 2 — Kotlin Native Shell
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64

# Person 3 — SDK Core
cd packages/mobile-sdk-alpha && npx vitest run

# Person 4 — RN SDK
cd packages/rn-sdk && yarn build
cd app && npx react-native run-ios  # integration test

# Integration test (all):
# 1. Person 1 runs `vite build` → dist/
# 2. Person 2 copies dist/ into KMP test app assets → launch WebView
# 3. Person 4 loads same Vite bundle via react-native-webview
# 4. NFC scan on physical device with real passport (final validation)
```

## Glossary

| Term     | Definition                                                                  |
| -------- | --------------------------------------------------------------------------- |
| BAC      | Basic Access Control — NFC authentication using MRZ data                    |
| PACE     | Password Authenticated Connection Establishment — newer NFC auth protocol   |
| Bridge   | JSON messaging layer between WebView and native code (postMessage)          |
| CSCA     | Country Signing Certificate Authority — root cert chain for passports       |
| DG1/DG2  | Data Groups 1 (MRZ) and 2 (biometric photo) from NFC chip                   |
| DSC      | Document Signing Certificate — signs passport data groups                   |
| Handler  | Native-side implementation of a bridge domain (e.g., NfcBridgeHandler)      |
| KMP      | Kotlin Multiplatform — builds for Android and iOS from shared Kotlin code   |
| MRZ      | Machine Readable Zone — text at bottom of passport/ID, contains holder data |
| Provider | Swift protocol implementation injected into KMP iOS handlers                |
| TEE      | Trusted Execution Environment — server-side proof generation                |
| XState   | TypeScript state machine library powering the proving machine               |
| ZK       | Zero-Knowledge proof — cryptographic proof without revealing source data    |

## Key Reference Files

| File                                                          | What it Contains                            |
| ------------------------------------------------------------- | ------------------------------------------- |
| `packages/mobile-sdk-alpha/src/types/public.ts`               | All adapter interfaces (457 lines)          |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`     | XState proving machine (1,751 lines)        |
| `packages/mobile-sdk-alpha/src/stores/protocolStore.ts`       | Protocol state cache (643 lines)            |
| `packages/mobile-sdk-alpha/src/client.ts`                     | SelfClient factory (231 lines)              |
| `packages/webview-bridge/src/bridge.ts`                       | Bridge core: request/response/event/destroy |
| `packages/webview-bridge/src/types.ts`                        | All bridge message types + domain enum      |
| `packages/webview-app/src/App.tsx`                            | Router + route definitions (10 screens)     |
| `packages/webview-app/src/providers/SelfClientProvider.tsx`   | 9 adapter wiring                            |
| `packages/kmp-sdk/shared/src/commonMain/.../MessageRouter.kt` | Bridge message routing (131 lines)          |
| `packages/kmp-sdk/shared/src/commonMain/.../BridgeMessage.kt` | Kotlin bridge types (91 lines)              |
| `common/src/polyfills/crypto.ts`                              | Cross-platform crypto (noble-hashes)        |
| `app/src/providers/selfClientProvider.tsx`                    | Self Wallet SDK integration (507 lines)     |

## Related Specs

| Spec                                                                          | Type     | Audience | What it covers                                          |
| ----------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------- |
| [person1-webview/OVERVIEW.md](./person1-webview/OVERVIEW.md)                   | Overview | Person 1 | WebView workstream orientation, scope, dependencies     |
| [person1-webview/SPEC.md](./person1-webview/SPEC.md)                           | Impl     | Person 1 | WebView screens, bridge adapters, SelfClientProvider    |
| [person2-native-shells/OVERVIEW.md](./person2-native-shells/OVERVIEW.md)       | Overview | Person 2 | Native shells workstream orientation, scope, deps       |
| [person2-native-shells/SPEC.md](./person2-native-shells/SPEC.md)               | Impl     | Person 2 | KMP native shell, Android/iOS handlers, Swift providers |
| [person3-sdk-core/OVERVIEW.md](./person3-sdk-core/OVERVIEW.md)                 | Overview | Person 3 | SDK core workstream orientation, scope, dependencies    |
| [person3-sdk-core/SPEC.md](./person3-sdk-core/SPEC.md)                         | Impl     | Person 3 | SDK core adaptation, RN dep removal, web fallbacks      |
| [person4-rn-sdk/OVERVIEW.md](./person4-rn-sdk/OVERVIEW.md)                     | Overview | Person 4 | RN SDK workstream orientation, scope, dependencies      |
| [person4-rn-sdk/SPEC.md](./person4-rn-sdk/SPEC.md)                             | Impl     | Person 4 | RN native shell, `<SelfVerification />` component       |
| [integrations/OVERVIEW.md](./integrations/OVERVIEW.md)                         | Overview | Person 2 | Integration samples orientation, scope                  |
| [integrations/SPEC-MINIPAY-SAMPLE.md](./integrations/SPEC-MINIPAY-SAMPLE.md)  | Impl     | Person 2 | MiniPay integration example                             |

## Spec Deviations

| Suggestion skipped       | Reason                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Token-budgeted chunks    | This is an overview spec (tier 1). Chunks live in the implementation specs (tier 2). |
| BEFORE/AFTER code blocks | No code modifications in scope — this is architecture-level.                         |
| Definition of Done       | Each workstream has its own definition of done in its implementation spec.           |
