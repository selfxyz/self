# Project Rules — Self SDK

> Rules specific to the Self SDK project. Global rules apply to everyone.
> Section rules apply to that workstream. Each rule has a one-line rationale.
> Read with [SDK-OVERVIEW.md](./SDK-OVERVIEW.md) when it exists.

## Global Rules

### Sequencing

1. **Migrate shared code to `mobile-sdk-alpha` BEFORE building webview UI that needs it.** Don't duplicate TypeScript between `app/` and `webview-app/`. If both need it, it belongs in the SDK.

2. **Each chunk = one PR.** Don't bundle chunks into mega PRs. Keeps reviews fast, reverts clean, and progress visible.

3. **Native shell work can run in parallel with SDK core work.** They share a contract (bridge protocol), not code. No blocking dependency.

### Reuse & Maintainability

4. **Keep the codebase DRY.** Before writing new code, search for existing utilities/components/flows and reuse or refactor to shared modules. Create new code only if a reusable option does not exist.

5. **Extract repeated UI.** If the same UI sub-structure appears in 2+ places, extract a shared component.

6. **Reusable UI belongs in shared libraries.** If a UI primitive is broadly reusable, add it to a shared library (e.g., `@selfxyz/euclid` or another shared package) instead of duplicating in feature code.

7. **Keep files small.** Aim for <800 LOC per file. If a file approaches 800 LOC, split it into smaller modules.

8. **Move static data out of UI.** Large static maps/lookups/constants do not belong in screen/components; move them to `utils/` or `data/` modules.

9. **Prefer design tokens over hex.** Use shared color/font/spacing tokens instead of raw hex values in UI code.

10. **No “slop comments.”** Only add comments when they convey non-obvious intent or constraints. Never add generic or chatty comments.

11. **Test value over mock wiring.** Prefer tests that validate behavior. Avoid tests that only assert mocks were called unless that is the behavior being validated.

12. **PR size target:** 1k–3k LOC changed. Smaller is fine for focused fixes. If >3k, add a brief justification for why it can’t be split.

13. **No generated artifacts in source PRs.** Do not commit build outputs or generated assets unless the build system requires them for runtime or distribution.

14. **Constraint tie-breaker.** If rules conflict, prioritize correctness and security first, then scope/clarity (small PRs, small files), then reuse. Document the tradeoff in the spec.

### Architecture

15. **TypeScript is the primary surface area. Native code is the minimum.** The WebView carries all core logic: proving machine, state machines, stores, document management, UI. Kotlin and Swift exist only for hardware access (NFC, camera, biometrics) and OS-level APIs (keychain, lifecycle). ZK circuits are the backend; TypeScript is the frontend. If you're writing logic in Kotlin or Swift that could run in the WebView, you're doing it wrong.

16. **"Can this run in the WebView?" gate.** Before writing ANY native code (Kotlin or Swift), answer this question. If the answer is yes — or even maybe — it belongs in TypeScript. Native code is ONLY justified when it requires: hardware APIs (NFC chip, camera sensor, biometric prompt), OS-level APIs (keychain, activity/VC lifecycle), or platform SDKs with no JS equivalent. Parsing, formatting, validation, error mapping, state management, and business logic are NEVER native — they run in the WebView.

17. **Maximize code reuse through `mobile-sdk-alpha`.** Before adding code to `webview-app`, `kmp-sdk`, or `app/`, check if `mobile-sdk-alpha` already has it or should have it. If two packages need the same logic, it belongs in the SDK. Extend the SDK rather than duplicating. Specifically:

- Types, interfaces, constants → `mobile-sdk-alpha`
- Parsing, validation, formatting → `mobile-sdk-alpha`
- State machines, stores → `mobile-sdk-alpha`
- UI components shared between flows → `mobile-sdk-alpha`
- Only screen-level composition and routing belong in `webview-app`

18. **New native handlers MUST follow the bridge protocol exactly.** Every native handler implements the JSON schema defined in SDK-OVERVIEW.md (request/response/event). No custom messaging, no side channels, no platform-specific extensions. The WebView must not know which native shell it's running inside.

### Code

19. **No `react-native` imports outside `src/adapters/react-native/`.** Core logic, stores, types, and constants must be platform-agnostic. Use adapter interfaces.

20. **Keychain/SecureStorage is always native-managed.** No web fallbacks for `AuthAdapter` or `StorageAdapter`. The WebView does not get direct keychain access. This is a security boundary.

21. **Adapter interfaces are the coupling layer.** Person 1 (webview) imports adapter interfaces from Person 4 (SDK core). Person 2 (native shells) implements bridge handlers. Nobody imports code across the bridge boundary.

22. **No logic in native shells.** Native handlers are pass-through: receive bridge request → call platform API → return bridge response. No parsing, no formatting, no validation, no error mapping, no state management. If a native handler is growing beyond ~50-100 lines per method, logic is leaking out of the WebView.

23. **Fail closed on security-critical boundaries.** For protocol compatibility, remote bundle loading, and verification session lifecycle, default-deny behavior is required. Reject unknown protocol versions, block remote `devServerUrl` in production, and allow only one active verification session at a time.

### Quality

24. **No regressions in the RN app.** Every change to `mobile-sdk-alpha` must be backwards-compatible with the existing Self Wallet app. Validate with `vitest run` and manual testing.

25. **Specs stay current.** When implementation deviates from the spec, update the spec. A stale spec is worse than no spec — it misleads the next person.

26. **Review status checklists before starting a work session.** Read the OVERVIEW.md status checklist and SPEC.md chunk status table before doing anything. Verify the status reflects reality. If something is marked "Done" that isn't, or "Pending" that's actually in progress, fix it first. Don't build on stale assumptions.

27. **Update status checklists as you complete work.** When you finish a chunk, check off the corresponding items in both the OVERVIEW.md status checklist and the SPEC.md chunk status table. This is the primary way devs and leads track progress — stale checklists erode trust in the specs.

### Planning

28. **Write plans to disk before executing.** When working on multi-step tasks (multiple chunks, cross-workstream coordination, or anything requiring more than one session), write the plan to a file BEFORE starting implementation. Update WAVE-PLAN.md, the relevant SPEC.md status table, or create a session-specific plan file. A plan that only exists in session memory will be lost to API errors, context overflow, or `/clear`. Writing it to disk enables multiple agents to work from the same plan and creates an audit trail.

29. **Update plan files as you go.** When a chunk is completed, mark it done in the plan file immediately. When scope changes, update the plan file. The plan file is the single source of truth for what's been done and what's next — not the session transcript.

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
grep -rE "from ['\"]react-native['\"]|require\(['\"]react-native['\"]\)" packages/mobile-sdk-alpha/src/ \
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

## SDK Core (Person 4)

1. **Don't refactor what works.** The adapter architecture and proving machine are sound. Remove platform contamination only — don't redesign.

2. **`@selfxyz/common` is out of scope.** If `common/` has Buffer or Node-specific issues, file those as a separate spec. Person 4 owns `mobile-sdk-alpha` only.

3. **Browser entry point (`src/browser.ts`) must have zero transitive `react-native` imports.** Verify with `madge` or bundle analysis after every change.

---

## KMP Native Shells (Person 2)

1. **Delete handlers that have web fallbacks.** Documents, crypto hashing, analytics, haptic — the WebView handles these. Keep only hardware-dependent handlers: NFC, Camera, Biometrics, Keychain, Lifecycle (+ crypto signing).

2. **iOS only needs 3 handlers initially.** NFC, Biometrics, Lifecycle. Camera is Phase 2. Keychain uses iOS Keychain Services directly.

3. **Test against the bridge protocol contract, not against Person 1's screens.** Use the KMP test app with mock WebView payloads.

4. **Native handlers are thin wrappers.** Receive JSON → call platform API → return JSON. No business logic, no data transformation, no state. If your Kotlin/Swift handler is doing anything beyond calling the platform SDK and mapping the result to a bridge response, move that logic to TypeScript in mobile-sdk-alpha.

---

## WebView UI (Person 1)

1. **Don't duplicate TypeScript from `app/`.** If a utility, type, or flow exists in the RN app and the webview needs it, migrate it to `mobile-sdk-alpha` first (or request Person 4 to).

2. **All native capabilities go through the bridge.** No direct native module calls. Use adapter implementations that call `bridge.request()`.

3. **Web fallback adapters for non-hardware concerns.** IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics. Only bridge to native for hardware (NFC, camera, biometrics) and security boundaries (keychain).

---

## RN SDK (Person 5)

1. **Thin wrapper only.** `SelfVerification` is a `react-native-webview` component with 5 native handler bridges. Target: 200-300 LOC. If it's growing beyond that, logic is leaking out of the WebView.

2. **Same bridge protocol as KMP.** No custom messaging. The WebView doesn't know if it's inside a KMP shell or an RN shell.
