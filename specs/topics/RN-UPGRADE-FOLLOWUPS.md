# RN Upgrade Follow-Ups

_Created: 2026-05-24, alongside the RN 0.77 → 0.83 / Expo SDK 52 → 55 / React 18 → 19 upgrade landing._

Tracks deferred work surfaced during PR review of `justin/upgrade-react-native-phase1` that did **not** block merging the upgrade but needs explicit ownership and acceptance criteria so it isn't lost.

This is a topic-level umbrella doc. Each item below should become a Linear issue (and, for SDK-touching work, a workstream-level spec under `specs/projects/sdk/workstreams/<scope>/`) before implementation. Mark items `Done` and link the PR/issue when shipped; never remove rows, since the historical context is the point.

## Related context

- [React Native Upgrade Plan](./RN-UPGRADE-PLAN.md) — narrative plan for the multi-phase upgrade
- [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md) — version tracker, gate decisions
- [Fabric View Managers](./RN-UPGRADE-FABRIC-VIEW-MANAGERS.md) — Android Fabric migration; iOS Paper exception documented at the bottom

## Items

### 1. iOS PassportOCRView Fabric migration vs. formal Paper exception

**Status:** Open. **Owner:** _unassigned_. **Target:** Phase 2 (SDK 56 / RN 0.85.x) gate.

Android `PassportOCRViewManager` was migrated to Fabric via `app/src/specs/PassportOCRViewNativeComponent.ts` codegen during this upgrade. iOS still uses legacy paper `requireNativeComponent('PassportOCRView')` in `app/src/components/native/PassportCamera.tsx`. The Fabric doc records this as intentional but does not commit to either migrating iOS or formally sunsetting the Paper exception.

**Scope of follow-up:**

- Decide: migrate iOS to Fabric (codegen spec + native interop wrapper) OR document an explicit Paper exception with a sunset trigger (e.g. "remove when RN drops Paper interop support, currently planned post-0.85").
- If migrating: produce a parallel codegen spec to `PassportOCRViewNativeComponent.ts` for the iOS-side props/events, update `PassportCamera.tsx` to use it on iOS, and add a Fabric-mounted iOS test mirroring `PassportCamera.android.test.tsx`.
- If keeping Paper: add the exception + sunset condition to `RN-UPGRADE-FABRIC-VIEW-MANAGERS.md` (replace the current implicit acknowledgement) and add a CI/build check that fails if Paper interop becomes unsupported in a future RN bump.

**Acceptance criteria:**

- A decision is recorded in `RN-UPGRADE-FABRIC-VIEW-MANAGERS.md` with linked PR/issue.
- If migrating, iOS production traffic uses the Fabric component end-to-end (MRZ read + error events both wired).
- The same decision is applied to `QRCodeScanner.tsx` if its iOS path follows the same Paper pattern — audit at the same time to avoid drift.

### 2. KYC Path A / Path B event-ordering audit

**Status:** Open. **Owner:** _unassigned_. **Target:** Analytics workstream. **Home:** belongs under `specs/projects/sdk/workstreams/analytics/` — file as a sibling to ANA-12.

The Path C bug (SCAN_STARTED firing **after** SESSION_REQUESTED) was fixed in this PR for `app/src/providers/selfClientProvider.tsx`. The identical pattern exists in:

- **Path A** — `app/src/hooks/useKycLauncher.ts` (biometric fallback)
- **Path B** — `app/src/screens/documents/selection/LogoConfirmationScreen.tsx` ("no chip" branch)

Paths A and B usually "work" only because earlier MRZ/NFC `trackOnboardingStep` calls have already bootstrapped the funnel attempt, but the ordering is fragile and inconsistent with the Path C invariant in `specs/projects/sdk/workstreams/analytics/plans/ANA-12-branch-specific-funnel-events.md`.

**Scope of follow-up:**

- Audit Paths A and B and either reorder or document why ordering doesn't matter at each site.
- If reordering, consolidate the three KYC emission sites onto a single helper (ANA-12 explicitly flags this consolidation as a separate follow-up; this is the issue that consolidates).
- Add ordering-assertion tests for Paths A and B mirroring the Path C test added in this PR in `app/tests/src/providers/selfClientProvider.test.tsx`.

**Acceptance criteria:**

- All three KYC emission paths assert SCAN_STARTED-before-branch-event invariant via test.
- Optionally: one shared helper replaces the three duplicated event sequences.

### 3. Analytics constants mock drift

**Status:** Open. **Owner:** _unassigned_. **Target:** SDK workstream hygiene.

`app/jest.setup.js` grew ~234 lines of inlined analytics-constants mocks during this upgrade. These mirror constants defined in `@selfxyz/mobile-sdk-alpha/constants/analytics` and will silently rot when the SDK adds, removes, or renames events.

**Scope of follow-up:**

- Replace the inlined block with either (a) a direct import from `@selfxyz/mobile-sdk-alpha/constants/analytics` (preferred — pulls from the canonical source) or (b) a CI check that diffs the inlined list against the SDK source and fails on divergence.
- Option (a) requires confirming the constants module has no transitive RN imports that would re-introduce the OOM hazard documented in the `app/AGENTS.md` Test Memory Optimization section. If it does, option (b) is the fallback.

**Acceptance criteria:**

- A future SDK change that renames a KYC event causes test setup to fail immediately, not when a specific assertion happens to reach a stale constant.

### 4. `PassportCamera.android.test.tsx` memory pattern verification

**Status:** Open. **Owner:** _unassigned_. **Target:** Test infrastructure hygiene.

`app/tests/src/components/PassportCamera.android.test.tsx` (new in this PR) uses `jest.isolateModules` with `jest.doMock('react-native', ...)` and nested `require(...)` calls (see file header). This is structurally adjacent to the nested-require pattern documented in the `app/AGENTS.md` Test Memory Optimization section that causes CI OOM. The existing OOM guard targets `require('react-native')` literals; the `isolateModules` + `doMock` pattern bypasses that check by design.

The test passes today and CI hasn't OOMed on it, but the pattern deserves a deliberate decision:

**Scope of follow-up:**

- Either (a) confirm the pattern is safe (memory profile under CI conditions) and update `app/AGENTS.md` Test Memory Optimization section to explicitly allowlist the `isolateModules + doMock` pattern, OR (b) refactor the test to a hoisted-mock / Mock-alias pattern matching the rest of `app/tests/` and remove the `isolateModules` block.
- If (b), retain the same behavioral assertions (Android Fabric path, `extractMRZInfo` invocation, `isMounted` prop propagation).

**Acceptance criteria:**

- Either the pattern is documented as supported in `app/AGENTS.md` with a rationale, or the test is refactored to the project's standard mocking pattern.

### 5. (Optional) Root vs app React/RN version skew documentation

**Status:** Open. **Owner:** _unassigned_. **Target:** Monorepo policy.

Root `package.json` no longer declares `react`/`react-native` directly; the app workspace pins them, and resolutions force `@types/react@19` repo-wide. Confirm this is the intended steady-state contract for `mobile-sdk-alpha` peer ranges, and document the decision in either `OVERVIEW.md` or `app/AGENTS.md` so the next React major doesn't reopen the question.

**Acceptance criteria:**

- A short note in the SDK overview (or `app/AGENTS.md`) recording: "App workspace owns RN/React version; SDK peers must accept the app's pinned majors. Root has no direct RN/React dependency."
