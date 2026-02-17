# Project Rules — Self SDK

> Rules specific to the Self SDK project. Global rules apply to everyone.
> Section rules apply to that workstream. Each rule has a one-line rationale.

## Global Rules

### Sequencing

1. **Migrate shared code to `mobile-sdk-alpha` BEFORE building webview UI that needs it.** Don't duplicate TypeScript between `app/` and `webview-app/`. If both need it, it belongs in the SDK.

2. **Each chunk = one PR.** Don't bundle chunks into mega PRs. Keeps reviews fast, reverts clean, and progress visible.

3. **Native shell work can run in parallel with SDK core work.** They share a contract (bridge protocol), not code. No blocking dependency.

### Architecture

4. **TypeScript is the primary surface area. Native code is the minimum.** The WebView carries all core logic: proving machine, state machines, stores, document management, UI. Kotlin and Swift exist only for hardware access (NFC, camera, biometrics) and OS-level APIs (keychain, lifecycle). ZK circuits are the backend; TypeScript is the frontend. If you're writing logic in Kotlin or Swift that could run in the WebView, you're doing it wrong.

5. **Maximize code reuse through the SDK.** `mobile-sdk-alpha` is the shared TypeScript package. Webview UI, RN app, and any future client all consume it. Extend the SDK rather than duplicating code in native shells or host apps.

### Code

6. **No `react-native` imports outside `src/adapters/react-native/`.** Core logic, stores, types, and constants must be platform-agnostic. Use adapter interfaces.

7. **Keychain/SecureStorage is always native-managed.** No web fallbacks for `AuthAdapter` or `StorageAdapter`. The WebView does not get direct keychain access. This is a security boundary.

8. **Adapter interfaces are the coupling layer.** Person 1 (webview) imports adapter interfaces from Person 3 (SDK core). Person 2 (native shells) implements bridge handlers. Nobody imports code across the bridge boundary.

### Quality

9. **No regressions in the RN app.** Every change to `mobile-sdk-alpha` must be backwards-compatible with the existing Self Wallet app. Validate with `vitest run` and manual testing.

10. **Specs stay current.** When implementation deviates from the spec, update the spec. A stale spec is worse than no spec — it misleads the next person.

---

## SDK Core (Person 3)

1. **Don't refactor what works.** The adapter architecture and proving machine are sound. Remove platform contamination only — don't redesign.

2. **`@selfxyz/common` is out of scope.** If `common/` has Buffer or Node-specific issues, file those as a separate spec. Person 3 owns `mobile-sdk-alpha` only.

3. **Browser entry point (`src/browser.ts`) must have zero transitive `react-native` imports.** Verify with `madge` or bundle analysis after every change.

---

## KMP Native Shells (Person 2)

1. **Delete handlers that have web fallbacks.** Documents, crypto, analytics, haptic — the WebView handles these. Keep only hardware-dependent handlers: NFC, Camera, Biometrics, Keychain, Lifecycle.

2. **iOS only needs 3 handlers initially.** NFC, Biometrics, Lifecycle. Camera is Phase 2. Keychain uses iOS Keychain Services directly.

3. **Test against the bridge protocol contract, not against Person 1's screens.** Use the KMP test app with mock WebView payloads.

---

## WebView UI (Person 1)

1. **Don't duplicate TypeScript from `app/`.** If a utility, type, or flow exists in the RN app and the webview needs it, migrate it to `mobile-sdk-alpha` first (or request Person 3 to).

2. **All native capabilities go through the bridge.** No direct native module calls. Use adapter implementations that call `bridge.request()`.

3. **Web fallback adapters for non-hardware concerns.** IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics. Only bridge to native for hardware (NFC, camera, biometrics) and security boundaries (keychain).

---

## RN SDK (Person 4 / New)

1. **Thin wrapper only.** `<SelfVerification />` is a `react-native-webview` component with 5 native handler bridges. Target: 200-300 LOC. If it's growing beyond that, logic is leaking out of the WebView.

2. **Same bridge protocol as KMP.** No custom messaging. The WebView doesn't know if it's inside a KMP shell or an RN shell.
