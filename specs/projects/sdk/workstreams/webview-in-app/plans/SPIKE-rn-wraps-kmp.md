# SPIKE — Should `rn-sdk` wrap `kmp-sdk` instead of reimplementing the bridge in TS?

> Status: Research complete, prototype not yet started
> Author: research pass on 2026-05-25
> Parent: [WebView-in-App](../SPEC.md), [Native Adapters](../SPEC-NATIVE-ADAPTERS.md)

## Why this spike exists

[Native Adapters spec](../SPEC-NATIVE-ADAPTERS.md) (Decision 1) commits to building a new RN-side `SelfCrypto` native module inside `packages/rn-sdk/`. That decision was made before the MOD-01 → MOD-06 series in the `kmp-sdk` workstream made the same `crypto` handler addressable from KMP commonMain through a provider registry. Building it twice — once in Kotlin/Swift inside `kmp-sdk`, once in Kotlin/Swift inside `rn-sdk`'s native folder — is the duplication concern raised internally on 2026-05-25.

You are evaluating one question: **should `packages/rn-sdk/` ship a React Native binding that delegates the bridge router and handlers into `packages/kmp-sdk/`, instead of maintaining a parallel TS MessageRouter + TS handlers + a new RN-only `SelfCrypto` native module?**

A confirmed external native-Kotlin consumer exists. `kmp-sdk` cannot be retired. The question is whether RN reuses it or runs parallel.

## Current state — what the research found

### Two-repo split (this changes the calculus)

The `kmp-sdk` and `self-sdk-swift` packages now exist in **two repos**:

- `selfxyz/self` (this monorepo, public): `packages/kmp-sdk/`, `packages/self-sdk-swift/`. Pre-MOD state.
- `selfxyz/self-webview-sdk` (internal, private, created 2026-04-10): `kmp-sdk/`, `self-sdk-swift/`, `kmp-sdk-test-app/`, `specs/optional-modules/`. MOD-01/02/04 land here (PR #7 currently open against `dev`).

The MOD work is **not** in this repo and there is no convergence plan in writing. Before the spike commits to a path, this split has to resolve. If `self-webview-sdk` becomes canonical, this repo's `packages/kmp-sdk/` is dead code. If they converge into one place, where?

### `kmp-sdk` publishing posture

`packages/kmp-sdk/shared/build.gradle.kts:1-216` already has:
- `maven-publish` plugin enabled
- `iosArm64()` + `iosSimulatorArm64()` framework targets configured (static `SelfSdk` framework)
- `createXCFramework` task (currently debug-variant only)

What's missing: remote repository configuration and a publish workflow. **SD-06 (`SELF-2534`) specs exactly this work** — Maven via GitHub Packages, `Package.swift` switched from local path to `.binaryTarget(url:checksum:)`, GitHub Actions workflow `publish-kmp-sdk.yml`. Owner: Ayman. Status: Todo. **Not a research unknown — it's a tracked-but-unstarted task.**

### `kmp-sdk` iOS uses providers, not direct K/N-to-native calls

`packages/kmp-sdk/shared/build.gradle.kts:34-63` shows cinterop **disabled**, with a comment that iOS handlers currently throw `NotImplementedError` and need consumer-provided implementations. The actual iOS handler shape (e.g. `kmp-sdk/shared/src/iosMain/.../handlers/CryptoBridgeHandler.kt`) delegates into `IosProviderRegistry` (`packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/IosProviderRegistry.kt:7-32`), where consumers register Swift-implemented providers.

**Implication:** "RN wraps KMP" on iOS does **not** mean writing Kotlin/Native code or fighting cinterop. It means writing Swift providers that wrap RN libraries (`react-native-keychain` → `SecureStorageProvider`, etc.) and registering them with `IosProviderRegistry` before mounting the WebView. This is materially easier than the user-facing framing suggested.

### Bridge router parity

`packages/kmp-sdk/shared/src/commonMain/.../MessageRouter.kt:15-159` and `packages/rn-sdk/src/bridge/MessageRouter.ts:34-176` implement the same protocol with minor envelope differences:

- KMP envelope: `BridgeResponse { id, domain, requestId, success, data?, error? }`
- TS envelope: `BridgeResponse { type, version, id, domain, requestId, success, data?, error?, timestamp }`
- KMP drops malformed messages silently; TS logs to console first
- KMP enforces `isTrustedSource` boolean parameter; TS has no equivalent
- KMP error code on missing handler is `DOMAIN_NOT_FOUND`; TS uses `HANDLER_NOT_FOUND`

These drifts exist today and are a soft "different shells, slightly different behavior" violation of the [webview-in-app invariant 1](../SPEC.md#invariants). Path A (wrapping KMP) eliminates them by construction. Path B (status quo) requires a separate cleanup PR to converge.

### `feat/sdk-native-modules` is not the MOD work

That branch in this repo predates the MOD plan and adds RN-native modules inside `packages/mobile-sdk-alpha/` (e.g. `RNSelfPassportReaderModule.kt`, `SelfMRZScannerModule.swift`). It's the old "consolidate native modules into mobile-sdk-alpha so the RN app can autolink them" approach, not the provider-registry refactor. Do not use it as a reference for the spike.

## The fork

### Path A — `rn-sdk` wraps `kmp-sdk` via the provider registry

`packages/rn-sdk/` becomes a thin layer:
- `SelfVerification.tsx` keeps the `<WebView>` JSX, lifecycle props, and prop-to-handler wiring
- The TS `MessageRouter` is deleted. The WebView's `onMessage` callback forwards raw JSON into the native module; responses come back via JS injection emitted by KMP's router
- A new RN native module (one per platform) exposes two methods to JS: `onMessageFromWebView(rawJson)` and `subscribeToInjections(callback)`. The Kotlin/Swift bodies hand off to a long-lived `MessageRouter` instance owned by the module
- On iOS, before the WebView mounts, the RN module registers Swift providers into `IosProviderRegistry` that wrap existing RN libraries (`react-native-keychain`, `react-native-biometrics`, `react-native-passport-reader`, the existing `MRZScannerModule`)
- On Android, the RN module registers the same providers (Kotlin-side) via the equivalent registry being added in MOD-01

What gets deleted from `rn-sdk` if this lands: all eight TS handlers in `packages/rn-sdk/src/handlers/`, `packages/rn-sdk/src/bridge/MessageRouter.ts`, and the planned `SelfCrypto` native module (WIA-05) — its responsibility moves into `AndroidKeystoreCryptoProvider.kt` (already in `kmp-sdk/shared/src/androidMain/`) and the iOS Swift `CryptoProvider` already used in `self-sdk-swift`.

### Path B — keep parallel TS implementations (current spec)

WIA-02 through WIA-15 land as written. `rn-sdk` ships its own router and handlers. `SelfCrypto` (WIA-05) is built net-new in Kotlin + Swift inside `packages/rn-sdk/android/` and `packages/rn-sdk/ios/`. Every future bridge protocol change has to land in both Kotlin (KMP) and TypeScript (rn-sdk). The router envelope drift documented above is fixed by editing both sides.

## Recommendation

**Proceed to Phase 2 prototype on Path A**, but only after the two-repo split is resolved. The publishing infrastructure is already specced (SD-06), the iOS provider model is materially simpler than the framing implied, and Path A collapses ~7 TS handlers + the planned SelfCrypto module + the router envelope drift into "register providers and dispatch."

The single thing that could still kill Path A in Phase 2 is **AAR + XCFramework distribution-and-autolinking inside an npm tarball**. That has to be proven on at least one platform before the recommendation hardens. The prototype below tests exactly that.

## Phase 2 — prototype scope (only if greenlit)

You are proving the binding works for **one domain on one platform**. Anything beyond that is scope creep.

### Required

- Pick `secureStorage` as the domain. Three methods, no native sessions, fastest to wire.
- Pick **Android first**. KMP Android is more mature than KMP iOS (cinterop disabled, all iOS handlers are NotImplementedError stubs without registry-provided implementations) and removes one layer of unknown from the first prototype.
- Land KMP artifact publishing locally (`./gradlew publishToMavenLocal` from `packages/kmp-sdk/`) using the existing `maven-publish` config. Do not block on SD-06's remote publishing — local is enough for the prototype.
- Add a Gradle dependency from `packages/rn-sdk/android/build.gradle` to the locally published `xyz.self.sdk:shared:0.1.0` AAR.
- Write a new `packages/rn-sdk/android/src/main/java/xyz/self/rnsdk/SelfBridgeModule.kt` that:
  - Holds one `MessageRouter` instance
  - Registers `AndroidKeystoreCryptoProvider` and `EncryptedSharedPreferencesProvider` via `SdkProviderRegistry` at module init
  - Registers `SecureStorageBridgeHandler` with the router
  - Exposes `onMessageFromWebView(rawJson: String)` to JS via `@ReactMethod`
  - Sends router output back to JS via `injectJavaScript`-equivalent (DeviceEventEmitter for now; refine later)
- Modify `SelfVerification.tsx` to forward `onMessage` to `NativeModules.SelfBridge.onMessageFromWebView` *only when the new path is active* (gate behind a prop or env flag — do not break existing behavior)
- Use `packages/rn-sdk-test-app/` to run the prototype on an Android emulator or device
- Validate by hitting `bridge.secureStorage.set` → `bridge.secureStorage.get` round-trip from a stub WebView page

### Abort conditions

Stop and write up findings without finishing if any of these become true:

1. The AAR cannot be consumed by `packages/rn-sdk/android/build.gradle` without bespoke consumer-side Gradle config (e.g. requires the host app to add `mavenLocal()` or hardcode the AAR group). Path A's ergonomic appeal depends on this being transparent.
2. The total new native glue exceeds ~250 LOC across `SelfBridgeModule.kt` + any package registration. Above that, "rn-sdk is thin" stops being true.
3. Round-tripping JSON between WebView → RN module → KMP router → RN module → WebView adds latency > 50ms per call on a release build. The current TS path is in-process; a slow native bridge would regress WebView perf.
4. The prototype exposes a thread-safety or lifecycle problem (e.g. RN module instance lifecycle vs. WebView lifecycle vs. router coroutine scope) that requires a non-trivial fix.
5. Phase 2 runs longer than 5 working days.

### Out of scope for the prototype

- iOS. Defer until Android proves the binding model.
- Any handler other than `secureStorage`.
- Replacing TS handlers in `rn-sdk` for domains other than secureStorage.
- Self Wallet integration. The prototype lives in `rn-sdk-test-app` only.
- Production publishing (SD-06). Local Maven is sufficient.
- Removing the existing TS `MessageRouter` or TS handlers. Both paths coexist behind the gate flag during the prototype.
- Convergence of `selfxyz/self` ↔ `selfxyz/self-webview-sdk` kmp-sdk forks. That's a separate decision — see below.

## Pre-prerequisite: resolve the two-repo split

Before Phase 2 starts, you need a written answer to:

1. Is `selfxyz/self-webview-sdk` the canonical home for `kmp-sdk` going forward, or is `selfxyz/self/packages/kmp-sdk/` canonical?
2. If `self-webview-sdk` is canonical, what's the plan for the `kmp-sdk` directory in this repo — delete it, mirror it via a sync script, or vendor it as a git submodule / published artifact?
3. If the two should converge into this monorepo, when, and who owns the merge?

The spike's recommendation assumes one source of truth. If the split persists, Path A becomes "rn-sdk in this repo wraps an artifact published from another repo," which is fine architecturally but adds a release-coordination cost that should be visible before the work starts.

## What lands in the repo from this spike — regardless of outcome

- This file (the decision record)
- If Phase 2 runs: a branch `spike/rn-wraps-kmp` with the prototype code, merged into nothing
- A summary comment on Linear project `Native Modules - WVSDK` linking back here

## Out of scope for the spike itself

- Any changes to `packages/native-shell-android/` or `packages/native-shell-ios/` — those continue to serve non-RN consumers via plain Kotlin/Swift; this spike is about the RN path only
- WebView-side changes (no `packages/webview-app/` edits)
- Bridge protocol envelope changes (the drift documented above is informational; converging the envelopes is a follow-up regardless of Path A vs B)
- Retirement of any handler in `rn-sdk` (Path A would eventually retire them but that's separate PRs after the prototype proves)
- Cloud backup, push notification token registration, and the other [Known Gaps](../SPEC-NATIVE-ADAPTERS.md#known-gaps) — out of scope for both paths
