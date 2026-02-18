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

5. **"Can this run in the WebView?" gate.** Before writing ANY native code (Kotlin or Swift), answer this question. If the answer is yes — or even maybe — it belongs in TypeScript. Native code is ONLY justified when it requires: hardware APIs (NFC chip, camera sensor, biometric prompt), OS-level APIs (keychain, activity/VC lifecycle), or platform SDKs with no JS equivalent. Parsing, formatting, validation, error mapping, state management, and business logic are NEVER native — they run in the WebView.

6. **Maximize code reuse through `mobile-sdk-alpha`.** Before adding code to `webview-app`, `kmp-sdk`, or `app/`, check if `mobile-sdk-alpha` already has it or should have it. If two packages need the same logic, it belongs in the SDK. Extend the SDK rather than duplicating. Specifically:
   - Types, interfaces, constants → `mobile-sdk-alpha`
   - Parsing, validation, formatting → `mobile-sdk-alpha`
   - State machines, stores → `mobile-sdk-alpha`
   - UI components shared between flows → `mobile-sdk-alpha`
   - Only screen-level composition and routing belong in `webview-app`

7. **New native handlers MUST follow the bridge protocol exactly.** Every native handler implements the JSON schema defined in SDK-OVERVIEW.md (request/response/event). No custom messaging, no side channels, no platform-specific extensions. The WebView must not know which native shell it's running inside.

### Code

8. **No `react-native` imports outside `src/adapters/react-native/`.** Core logic, stores, types, and constants must be platform-agnostic. Use adapter interfaces.

9. **Keychain/SecureStorage is always native-managed.** No web fallbacks for `AuthAdapter` or `StorageAdapter`. The WebView does not get direct keychain access. This is a security boundary.

10. **Adapter interfaces are the coupling layer.** Person 1 (webview) imports adapter interfaces from Person 3 (SDK core). Person 2 (native shells) implements bridge handlers. Nobody imports code across the bridge boundary.

11. **No logic in native shells.** Native handlers are pass-through: receive bridge request → call platform API → return bridge response. No parsing, no formatting, no validation, no error mapping, no state management. If a native handler is growing beyond ~50-100 lines per method, logic is leaking out of the WebView.

### Quality

12. **No regressions in the RN app.** Every change to `mobile-sdk-alpha` must be backwards-compatible with the existing Self Wallet app. Validate with `vitest run` and manual testing.

13. **Specs stay current.** When implementation deviates from the spec, update the spec. A stale spec is worse than no spec — it misleads the next person.

---

## Guardrail Enforcement

Rules are only useful if agents read and follow them. Three enforcement layers:

### 1. Session Start (preventive)

Every spec session begins by reading `SPEC-GUIDE.md` and `PROJECT-RULES.md`. The quick start prompts in SPEC-GUIDE.md require this. Agents that skip this step will violate guardrails because they don't know they exist.

### 2. Per-Chunk "You Will NOT" Section (directive)

Each chunk in an implementation spec includes explicit constraints. These are read as part of the chunk prompt, so the agent sees them at the moment of implementation. Example:

```
You will NOT:
- Add logic (parsing, validation, formatting) to Kotlin or Swift code
- Import react-native in any file outside src/adapters/react-native/
- Duplicate types or utilities that exist in mobile-sdk-alpha
- Create custom bridge messaging outside the JSON protocol
- Skip running the validation command after completing the chunk
```

### 3. Validation Commands (detective)

Concrete commands that catch violations after code is written. Include these in every chunk's validation step:

```bash
# Verify no RN imports leaked into core
grep -r "from 'react-native'" packages/mobile-sdk-alpha/src/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "adapters/react-native" \
  | grep -v ".native." && echo "FAIL: RN import in core" || echo "PASS"

# Verify browser entry point is clean
npx madge --circular packages/mobile-sdk-alpha/src/browser.ts 2>/dev/null \
  || echo "Install madge for circular dependency check"

# Verify SDK tests still pass (no regressions)
cd packages/mobile-sdk-alpha && npx vitest run

# Verify bridge tests pass
cd packages/webview-bridge && npx vitest run
```

---

## SDK Core (Person 3)

1. **Don't refactor what works.** The adapter architecture and proving machine are sound. Remove platform contamination only — don't redesign.

2. **`@selfxyz/common` is out of scope.** If `common/` has Buffer or Node-specific issues, file those as a separate spec. Person 3 owns `mobile-sdk-alpha` only.

3. **Browser entry point (`src/browser.ts`) must have zero transitive `react-native` imports.** Verify with `madge` or bundle analysis after every change.

---

## KMP Native Shells (Person 2)

1. **Delete handlers that have web fallbacks.** Documents, crypto hashing, analytics, haptic — the WebView handles these. Keep only hardware-dependent handlers: NFC, Camera, Biometrics, Keychain, Lifecycle (+ crypto signing).

2. **iOS only needs 3 handlers initially.** NFC, Biometrics, Lifecycle. Camera is Phase 2. Keychain uses iOS Keychain Services directly.

3. **Test against the bridge protocol contract, not against Person 1's screens.** Use the KMP test app with mock WebView payloads.

4. **Native handlers are thin wrappers.** Receive JSON → call platform API → return JSON. No business logic, no data transformation, no state. If your Kotlin/Swift handler is doing anything beyond calling the platform SDK and mapping the result to a bridge response, move that logic to TypeScript in mobile-sdk-alpha.

---

## WebView UI (Person 1)

1. **Don't duplicate TypeScript from `app/`.** If a utility, type, or flow exists in the RN app and the webview needs it, migrate it to `mobile-sdk-alpha` first (or request Person 3 to).

2. **All native capabilities go through the bridge.** No direct native module calls. Use adapter implementations that call `bridge.request()`.

3. **Web fallback adapters for non-hardware concerns.** IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics. Only bridge to native for hardware (NFC, camera, biometrics) and security boundaries (keychain).

---

## RN SDK (Person 4 / New)

1. **Thin wrapper only.** `<SelfVerification />` is a `react-native-webview` component with 5 native handler bridges. Target: 200-300 LOC. If it's growing beyond that, logic is leaking out of the WebView.

2. **Same bridge protocol as KMP.** No custom messaging. The WebView doesn't know if it's inside a KMP shell or an RN shell.
