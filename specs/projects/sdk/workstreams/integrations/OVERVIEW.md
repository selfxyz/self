# Person 3: Integration Samples — Workstream Overview

> Last updated: 2026-02-23
> Owner: Person 3 (Integrations)
> Project: [SDK Overview](../../OVERVIEW.md)
> Implementation: [SPEC-MINIPAY-SAMPLE.md](./SPEC-MINIPAY-SAMPLE.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status

- [x] MiniPay sample project scaffolded (`packages/kmp-minipay-sample/`)
- [x] Android: home screen + SDK launch + result screen wiring present
- [x] iOS: Compose Multiplatform launch path is present
- [x] Integration hardening paths are implemented in sample result UX (error-code to user-message mapping)
- [x] Non-device validation evidence captured:
  - `@selfxyz/rn-sdk` tests: all passing at merge time (includes NFC failure modes and APDU path handling; see CI checks)
  - `@selfxyz/webview-bridge` tests: all passing at merge time (see CI checks)
  - iOS launch E2E artifact: `app/maestro-results.xml` (1 test, 0 failures, 19s on iPhone 16 simulator)
    Overall: **Done** — implementation and non-device validation are in place. Physical-device NFC E2E is out of scope (requires NFC hardware, real passport, camera, biometrics — not automatable in CI).

## What You Own

- **MiniPay sample app** (`packages/kmp-minipay-sample/`) — Kotlin/Compose Multiplatform reference integration
- **Future integration samples** — Self Wallet migration sample, other third-party app examples as needed
- **Reference implementation quality code** — what third-party integrators will copy when they embed Self

## Architecture Context

Your sample apps sit **on top of** the SDK. You consume `SelfSdk.launch()` and nothing else. The entire verification flow runs inside the SDK's WebView. Your native UI is minimal: 2 screens (home + result).

```
┌────────────────────────────────────────┐
│  Sample App (Compose Multiplatform)    │
│                                        │
│  HomeScreen ──→ SelfSdk.launch() ──→ ResultScreen
│     (native)       (SDK WebView)       (native)
└────────────────────┬───────────────────┘
                     │
         ┌───────────▼───────────┐
         │  KMP SDK (kmp-sdk/)   │
         │  5 native handlers    │
         │  WebView host         │
         │  Bridge protocol      │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  WebView (Vite bundle)│
         │  Full verification    │
         │  flow: 10 screens     │
         └───────────────────────┘
```

## Dependencies

| Direction     | Person / Package        | What                                               | Status      |
| ------------- | ----------------------- | -------------------------------------------------- | ----------- |
| **You need**  | Person 2 (KMP SDK)      | `SelfSdk.launch()` API and Kotlin SDK artifact     | In progress |
| **You need**  | Person 1 (WebView UI)   | Vite bundle embedded in the SDK                    | In progress |
| **Needs you** | Third-party integrators | Reference implementation showing how to embed Self | Not started |

## Key Decisions

| Decision              | Choice                     | Rationale                                                     |
| --------------------- | -------------------------- | ------------------------------------------------------------- |
| Native UI scope       | 2 screens (home + result)  | Demonstrates that integrators write almost no UI code         |
| SDK call site         | Single: configure + launch | Keeps integration surface area minimal and copyable           |
| Code quality standard | Reference quality          | Third-party developers will copy this code directly           |
| Platform parity       | Android + iOS identical    | Shared Kotlin handles all logic; platform code = entry points |

## Deliverables

| Deliverable               | Type                            | Consumers               |
| ------------------------- | ------------------------------- | ----------------------- |
| MiniPay sample app        | KMP app (`kmp-minipay-sample/`) | Third-party integrators |
| Integration documentation | By-example (in the code)        | Third-party integrators |

## Related Specs

| Spec                                                         | What it covers                                            |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [SPEC-MINIPAY-SAMPLE.md](./SPEC-MINIPAY-SAMPLE.md)           | Implementation details, chunks, code changes              |
| [SDK Overview](../../OVERVIEW.md)               | Project-level architecture, bridge protocol, glossary     |
| [../webview/OVERVIEW.md](../webview/OVERVIEW.md)             | WebView UI + bridge workstream (delivers the Vite bundle) |
| [../native-shells/OVERVIEW.md](../native-shells/OVERVIEW.md) | KMP SDK workstream (delivers the artifact you depend on)  |
| [../sdk-core/OVERVIEW.md](../sdk-core/OVERVIEW.md)           | SDK core workstream (adapter interfaces, web fallbacks)   |
| [../rn-sdk/OVERVIEW.md](../rn-sdk/OVERVIEW.md)               | RN SDK workstream (alternative native shell for RN hosts) |
