# Self SDK — Overview

> Last updated: 2026-05-19
> Owner: Self Engineering
> Status: Active (WebView-first; Self Wallet adopts the WebView as its host via `webview-in-app`)

## Current Scope

On **May 19, 2026**, the SDK initiative gained a new track:

- The **Self Wallet RN app (`app/`) is becoming a bridge-compatible
  WebView host.** The wallet's UI surfaces are being replaced with a
  single WebView loading the deployed `webview-app`. The existing
  `native-shell-android/ios` packages remain active but serve
  external SDK consumers (KMP, partner wallets) rather than the
  wallet itself.
- **`packages/rn-sdk/` is revived from paused** as the canonical home
  for the RN-side bridge host (shell component, message router,
  handlers, new `SelfCrypto` native module). `app/` consumes it as a
  workspace dependency; 3rd-party RN apps will install it from npm.
  The three bridge-compatible shells (Kotlin, Swift, React Native)
  are now symmetric.
- New workstream: [WebView-in-App Spec](./workstreams/webview-in-app/SPEC.md).
- Cutover model: long-lived feature branch (`feat/webview-in-app`)
  off `dev`, no production RemoteConfig flag. Legacy RN screens are
  deleted at merge time.

On **March 25, 2026**, the active SDK execution changed again:

- The active product surface is the **webview app** and its browser-safe flow
  in `packages/webview-app/`.
- The current implementation pass is a **faithful 1:1 Euclid screen migration**
  with **temporary mocked states and route triggers**.
- Real KYC/provider wiring, KYC persistence, proving-machine wiring, host
  lifecycle completion, and native-shell delivery are **not active work in this
  pass**.
- End-to-end capture remains delegated to a **web-capable KYC provider**
  through the provider-agnostic contract defined in WV-02. The current provider
  target is Didit, but active UI naming stays generic (`Kyc*`).
- Historical native-shell, KMP, RN-shell, and older provider-specific work is
  retained in sibling or paused specs for future implementation context.

## North Star

- **Goal:** Deliver a reusable Self verification flow whose UI can be reviewed,
  QAed, and iterated inside the WebView/browser surface without waiting on
  provider or native integration.
- **Success metric for the current pass:** The active registration and disclose
  UI routes render as faithful Euclid ports with deterministic mock triggers for
  key happy/error branches.
- **Constraint:** If a task exists only to make the flow production-real
  instead of visually and navigationally complete, it belongs in a later logic
  pass, not in the current migration pass.

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
- [ ] `WV-09` registration core mock spine
- [ ] `WV-12` registration prompt screens
- [ ] `WV-13` through `WV-16` remaining UI migration specs and routes
- [ ] `WV-05` real provider SDK integration (future logic pass)
- [ ] `WV-06` KYC result flow through verification pipeline (future logic pass)
- [x] `BP-01` Build pipeline — bundle webview-app into native shells

### Active — KMP Revival

- [ ] `KR-01` Scope KMP Android to 3-domain native shell parity
- [ ] `KR-02` Scope KMP iOS to 3-domain native shell parity
- [ ] `KR-03` Validate build artifacts and test app

See [KMP Revival Spec](./workstreams/kmp-revival/SPEC.md) for details.

### Paused

- [x] Native MRZ/NFC consolidation work retained, but no longer on the critical path
- [x] RN native-shell packaging retained, but not part of current client delivery
- [x] MiniPay/KMP integration sample retained, but blocked by the paused KMP path
- [x] Native-shell-lite and provider/proving implementation plans remain useful future references, but they are not blockers for the current UI migration pass

## Active Architecture

```text
┌──────────────────────────────────────────────────────┐
│                   HOST / REVIEWER                    │
│  Opens the webview/browser flow and exercises mock   │
│  branches via routes, query params, or mock state    │
└──────────────┬───────────────────────────────────────┘
               │ launch / inspect / review
               ▼
┌──────────────────────────────────────────────────────┐
│              WEBVIEW EXPERIENCE                       │
│               packages/webview-app                   │
│   Euclid screen wrappers + route orchestration +     │
│   temporary mocked provider / proving branches       │
└──────────────┬───────────────────────────────────────┘
               │ future logic pass only
               ▼
┌──────────────────────────────────────────────────────┐
│            WEBVIEW ENGINE / SHARED LOGIC              │
│            packages/mobile-sdk-alpha                 │
│   request parsing, stores, adapters, proof logic     │
└──────────────┬───────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────────────┐  ┌──────────────────────────────┐
│ Host callback   │  │ KYC Provider (web-capable)   │
│ contract (WV-04)│  │ Didit or another provider    │
│ future wiring   │  │ conforming to WV-02          │
└─────────────────┘  └──────────────────────────────┘
```

### Data Flow

1. The active pass launches the webview/browser flow directly into mocked or
   partially wired routes for review.
2. Registration screens use deterministic mock transitions for provider,
   success, failure, retry, and dismiss branches.
3. Disclose screens follow the same mock-first pattern until the later logic
   pass wires real provider and proving behavior.
4. Future logic work will normalize real provider output into
   `KycProviderResult`, persist KYC documents, run proving, and emit terminal
   host lifecycle results.

## Module Table

| Module               | Location                                                          | Status   | Current Role                                                                       | Action Needed                                  |
| -------------------- | ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| WebView UI           | `packages/webview-app/`                                           | Active   | Primary product surface, route orchestration, mock-first screen migration          | Finish remaining UI migration specs/routes     |
| SDK Core             | `packages/mobile-sdk-alpha/`                                      | Active   | Shared engine for WebView/browser delivery                                         | Keep browser entry clean and request-driven    |
| WebView Bridge       | `packages/webview-bridge/`                                        | Active   | Host callback surface for future lifecycle wiring                                  | Stable for current UI pass                     |
| Android Shell        | `packages/native-shell-android/`                                  | Deferred | Future thin Kotlin shell: keychain/crypto + WebView host                           | Not required for current UI migration          |
| iOS Shell            | `packages/native-shell-ios/`                                      | Deferred | Future thin Swift shell: keychain/crypto + WebView host                            | Not required for current UI migration          |
| Test App             | `packages/sdk-test-app/`                                          | Deferred | Future native E2E harness                                                          | Not required for current UI migration          |
| KMP Native Shell     | `packages/kmp-sdk/`                                               | Active   | Native shell for KMP consumers — 3-domain scope (secureStorage, crypto, lifecycle) | KR-01 (Android), KR-02 (iOS), KR-03 (validate) |
| Swift Providers      | `packages/self-sdk-swift/`                                        | Active   | iOS keychain/crypto provider implementations for KMP SDK                           | Required by KR-02 (query param support)        |
| RN SDK               | `packages/rn-sdk/`                                                | Active   | Bridge-compatible RN host shell + `SelfCrypto` native module. Consumed by `app/` (Self Wallet) and publishable for 3rd-party RN apps. | Revived under `webview-in-app` (WIA-00).       |
| Native Consolidation | `app/ios/`, `packages/mobile-sdk-alpha/ios/`, related native code | Paused   | Historical native cleanup and parity track                                         | Keep as reference only for now                 |
| KMP Test App         | `packages/kmp-sdk-test-app/`                                      | Active   | E2E test harness for KMP SDK                                                       | Scope to 3-domain in KR-03                     |
| MiniPay Sample       | `packages/kmp-minipay-sample/`                                    | Paused   | Historical KMP integration example                                                 | May resume now that KMP path is active         |

## Scope Rules

1. **The current pass is UI-first and mock-first.** The deliverable is complete,
   reviewable screen and route coverage, not production wiring.
2. **KYC provider is pluggable.** The Self KYC contract (WV-02) is
   provider-agnostic. Didit is the current provider target, but active naming
   should remain generic outside adapter specs.
3. **Host lifecycle completion is a later pass.** The callback contract is
   documented, but real terminal-result wiring is not required for current UI
   migration work.
4. **Historical implementation specs are retained, not deleted.** Native-shell,
   provider, and proving plans stay available for future implementation.
5. **Keep active specs aligned with the current pass.** If a top-level doc
   makes production provider or native work sound like a prerequisite for the
   current migration, it is stale and should be corrected.
6. **Euclid screens require asset and inset verification.** Every screen
   imported from `@selfxyz/euclid` must be checked for URL-path asset
   references (Lottie animations, background images) and safe-area inset
   props. Missing assets cause silent failures (blank animations, black
   backgrounds). See the **Euclid Screen Migration Checklist** in
   `CLAUDE.md` for the full protocol.

## Where To Work

- **Current UI migration source of truth:** [WebView Spec](./workstreams/webview/SPEC.md), [Screen Inventory](./workstreams/webview/SCREEN-INVENTORY.md), [Ticket Plan](./workstreams/webview/TICKET-PLAN.md)
- **Future provider/proving implementation context:** [WebView Spec](./workstreams/webview/SPEC.md) (`WV-05`, `WV-06`, `WV-08`, `WV-11`)
- **Future native shells (Kotlin + Swift):** [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) (`NSL-01`, `NSL-02`, `NSL-03`)
- **Build pipeline:** [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md) (BP-01)
- **Shared engine follow-ups:** [SDK Core Spec](./workstreams/sdk-core/SPEC.md)
- **KMP revival (3-domain scope):** [KMP Revival Spec](./workstreams/kmp-revival/SPEC.md)
- **Retained RN work:** [Paused Work Index](./paused/INDEX.md)
