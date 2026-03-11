# WebView-Only Verification Experience — Implementation Spec

> Last updated: 2026-03-11
> Owner: WebView / Product Platform
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Scope Reset

On **March 11, 2026**, the active SDK scope changed to **WebView only, with no custom native modules**.

- The current client path should ship as a browser/WebView experience.
- Self-owned NFC, native MRZ/camera handlers, biometrics, keychain bridging, KMP shells, and RN native-shell packaging are out of scope for this workstream.
- End-to-end document capture and verification should route through a **web-capable KYC provider** such as Sumsub.
- The paused native specs are preserved under [SDK Paused Work](../../paused/INDEX.md) for possible future reuse in Self Wallet or other mobile-native projects.

## North Star

- **Goal:** Deliver the Self verification flow as a WebView/browser-native experience that does not depend on custom native modules.
- **Success metric:** A host launches the web flow, the user completes provider-backed capture/KYC and Self proof steps, and the host receives a consistent result using a web-friendly integration contract.
- **Constraint:** If a feature requires custom native modules for the current client path, it belongs in paused work unless product scope changes.

## Context

**What you own now:**

- `packages/webview-app/` — primary UI and orchestration surface
- Web-native host integration patterns — URL params, postMessage, or equivalent minimal host callback contract
- KYC-provider handoff points and result mapping inside the web flow
- Active coordination with `packages/mobile-sdk-alpha/` for browser-safe engine behavior

**What is no longer in this workstream's active scope:**

- Custom native bridge handlers for NFC, camera/MRZ, biometrics, secure storage, or lifecycle
- KMP shell delivery
- RN native-shell delivery
- Native MRZ/NFC consolidation

## Execution Model

- Stable WebView-first context lives in this file.
- PR-sized execution lives under [`plans/`](./plans/).
- If work touches native-module delivery, stop and check [SDK Paused Work](../../paused/INDEX.md).

## Backlog

| ID    | Title                                                                                           | Status | Priority | Depends On | Plan                                                                                       | Notes                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| WV-01 | Dynamic proof request items sourced from request context                                        | Ready  | High     | -          | [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md) | Existing active follow-up                                                                                                         |
| WV-02 | Define the KYC-provider contract for document capture, MRZ/liveness handoff, and result mapping | Ready  | High     | -          | [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)             | Provider-backed path replaces Self-owned native scan flow                                                                         |
| WV-03 | Remove native NFC and native-scan assumptions from active WebView screens, copy, and docs       | Ready  | High     | WV-02      | -                                                                                          | Active UX/docs should match the WebView-only scope                                                                                |
| WV-04 | Define the host callback contract for launch, dismiss, and final result without native modules  | Ready  | Medium   | WV-02      | -                                                                                          | Build on existing `SdkInitialConfig` and `VERIFICATION_COMPLETE` work; define only the WebView-host transport and embedding delta |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                       | IDs   | Status |
| ------------------------------------------------------------------------------------------ | ----- | ------ |
| [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md) | WV-01 | Ready  |
| [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)             | WV-02 | Ready  |

## Completion Checklist

- [ ] Active backlog reflects the WebView-only client scope
- [ ] KYC-provider dependency is explicit wherever scan/KYC UX is described
- [ ] Active docs do not imply Self-managed NFC or native scanning for the current client path
- [ ] Host integration contract is clear without assuming custom native modules

## Problem Statement

The previous SDK plan assumed a shared WebView plus native shells for hardware-heavy features. That is no longer the active delivery target. The current client wants the WebView experience without custom native modules, which changes the implementation boundary:

- Web UI, proof orchestration, and result handling stay in Self-owned code.
- Capture-heavy verification steps should be delegated to a web-capable KYC provider.
- Host integration should stay lightweight and browser/WebView-native.

## Design Principles

1. **WebView-first means web-native first.** Prefer browser/WebView integration patterns over any platform-specific bridge.
2. **Do not rebuild KYC infrastructure in native code.** If end-to-end scanning or liveness is needed, use the provider flow instead of reviving Self-managed native modules.
3. **Keep active UX honest.** If a step is provider-owned or paused, the active specs and screens must say so.
4. **Preserve reusable work without letting it drive scope.** Historical native work lives in [SDK Paused Work](../../paused/INDEX.md).
5. **Keep the engine portable.** `mobile-sdk-alpha` still needs clean browser-safe behavior because it powers the active WebView flow.

## In Scope

- WebView/browser UX for the active verification flow
- Request-driven proof configuration and request-item rendering
- Provider handoff, loading, return, and result-mapping states
- Minimal host integration contract for launch/result/dismiss
- Documentation cleanup so the active spec set matches the new scope

## Out of Scope

- Self-managed NFC flows
- Self-managed native MRZ/camera scanning
- New native bridge handlers or bridge-protocol expansion to support the current client path
- KMP packaging, XCFramework/AAR publishing, or RN native-shell publishing
- Native consolidation cleanup work

## Definition of Done

> **Done when:** the active verification flow works as a WebView/browser-native experience, provider-backed capture/KYC is clearly integrated into the flow, hosts can launch and receive results without custom native modules, and the active SDK specs no longer depend on paused native assumptions.

## Validation

Use Yarn-based validation for active packages:

```bash
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/webview-app build
```

## Related Specs

| Spec                                     | Relationship                                               |
| ---------------------------------------- | ---------------------------------------------------------- |
| [SDK Core Spec](../sdk-core/SPEC.md)     | Active dependency for browser/WebView-safe engine behavior |
| [SDK Overview](../../OVERVIEW.md)        | Current project scope and module status                    |
| [SDK Paused Work](../../paused/INDEX.md) | Historical native/KMP/RN work retained for future reuse    |
