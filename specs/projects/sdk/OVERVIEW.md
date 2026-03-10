# Self SDK — Architecture Specification

> Last updated: 2026-03-10
> Owner: Self Engineering
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app (MiniPay, Self Wallet, others) — some Kotlin (KMP), some React Native — with zero duplicated logic.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire verification flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, keychain, and crypto signing/key-gen are the ONLY things that touch native code. Everything else runs in the WebView.

## Status Checklist

- [x] Architecture finalized (WebView engine + two native shells)
- [x] Bridge protocol defined and tested (63 tests pass)
- [x] Protocol compatibility policy defined (fail closed on version mismatch)
- [x] WebView UI screens built (10 screens, routing works)
- [x] WebView engine core working (275+ tests pass, XState proving machine)
- [x] Android native shell implemented (5 handlers, WebView host, Activity)
- [x] Delete 3 unnecessary Android handlers (documents, analytics, haptic); crypto standalone handler deleted but crypto domain still routed natively for signing/key-gen
- [x] iOS native shell implemented (provider-based chain present in repo; merge/publish track separately)
- [x] Biometrics bridge adapter wired in webview-app
- [x] Camera bridge adapter wiring in webview-app
- [x] Web fallback adapters (IndexedDB for docs, Web Crypto for hashing)
- [x] Browser entry point with zero RN transitive imports
- [x] RN SDK (`SelfVerification` component + handlers) implemented
- [x] MiniPay sample integration scaffold + launch/result wiring implemented
- [x] Canonical `VerificationResult` contract locked in specs (legacy fields disallowed)
- [ ] Dynamic proof request items (currently hardcoded in ProvingScreen)
- [ ] MRZ data confirmation screen (PR #1767, not yet merged)
- [ ] Self Wallet migration to `SelfVerification`
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
│                     │   │                     │
│  KMP iOS: 4 init.†  │   │                     │
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

★ = Keychain is native-managed (host app controls access). In the bridge protocol, Keychain = the `secureStorage` domain.
† = KMP iOS initially ships with 4 required providers (NFC, Biometrics, SecureStorage, Lifecycle). Camera is Phase 2. SecureStorage on iOS is injected via factory pattern and required at startup — no in-memory fallback.
```

## Design Principles

1. **One WebView engine, two thin native shells, zero duplicated logic.** All core logic lives in TypeScript inside the WebView. Native code is the minimum required glue.
2. **Only bridge to native what the browser cannot do.** NFC, camera, biometrics, and lifecycle require hardware/OS APIs. Keychain stays native because the host app controls access. Crypto signing/key-gen stays native so private keys never leave secure storage. Everything else runs in the WebView.
3. **TypeScript is the primary surface area.** ZK circuits are the backend. The proving machine, state machines, stores, document management, and UI all run as TypeScript in the WebView. If you're writing logic in Kotlin or Swift, you're doing it wrong.
4. **The bridge protocol is the only coupling.** Native shells and the WebView share a JSON contract, not code. Any native shell that implements the protocol works with the same WebView bundle.
5. **Self Wallet is the test environment, not the target.** The SDK ships to third-party hosts (MiniPay). Self Wallet validates the SDK before others depend on it, then migrates to use it.

## Module Table

| Module                  | Location                     | Language               | What It Does                                                                                | Status                                                                                                                                                     | % Done  | Action Needed                                                                                    |
| ----------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| **WebView Engine**      | `packages/mobile-sdk-alpha/` | TypeScript             | Proving machine (XState), stores (Zustand), adapter interfaces, 105 source files            | Browser/RN paths and fallback adapters implemented                                                                                                         | **85%** | Consolidate fallback adapter ownership cleanup and finish remaining decoupling from RN peer deps |
| **WebView UI**          | `packages/webview-app/`      | TypeScript (React)     | 10 screens: home, country, ID, camera, NFC, confirm, proving, result, settings, coming-soon | All screens render, routing works, bridge integration wired                                                                                                | **85%** | Dynamic proof request items are still hardcoded and need request-context sourcing                |
| **Bridge Protocol**     | `packages/webview-bridge/`   | TypeScript             | JSON messaging, 10 domains, 9 adapters, timeout/error handling, mock transport              | 63+ tests pass, protocol stable                                                                                                                            | **85%** | Complete adapter de-duplication with engine-owned web fallbacks                                  |
| **Kotlin Native Shell** | `packages/kmp-sdk/`          | Kotlin                 | Android: 5 handlers + WebView host + Activity. iOS: provider-backed handler chain           | Android and iOS implementations present; physical-device NFC validation completed on both platforms, and the public callback/result contract now matches the canonical SDK shape | **92%** | Finish publishing readiness                                                                        |
| **Swift Providers**     | `packages/self-sdk-swift/`   | Swift                  | iOS native implementations: NFC, biometrics, secure storage, WebView hosting                | Implemented in repo and wired through KMP iOS; real-device NFC validation passed, but local `swift build` still fails on NFCPassportReader/OpenSSL headers | **85%** | Restore local build validation and finish packaging readiness                                    |
| **RN Native Shell**     | `packages/rn-sdk/` — **NEW** | React Native           | `SelfVerification` WebView wrapper, 5 native handler bridges                                | Implemented with tests, asset strategy, and APDU-capable NFC                                                                                               | **85%** | Expand real-device integration validation coverage in host apps                                  |
| **Shared Utilities**    | `common/`                    | TypeScript             | Poseidon, Merkle trees, passport parsing, certificates, 150+ files, 88+ exports             | Production, 98% browser-compatible                                                                                                                         | **95%** | No changes needed. Only 2 files require Node.js (optional)                                       |
| **Self Wallet App**     | `app/`                       | React Native (v0.76.9) | Full wallet: documents, NFC, proving, KYC, recovery, settings, Turnkey wallet               | Production (v2.9.16)                                                                                                                                       | **N/A** | Test environment for SDK. Eventually migrates to `SelfVerification`                              |

## Decision Matrix

| Capability      | Must be native? | KMP Android          | KMP iOS           | RN SDK            | WebView Fallback           |
| --------------- | --------------- | -------------------- | ----------------- | ----------------- | -------------------------- |
| **NFC**         | YES             | KEEP (497 LOC)       | BUILD (Swift)     | BUILD             | None (hardware)            |
| **Camera/MRZ**  | YES             | KEEP (247 LOC)       | Phase 2           | BUILD             | None (hardware)            |
| **Biometrics**  | YES             | KEEP (142 LOC)       | BUILD (Swift)     | BUILD             | None (OS prompt)           |
| **Keychain**    | YES             | KEEP (120 LOC)       | BUILD (provider)  | BUILD             | None (native-managed)      |
| **Lifecycle**   | YES             | KEEP (91 LOC)        | DONE (86 LOC)     | BUILD             | None (Activity/VC)         |
| **Documents**   | NO              | **DELETE** (146 LOC) | Skip              | Skip              | IndexedDB                  |
| **Crypto hash** | NO              | **DELETE** (177 LOC) | Skip              | Skip              | Web Crypto API             |
| **Crypto sign** | YES †           | Via SecureStorage    | Via SecureStorage | Via SecureStorage | None (native-only signing) |
| **Analytics**   | NO              | **DELETE** (94 LOC)  | Skip              | Skip              | console/fetch              |
| **Haptic**      | NO              | **DELETE** (94 LOC)  | Skip              | Skip              | Not critical               |

> **† Crypto domain note:** The `crypto` domain is defined in the bridge protocol. The standalone `CryptoBridgeHandler` (177 LOC) was deleted because it primarily handled hashing (Web Crypto covers that). However, the `crypto` domain bridge calls for signing and key operations remain active and must be handled by native message routers. **Current routing for crypto operations:**
>
> - **Hashing** (`hash()`) — runs entirely in the WebView via `crypto.subtle.digest`. No bridge call.
> - **Signing** (`sign()`) — routes through `bridge.request('crypto', 'sign', ...)`. The native handler implements signing internally using the key stored in secure storage. The private key never leaves the native layer and is never exported to the WebView runtime. Biometric gating is enforced by the native handler before key access.
> - **Key generation / retrieval** (`generateKey()`, `getPublicKey()`) — routes through `bridge.request('crypto', 'generateKey', ...)` and `bridge.request('crypto', 'getPublicKey', ...)`. Native handlers store/retrieve keys in secure storage. The `secureStorage` domain (`get/set/remove`) is for general keychain access only — it does not handle crypto-specific operations.
>
> The `crypto` domain is _not_ fully deprecated: only the standalone Kotlin handler class was removed. Native shells must still route `crypto` domain messages to a handler that performs signing/key-gen backed by secure storage. Secure enclave / hardware-backed key implementations are compatible with this model and should remain non-exportable.
>
> **Trust boundary:** The native signing handler signs whatever payload the WebView sends after biometric clearance — it does not inspect the data. This is safe only because the Vite bundle is statically embedded in the native artifact (AAR / XCFramework / RN assets) at build time and is never fetched or updated at runtime. A compromised or remotely-loaded bundle could request signatures over arbitrary data. Any change to this distribution model (e.g., OTA bundle updates) requires a security review of the signing handler's trust assumptions. Changes to native crypto handlers should be flagged for dedicated security review.

> **Keychain/SecureStorage canonical rule:** The `secureStorage` bridge domain is always native-managed on every platform. There is no web fallback and no in-memory fallback. Host apps control access policy.
>
> - **Android (KMP):** `SecureStorageBridgeHandler` backed by `EncryptedSharedPreferences`. Ships with the SDK.
> - **React Native:** `KeychainHandler` backed by `react-native-keychain` (peer dependency). Ships with the SDK.
> - **iOS (KMP):** `SecureStorageProvider` injected via factory pattern (same as NFC/Biometrics) and required at startup. The Swift companion package can provide a default iOS Keychain implementation, but host apps still own policy and may override.
>
> The WebView never has direct keychain access. All `secureStorage` domain calls bridge to native. This is a security boundary.

> **Web fallback adapter ownership:** Two packages provide adapters, at different layers:
>
> - **`mobile-sdk-alpha` (`src/adapters/browser/`)** — Engine-level adapters that satisfy the `Adapters` interface (e.g., `createIndexedDBDocumentsAdapter`, `createWebCryptoAdapter`). **This is the canonical source for web fallback implementations.**
> - **`webview-bridge`** — Bridge-level adapters that translate between the bridge protocol and the engine adapters (e.g., `NfcBridgeAdapter` calls `bridge.request('nfc', 'scan', ...)`). For capabilities that don't need native (documents, crypto hash, analytics), the bridge adapter is a thin pass-through to the engine adapter.
>
> Rule: if a capability runs entirely in the WebView, the engine adapter in `mobile-sdk-alpha` owns the implementation. The bridge package provides the messaging plumbing, not the business logic.
>
> **Current transitional state (2026-02-23):** `webview-app` still imports web fallback helpers from `webview-bridge` for some domains. This is accepted short-term, but those helpers must remain behavior-compatible with engine adapters until consolidation is complete.

### Platform Asymmetry Contract (Signed 2026-02-23)

- **Normative minimum contract (all shells):** `nfc`, `camera`, `biometrics`, `secureStorage`, `lifecycle`, and native `crypto` methods (`sign`, `generateKey`, `getPublicKey`).
- **Android KMP:** Implements the normative minimum (5 handlers + native crypto routing).
- **iOS KMP:** Implements a compatibility superset (registers additional `documents`, `analytics`, `haptic`, and `crypto` handlers).
- **Sign-off rule:** iOS superset handlers are compatibility shims only; they must not become the authoritative implementation for domains designated as WebView fallbacks.
- **Cross-platform invariant:** host app callback semantics and `VerificationResult` contract must be identical regardless of shell or platform.

## Impact Summary

| Metric                          | Current                                 | After                                         | Saved                                  |
| ------------------------------- | --------------------------------------- | --------------------------------------------- | -------------------------------------- |
| Kotlin Android handlers         | 9 (1,608 LOC)                           | 5 (~1,097 LOC)                                | -511 LOC                               |
| Kotlin iOS handlers to build    | 9                                       | 4 (NFC, Biometrics, SecureStorage, Lifecycle) | -5 handlers                            |
| Entire Kotlin packages to build | 3 (kmp-sdk, common-lib, proving-client) | 1 (kmp-sdk)                                   | -2 packages                            |
| RN SDK new code                 | —                                       | ~200-300 LOC (thin wrapper)                   | Shares 95% with Kotlin path            |
| Code shared across platforms    | ~20%                                    | ~95% (WebView engine)                         | Massive reduction in per-platform work |

## Shared Contracts / Protocols

### Canonical Types

These types are the **single source of truth**. All workstreams must converge on these shapes. Platform-specific serialization is acceptable, but the fields and semantics must match.

```typescript
// TypeScript (Person 1, 4, 5)
interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
  error?: { code: string; message: string };
}
```

```kotlin
// Kotlin (Person 2, 3)
data class VerificationResult(
    val success: Boolean,
    val userId: String?,
    val verificationId: String?,
    val proof: String?,
    val claims: Map<String, Any?>?,
    val error: SelfSdkError?,
)
```

> **Contract lock (normative):** Legacy result fields (`verified`, `disclosedClaims`, top-level `timestamp`) are not allowed in new code or specs. Use canonical `VerificationResult` only. Person 2's `claims` should be `Map<String, Any?>` to match TypeScript `Record<string, unknown>`. If a native shell still receives a flat lifecycle compatibility payload such as `{ type: "proofRequested" }`, it must translate that to canonical success semantics internally instead of exposing `type` on the public result object.

All communication between native shells and the WebView uses a versioned JSON protocol over `postMessage`.

### Protocol Compatibility Policy (Fail Closed)

Security posture is strict compatibility:

- Accept only `version: 1` bridge messages in the current release.
- If version mismatch is detected, reject the message/session with `PROTOCOL_VERSION_MISMATCH`.
- Do not silently downgrade or ignore unknown protocol versions.
- Launch should fail before starting verification if the shell and bundle are known to be incompatible.
- No best-effort mode in production; incompatibility is a hard error.

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

| Domain          | Methods                                                    | Events                                       | Handling                | Notes                                                                                                            |
| --------------- | ---------------------------------------------------------- | -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `nfc`           | `scan`, `cancelScan`, `isSupported`                        | `scanProgress`, `tagDiscovered`, `scanError` | **Native**              | 120s timeout, progress streaming                                                                                 |
| `biometrics`    | `authenticate`, `isAvailable`, `getBiometryType`           | —                                            | **Native**              | Required for key access                                                                                          |
| `secureStorage` | `get`, `set`, `remove`                                     | —                                            | **Native**              | "Keychain" in UI/docs = `secureStorage` domain in bridge protocol. Host app controls access.                     |
| `camera`        | `scanMRZ`, `isAvailable`                                   | —                                            | **Native**              | MRZ OCR from camera                                                                                              |
| `lifecycle`     | `ready`, `dismiss`, `setResult`                            | —                                            | **Native**              | WebView ↔ host communication                                                                                     |
| `crypto`        | `sign`, `generateKey`, `getPublicKey`                      | —                                            | **Native** †            | Standalone handler deleted; methods routed by native message router to secure-storage-backed impl. See footnote. |
| `documents`     | `loadCatalog`, `saveCatalog`, `loadById`, `save`, `delete` | —                                            | **Web** (IndexedDB)     | No bridge round-trip                                                                                             |
| `analytics`     | `trackEvent`, `trackNfcEvent`, `logNfcEvent`               | —                                            | **Web** (console/fetch) | Fire-and-forget                                                                                                  |
| `haptic`        | `trigger`                                                  | —                                            | **Web** (skip)          | Not critical                                                                                                     |
| `navigation`    | `goBack`, `goTo`                                           | —                                            | **Web** (React Router)  | WebView-internal                                                                                                 |

### Adapter Interface Mapping

| SDK Adapter Interface  | Bridges to Native? | Implementation                                                                  | Notes                             |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------- | --------------------------------- |
| `NFCScannerAdapter`    | Yes                | `nfc.scan` bridge call                                                          | Core flow: scan passport NFC chip |
| `CryptoAdapter.sign()` | Yes †              | `bridge.request('crypto', 'sign', ...)` — native signs using secure storage key | Key never leaves native           |
| `CryptoAdapter.hash()` | No                 | Web Crypto API                                                                  | Runs entirely in WebView          |
| `AuthAdapter`          | Yes                | `secureStorage.get` with `requireBiometric: true`                               | Private key gated by biometrics   |
| `StorageAdapter`       | Yes                | `secureStorage.*` bridge calls                                                  | Keychain access only              |
| `DocumentsAdapter`     | No                 | IndexedDB                                                                       | Runs entirely in WebView          |
| `AnalyticsAdapter`     | No                 | console/fetch                                                                   | Fire-and-forget                   |
| `NavigationAdapter`    | No                 | React Router                                                                    | WebView-internal                  |
| `NetworkAdapter`       | No                 | `fetch()`                                                                       | Works in WebView                  |
| `ClockAdapter`         | No                 | `Date.now()` + `setTimeout`                                                     | Works in WebView                  |
| `LoggerAdapter`        | No                 | `console.*`                                                                     | Works in WebView                  |

### Transport

| Platform         | WebView → Native                                                | Native → WebView (responses)                                                   | Native → WebView (events)                                                   |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Android**      | `window.SelfNativeAndroid.postMessage(json)`                    | `evaluateJavascript("window.SelfNativeBridge._handleResponse(json)")`          | `evaluateJavascript("window.SelfNativeBridge._handleEvent(json)")`          |
| **iOS**          | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` | `evaluateJavaScript("window.SelfNativeBridge._handleResponse(json)")`          | `evaluateJavaScript("window.SelfNativeBridge._handleEvent(json)")`          |
| **React Native** | `window.ReactNativeWebView.postMessage(json)`                   | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse(json)")` | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleEvent(json)")` |

> **Note:** Responses (`_handleResponse`) are paired to a specific request via `requestId`. Events (`_handleEvent`) are unsolicited — the native side pushes them (e.g., NFC `scanProgress`) without a prior request.

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
└── Test app validation

Person 3 — Integrations                 OVERVIEW | SPEC
├── MiniPay sample integration
└── Integration samples + validation

Person 4 — SDK Core Adaptation           OVERVIEW | SPEC
├── mobile-sdk-alpha: finish RN dep removal
├── Browser entry point exports (zero RN imports)
├── WebView lifecycle events
└── Web fallback adapter implementations

Person 5 — RN Native Shell (NEW)        OVERVIEW | SPEC
├── <SelfVerification /> component (~200-300 LOC)
├── 5 native handler bridges (same protocol)
├── Package setup + publishing
└── Integration test with Self Wallet
```

Links:

- Person 1: [Spec](./workstreams/webview/SPEC.md)
- Person 2: [Spec](./workstreams/native-shells/SPEC.md)
- Person 3: [MiniPay Spec](./workstreams/integrations/SPEC.md)
- Person 4: [Spec](./workstreams/sdk-core/SPEC.md)
- Person 5: [Spec](./workstreams/rn-sdk/SPEC.md)

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
    "success": true,
    "claims": {
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

                                       Person 5 delivers:
Person 4 delivers:
                                       RN Native Shell (@selfxyz/rn-sdk)
@selfxyz/mobile-sdk-alpha (npm)       ├─ <SelfVerification /> component
  ↓                                   ├─ 5 native handler bridges
  ↓ core logic, adapters,             ├─ Same bridge protocol as Kotlin shell
  ↓ web fallbacks                     ├─ Loads same Vite bundle
  └────── imported by ───────────────→ webview-app + rn-sdk

Person 3 delivers:
Integration samples (MiniPay)
├─ Sample integration code
└─ Validation against SDK artifacts
```

## In-Flight PRs

> **Note:** This table may be stale. Check GitHub for current status before relying on it.

| PR                                                 | Title                                           | Impact                                                                                                                                           | Files                    | Status |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------ |
| [#1762](https://github.com/selfxyz/self/pull/1762) | iOS bridge handlers with Swift provider pattern | Adds `self-sdk-swift` package, Swift native providers (NFC, biometrics, crypto, storage), rewires KMP iOS handlers from stubs to provider-backed | 82 files (+6,187/-5,513) | Open   |
| [#1767](https://github.com/selfxyz/self/pull/1767) | MRZ data confirmation for NFC scanning          | Adds DataConfirmationScreen in Self Wallet app, diff calculator utility with tests, new analytics constants                                      | 7 files (+227/-1)        | Open   |

## Migration Path

1. **Phase 1 (Now):** Self Wallet serves as a **test environment** for validating code moved from `app/` into the WebView engine (`mobile-sdk-alpha`). SDK core, bridge, and UI are being built in parallel.
2. **Phase 2:** Once the SDK ships to production (MiniPay integration works), Self Wallet integrates the `SelfVerification` RN component for its verification flow. This replaces native verification screens with the shared WebView flow.
3. **Phase 3:** Remaining Self Wallet features (document management, settings, cloud backup) can optionally migrate to the WebView or stay native — product decision.

## Dependency Graph

```
Phase 1 (parallel — no inter-dependencies):
  Person 1: Bridge package + web adapters
  Person 2: KMP setup + Android handlers
  Person 4: SDK core RN dep removal + browser entry point

Phase 2 (after Phase 1):
  Person 1: UI screens wired to bridge
  Person 2: iOS Swift providers (NFC, Biometrics, Lifecycle)
  Person 3: MiniPay sample integration
  Person 4: Web fallback adapter implementations
  Person 5: RN SDK <SelfVerification /> component

Phase 3 (integration):
  Person 1: Vite bundle finalized
  Person 2: KMP test app
  Person 3: Integration validation
  Person 5: RN SDK integration with Self Wallet
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

# Person 3 — Integrations
# MiniPay sample build + validation against SDK artifacts

# Person 4 — SDK Core
cd packages/mobile-sdk-alpha && npx vitest run

# Person 5 — RN SDK
cd packages/rn-sdk && yarn build
cd app && npx react-native run-ios  # integration test

# Integration test (all):
# 1. Person 1 runs `vite build` → dist/
# 2. Person 2 copies dist/ into KMP test app assets → launch WebView
# 3. Person 5 loads same Vite bundle via react-native-webview
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

## Execution Status

**Overall: 77% complete** — 24/30 chunks done, 2 partial, 1 skipped, 2 superseded, 1 deferred.

### Remaining Work

| Chunk | Workstream    | Description                       | Status             | Next Step                                                                                                                |
| ----- | ------------- | --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1E    | WebView       | WebView App Shell (Vite + router) | Partial            | Source dynamic proof request items from `SelfSdk.launch(request)` context instead of hardcoded defaults in ProvingScreen |
| 2F    | Native Shells | SDK Public API finalize           | Partial            | Finalize `SelfSdk.launch()` public API surface after iOS NFC handler (2K) is complete                                    |
| 3C    | Integrations  | Polish + Error Handling           | Partial            | Complete error handling polish in MiniPay sample result UX                                                               |
| 2L    | Native Shells | Camera MRZ Handler (iOS)          | Deferred (Phase 2) | Add iOS camera/MRZ via KMP when Phase 2 planning starts. RN SDK has its own implementation via native modules.           |

### Open Follow-Up Items

**P1 — Validation Gaps:**

| Item                                      | Owner    | Context                                                     |
| ----------------------------------------- | -------- | ----------------------------------------------------------- |
| Integration validation in Self Wallet app | Person 5 | `SelfVerification` component not yet wired into Self Wallet |

**P2 — Correctness / Consistency:**

| Item                                                             | Owner      | Context                                                                                              |
| ---------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Consolidate duplicated fallback adapters                         | Person 4   | ~150 LOC duplicated across `webview-bridge` and `mobile-sdk-alpha`. `mobile-sdk-alpha` is canonical. |
| Source dynamic proving request values from request context       | Person 1   | `ProvingScreen` accepts params but defaults are hardcoded                                            |
| Expose `generateKey()`/`getPublicKey()` in `BridgeCryptoAdapter` | Person 1/4 | Methods exist in native handler and protocol types but unreachable from WebView client               |

**P3 — Publishing / Packaging:**

| Item                                           | Owner    | Context                                                             |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------- |
| npm publish `@selfxyz/rn-sdk`                  | Person 5 | Package implemented but not published                               |
| Production artifact builds (AAR + XCFramework) | Person 2 | KMP SDK packaging for distribution not finalized                    |
| Self Wallet migration to `SelfVerification`    | Person 5 | Phase 2 — replace native verification screens with SDK WebView flow |

### Suggested Follow-Up Order

1. **Correctness cleanup** — Adapter consolidation, dynamic proving config, crypto adapter interface gap
2. **Publishing** — npm publish rn-sdk, finalize AAR/XCFramework packaging
3. **Self Wallet migration** — Wire `SelfVerification` into the main app (Phase 2)
