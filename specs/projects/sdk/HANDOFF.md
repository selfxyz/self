# SDK Implementation — Follow-Up Tracker

> Branch: `justin/kmp-wrap-up-evi-handoff-work`
> Last updated: 2026-02-23
> Prior review: 2026-02-19 (`feat/person1-2-3-implementation`)

## What Was Delivered

Five new packages, all implemented. Validation status:

| Package                       | Tests                | Status |
| ----------------------------- | -------------------- | ------ |
| `@selfxyz/webview-bridge`     | 63/63                | Done   |
| `@selfxyz/webview-app`        | — (build-verified)   | Done   |
| `@selfxyz/rn-sdk`             | 64/64                | Done   |
| `@selfxyz/self-sdk-swift`     | — (compile-verified) | Done   |
| `@selfxyz/kmp-minipay-sample` | — (scaffold)         | Done   |

KMP SDK: `compileKotlinIosSimulatorArm64` + `jvmTest` passing. iOS Maestro launch: 1 test, 0 failures.

Chunk completion: 23/30 done, 3 partial, 1 skipped, 2 superseded, 1 deferred. See [SDK Wave Plan](./PLAN.md) for details.

## Open Follow-Up Items

### P1 — Validation Gaps

| Item                                      | Owner    | Context                                                      |
| ----------------------------------------- | -------- | ------------------------------------------------------------ |
| KMP test app validation on both platforms | Person 2 | Compile-verified only; no runtime validation captured.       |
| Integration validation in Self Wallet app | Person 5 | `SelfVerification` component not yet wired into Self Wallet. |

### P2 — Correctness / Consistency

| Item                                                             | Owner      | Context                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consolidate duplicated fallback adapters                         | Person 4   | ~150 LOC duplicated across `webview-bridge/adapters/` and `mobile-sdk-alpha/adapters/browser/` (analytics, documents, haptic). `mobile-sdk-alpha` is canonical owner; bridge copies are transitional.                                                                                 |
| Source dynamic proving request values from request context       | Person 1   | `ProvingScreen` now accepts params but default values are still hardcoded. Config should flow from `SelfSdk.launch(request)`.                                                                                                                                                         |
| Expose `generateKey()`/`getPublicKey()` in `BridgeCryptoAdapter` | Person 1/4 | Methods exist in iOS native handler (`CryptoBridgeHandler.kt`) and bridge protocol types (`CryptoMethod`), but the `BridgeCryptoAdapter` interface in `webview-bridge/adapters/crypto.ts` only exposes `hash()` and `sign()`. WebView client code cannot call key management methods. |

### P3 — Publishing / Packaging

| Item                                           | Owner    | Context                                                                           |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| npm publish `@selfxyz/rn-sdk`                  | Person 5 | Package is implemented but not published.                                         |
| Production artifact builds (AAR + XCFramework) | Person 2 | KMP SDK packaging for distribution not finalized.                                 |
| Self Wallet migration to `SelfVerification`    | Person 5 | Phase 2 — Self Wallet replaces native verification screens with SDK WebView flow. |

### Deferred (Phase 2)

| Item                         | Chunk | Context                                                                                              |
| ---------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| iOS Camera MRZ Handler (KMP) | 2L    | Camera/MRZ on iOS via KMP deferred to Phase 2. RN SDK has its own implementation via native modules. |

## Resolved Decisions (Reference)

These decisions were made during this PR cycle. They are now documented in [SDK Overview](./OVERVIEW.md) and do not need further action:

- **Hybrid crypto contract:** `hash()` in WebView, `sign()`/`generateKey()`/`getPublicKey()` native.
- **Fallback adapter ownership:** `mobile-sdk-alpha` is canonical; `webview-bridge` copies are transitional.
- **Platform asymmetry:** Android = 5-handler normative minimum, iOS = 9-handler compatibility superset. Signed off.
- **iOS lifecycle fixes:** Flat payload handling, Mutex synchronization, debug port 5173 — all implemented.

## Suggested Follow-Up PR Order

1. **Correctness cleanup** — Adapter consolidation, dynamic proving config, crypto adapter interface gap
2. **Publishing** — npm publish rn-sdk, finalize AAR/XCFramework packaging
3. **Self Wallet migration** — Wire `SelfVerification` into the main app (Phase 2)

## Architecture Notes

- Draft consolidation plan: [Euclid Web Consolidation Plan](../euclid/PLAN.md)
