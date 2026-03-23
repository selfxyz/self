# Self SDK — Overview

> Last updated: 2026-03-20
> Owner: Self Engineering
> Status: Active (WebView-first; native-module work paused)

## Current Scope

On **March 20, 2026**, the active SDK delivery target was refined:

- The SDK is a **WebView-only experience wrapping Sumsub** for KYC/document capture.
- The **only native modules** are for **keychain/keystore** (secure storage + crypto signing) — written in plain Kotlin (Android) and Swift (iOS), not KMP.
- End-to-end document capture and verification is delegated to **Sumsub Web SDK** running inside the WebView.
- Self-managed NFC, native camera/MRZ capture, biometrics, KMP packaging, RN native-shell packaging, and native artifact publishing are **not current delivery priorities**.
- The prior KMP/RN work is retained under [Paused Work](./paused/INDEX.md) for future reuse.

## North Star

- **Goal:** Deliver a reusable Self verification flow that runs inside a WebView wrapping Sumsub for KYC, with thin native shells for keychain/crypto only.
- **Success metric:** A host app launches the native shell (Android Activity or iOS ViewController), the user completes Sumsub KYC in the WebView, keys are securely generated/stored in the platform keychain, and the host receives a terminal verification result.
- **Constraint:** Native code handles only `secureStorage`, `crypto`, and `lifecycle` bridge domains. All other logic runs in TypeScript in the WebView.

## Current Status

### Active

- [x] WebView UI workstream remains the primary delivery surface
- [x] `mobile-sdk-alpha` browser/WebView portability work remains active
- [x] Shared WebView architecture remains the source of truth for product flow
- [x] `WV-01` completed request-context sourcing for dynamic proof request items
- [x] `WV-02` formalized the provider-agnostic KYC capture and handoff contract
- [x] `WV-03` removed native-scan and NFC assumptions from the active WebView flow/docs
- [x] `WV-04` added the browser/native host callback contract for ready, result, dismiss, and cancel handling
- [x] `SC-01` consolidated bridge-layer fallback duplicates with engine-owned adapters
- [x] `SC-02` exposed `generateKey()`/`getPublicKey()` in the crypto adapter surface
- [ ] `WV-05` Sumsub Web SDK integration in ProviderLaunchScreen
- [ ] `WV-06` KYC result flow through verification pipeline to host callback
- [ ] `NSL-01` Android native shell (plain Kotlin) — keychain/crypto + WebView host
- [ ] `NSL-02` iOS native shell (plain Swift) — keychain/crypto + WebView host
- [ ] `NSL-03` Test apps adapted from kmp-sdk-test-app
- [x] `BP-01` Build pipeline — bundle webview-app into native shells

### Paused

- [x] KMP native shells retained for future reuse, replaced by native-shells-lite for current scope
- [x] Native MRZ/NFC consolidation work retained, but no longer on the critical path
- [x] RN native-shell packaging retained, but not part of current client delivery
- [x] MiniPay/KMP integration sample retained, but blocked by the paused KMP path

## Active Architecture

```text
┌──────────────────────────────────────────────────────┐
│                      HOST APP                        │
│   Launches native shell, receives terminal result    │
│   Android: ActivityResult (Intent extras)            │
│   iOS: SelfSdkCallback protocol                      │
│                                                      │
│   Result: { success, userId, verificationId,         │
│             claims, error }                          │
└──────────────┬───────────────────────────────────────┘
               │ launch / result callback
               ▼
┌──────────────────────────────────────────────────────┐
│           NATIVE SHELL (3 bridge domains)            │
│   Android: packages/native-shell-android/ (Kotlin)   │
│   iOS: packages/native-shell-ios/ (Swift)            │
│                                                      │
│   secureStorage → Keystore / Keychain                │
│   crypto → EC P-256 sign/generate/getPublicKey       │
│   lifecycle → forwards result to host, then finishes │
│                                                      │
│   Hosts WebView, loads bundled webview-app            │
└──────────────┬───────────────────────────────────────┘
               │ bridge protocol v1 (JSON over JS interface)
               ▼
┌──────────────────────────────────────────────────────┐
│              WEBVIEW EXPERIENCE                       │
│               packages/webview-app                   │
│   React + verification UX + KYC provider handoff     │
│   + provider result normalization                    │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│            WEBVIEW ENGINE / SHARED LOGIC              │
│            packages/mobile-sdk-alpha                 │
│   state machines, stores, adapters, proof logic      │
└──────────────┬───────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────────────┐  ┌──────────────────────────────┐
│ Bridge to native│  │ KYC Provider (web-capable)   │
│ webview-bridge  │  │ Sumsub, or any provider that  │
│ crypto/storage/ │  │ conforms to the Self KYC      │
│ lifecycle       │  │ provider contract (WV-02)     │
└─────────────────┘  └──────────────────────────────┘
```

### Data Flow

1. Host launches native shell with config (verificationId, userId, teeUrl, env)
2. Native shell loads WebView with config as URL query params
3. WebView runs KYC flow via a web-capable provider (Sumsub is the current default, but the contract is provider-agnostic per WV-02)
4. Provider result is normalized into `KycProviderResult` inside the WebView
5. On success: attestation data feeds into the Self proof pipeline
6. Terminal result flows via `lifecycle.setResult()` → bridge → native shell → host callback
7. Native shell finishes (Activity result / VC dismissal) with the result payload

## Module Table

| Module               | Location                                                          | Status                | Current Role                                                                                 | Action Needed                                                                         |
| -------------------- | ----------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| WebView UI           | `packages/webview-app/`                                           | Active                | Primary product surface, KYC provider handoff, verification UX                               | Integrate KYC provider Web SDK (WV-05), wire result flow (WV-06)                      |
| SDK Core             | `packages/mobile-sdk-alpha/`                                      | Active                | Shared engine for WebView/browser delivery                                                   | Keep browser entry clean and request-driven                                           |
| WebView Bridge       | `packages/webview-bridge/`                                        | Active                | Bridge protocol v1 between WebView and native shells                                         | Stable — no changes needed                                                            |
| Android Shell        | `packages/native-shell-android/`                                  | New                   | Thin Kotlin shell: keychain/crypto + WebView host                                            | Build (NSL-01)                                                                        |
| iOS Shell            | `packages/native-shell-ios/`                                      | New                   | Thin Swift shell: keychain/crypto + WebView host                                             | Build (NSL-02)                                                                        |
| Test App             | `packages/sdk-test-app/`                                          | New                   | Minimal native apps for end-to-end testing                                                   | Adapt from kmp-sdk-test-app (NSL-03)                                                  |
| KMP Native Shell     | `packages/kmp-sdk/`                                               | Deprecated            | Reference for native shell porting, replaced by native-shell-android/ios                     | Do not advance; use as port reference only                                            |
| Swift Providers      | `packages/self-sdk-swift/`                                        | Deprecated            | Reference for iOS keychain/crypto porting, replaced by native-shell-ios                      | Do not advance; use as port reference only                                            |
| RN SDK               | `packages/rn-sdk/`                                                | Paused                | Retained React Native shell work                                                             | Do not advance unless scope reopens                                                   |
| Native Consolidation | `app/ios/`, `packages/mobile-sdk-alpha/ios/`, related native code | Paused                | Historical native cleanup and parity track                                                   | Keep as reference only for now                                                        |
| MiniPay Sample       | `packages/kmp-minipay-sample/`                                    | Paused                | Historical KMP integration example                                                           | Resume only if KMP path returns                                                       |

## Scope Rules

1. **WebView + keychain/crypto is the active product scope.** Native code handles only `secureStorage`, `crypto`, and `lifecycle` bridge domains. Everything else runs in TypeScript in the WebView.
2. **KYC provider is pluggable.** The Self KYC contract (WV-02) is provider-agnostic. Sumsub is the current default implementation, but any web-capable provider that conforms to the `KycProviderResult` contract can be swapped in. Do not hardcode Sumsub assumptions outside the provider adapter layer.
3. **Host app receives a terminal result.** The native shell forwards `lifecycle.setResult()` to the host via Activity result (Android) or callback protocol (iOS). The result payload includes `success`, `userId`, `verificationId`, `claims` (attestation), and `error`.
4. **Paused native work is retained, not deleted.** KMP and Swift provider code serve as reference for porting. Revive from [Paused Work](./paused/INDEX.md) only if scope reopens.
5. **Keep active specs aligned with current reality.** Historical native design detail belongs in paused specs, not in the active delivery path.
6. **Plain Kotlin + Swift, not KMP.** The native shells use platform-native code directly. No shared Kotlin, no expect/actual, no SdkProviderRegistry indirection.

## Where To Work

- **KYC integration + WebView UX:** [WebView Spec](./workstreams/webview/SPEC.md) (WV-05, WV-06)
- **Native shells (Kotlin + Swift):** [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) (NSL-01, NSL-02, NSL-03)
- **Build pipeline:** [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md) (BP-01)
- **Shared engine follow-ups:** [SDK Core Spec](./workstreams/sdk-core/SPEC.md)
- **Retained KMP/RN work:** [Paused Work Index](./paused/INDEX.md)
