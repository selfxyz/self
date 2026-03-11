# Self SDK — Overview

> Last updated: 2026-03-11
> Owner: Self Engineering
> Status: Active (WebView-first; native-module work paused)

## Current Scope Reset

On **March 11, 2026**, the active SDK delivery target changed:

- The target client wants a **WebView experience only**.
- The current client scope does **not** include custom native modules.
- Self-managed NFC, native camera/MRZ capture, biometrics, keychain bridging, KMP packaging, RN native-shell packaging, and native artifact publishing are **not current delivery priorities**.
- End-to-end document capture and verification should be delegated to a **web-capable third-party KYC provider** such as Sumsub.
- The prior native/KMP/RN work is retained under [Paused Work](./paused/INDEX.md) so it can be reused later, especially for Self Wallet or other mobile-native efforts.

## North Star

- **Goal:** Deliver a reusable Self verification flow that runs inside a host-provided WebView or browser surface without requiring custom native modules.
- **Success metric:** A host app launches the web flow, the user completes document/KYC steps through the web experience and provider integrations, and the host receives a consistent verification result without platform-specific native SDK work.
- **Constraint:** Current scope must stay browser/WebView-native. If a requirement depends on custom native modules, it belongs in paused work unless product scope changes.

## Current Status

### Active

- [x] WebView UI workstream remains the primary delivery surface
- [x] `mobile-sdk-alpha` browser/WebView portability work remains active
- [x] Shared WebView architecture remains the source of truth for product flow
- [ ] `WV-01` still needs request-context sourcing for dynamic proof request items
- [ ] `WV-02` still needs to formalize the KYC-provider capture and handoff contract
- [ ] `WV-03` still needs to remove native-scan and NFC assumptions from active WebView flow/docs

### Paused

- [x] KMP native shells retained for future reuse, but no longer on the critical path
- [x] Native MRZ/NFC consolidation work retained, but no longer on the critical path
- [x] RN native-shell packaging retained, but not part of current client delivery
- [x] MiniPay/KMP integration sample retained, but blocked by the paused KMP path

## Active Architecture

```text
┌──────────────────────────────────────────────────────┐
│                 HOST APP / HOST WEBVIEW             │
│        (client app, embedded browser, or wrapper)   │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│              WEBVIEW EXPERIENCE (ACTIVE)            │
│               packages/webview-app                  │
│  React + routing + verification UX + provider flow │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│            WEBVIEW ENGINE / SHARED LOGIC            │
│            packages/mobile-sdk-alpha                │
│   state machines, stores, adapters, proof logic     │
└──────────────────────────┬───────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ Host callback contract    │   │ Third-party KYC provider  │
│ postMessage / URL / JS API│   │ web capture + KYC flow    │
│ minimal host integration  │   │ e.g. Sumsub               │
└───────────────────────────┘   └───────────────────────────┘
```

## Module Table

| Module               | Location                                                          | Status                | Current Role                                                                                 | Action Needed                                                  |
| -------------------- | ----------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| WebView UI           | `packages/webview-app/`                                           | Active                | Primary product surface and orchestration layer                                              | Remove native-scan assumptions and formalize KYC-provider flow |
| SDK Core             | `packages/mobile-sdk-alpha/`                                      | Active                | Shared engine for WebView/browser delivery                                                   | Keep browser entry clean and request-driven                    |
| WebView Bridge       | `packages/webview-bridge/`                                        | Active, reduced scope | Optional host messaging / compatibility layer; not a justification for custom native modules | Keep minimal and aligned with WebView-first scope              |
| KMP Native Shell     | `packages/kmp-sdk/`                                               | Paused                | Retained for possible future mobile-native reuse                                             | Do not advance unless scope reopens                            |
| Swift Providers      | `packages/self-sdk-swift/`                                        | Paused                | Retained with KMP path for future reuse                                                      | Do not advance unless scope reopens                            |
| RN SDK               | `packages/rn-sdk/`                                                | Paused                | Retained React Native shell work                                                             | Do not advance unless scope reopens                            |
| Native Consolidation | `app/ios/`, `packages/mobile-sdk-alpha/ios/`, related native code | Paused                | Historical native cleanup and parity track                                                   | Keep as reference only for now                                 |
| MiniPay Sample       | `packages/kmp-minipay-sample/`                                    | Paused                | Historical KMP integration example                                                           | Resume only if KMP path returns                                |

## Scope Rules

1. **WebView-only is the active product scope.** Do not add new work that requires custom native modules for the current client path.
2. **KYC provider owns capture-heavy flows.** Document scan, MRZ extraction, liveness, and other end-to-end capture steps should come from a web-capable provider integration, not new Self native modules.
3. **Paused native work is retained, not deleted.** If Self Wallet or another mobile-native project needs it later, revive it from [Paused Work](./paused/INDEX.md).
4. **Keep active specs aligned with current reality.** Historical native design detail belongs in paused specs, not in the active delivery path.
5. **Prefer browser-native host contracts.** Use standard WebView/browser integration surfaces before inventing new bridge or packaging requirements.

## Where To Work

- **Current delivery:** [WebView Spec](./workstreams/webview/SPEC.md)
- **Shared engine follow-ups:** [SDK Core Spec](./workstreams/sdk-core/SPEC.md)
- **Retained native/KMP/RN work:** [Paused Work Index](./paused/INDEX.md)
