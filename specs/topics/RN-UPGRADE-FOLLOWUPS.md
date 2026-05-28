# RN Upgrade Follow-Ups

_Created: 2026-05-24, alongside the RN 0.77 → 0.83 / Expo SDK 52 → 55 / React 18 → 19 upgrade landing._

Tracks deferred work surfaced during PR review of `justin/upgrade-react-native-phase1` that did **not** block merging the upgrade but needs explicit ownership and acceptance criteria so it isn't lost.

This is a topic-level umbrella doc. SDK-touching items still need a workstream-level spec under `specs/projects/sdk/workstreams/<scope>/` before implementation. App-only chore/cleanup items (lint, test infra, mock drift, docs) ship directly from this doc — see the PR breakdown below — and skip Linear since branch naming + this umbrella provide traceability. Mark items `Done` and link the PR when shipped; never remove rows, since the historical context is the point.

## Related context

- [React Native Upgrade Plan](./RN-UPGRADE-PLAN.md) — narrative plan for the multi-phase upgrade
- [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md) — version tracker, gate decisions
- [Fabric View Managers](./RN-UPGRADE-FABRIC-VIEW-MANAGERS.md) — Android Fabric migration; iOS Paper exception documented at the bottom

## PR breakdown

These follow-ups ship as **4 PRs total**, grouped to keep each within the 1k–3k LOC target and avoid mixing semantically unrelated concerns. Linear issues are skipped for this work — the umbrella doc + branch naming (`justin/rn-0_83-upgrade-follow-up-rd*`) provide sufficient traceability for chore/cleanup work per CLAUDE.md's "app-only work" carve-out.

| PR  | Branch                                 | Scope                                                      | Items                 | Est. LOC               |
| --- | -------------------------------------- | ---------------------------------------------------------- | --------------------- | ---------------------- |
| 1   | `rn-0_83-upgrade-follow-up-rd1`        | `react-hooks/set-state-in-effect` cleanup (18 sites)       | Item 6 PR A           | 500–1500               |
| 2   | `rn-0_83-upgrade-follow-up-rd2`        | React Compiler bailouts + mock-drift + test-pattern + docs | Items 6 PR B, 3, 4, 5 | 500–1000               |
| 3   | _separate analytics workstream branch_ | KYC Path A/B event-ordering audit                          | Item 2                | TBD per analytics spec |
| 4   | _Phase 2 gate (RN 0.85.x)_             | iOS PassportOCRView Fabric decision                        | Item 1                | TBD                    |

**Why this split:**

- **PR 1 first** — biggest signal-to-noise win (18 of 26 lint warnings), real correctness work since cascading renders are user-visible, and touches screens the 0.83 upgrade just changed (fresh context).
- **PR 2 bundles small items** — Compiler bailouts (8 warnings), mock drift, test-pattern verification, and the docs note are all small and SDK-hygiene-adjacent. Bundling keeps churn low while staying under the size cap.
- **PR 3 is separate** — Item 2 belongs in the analytics workstream with its own spec under `specs/projects/sdk/workstreams/analytics/`, not in the RN-upgrade follow-up stream.
- **PR 4 is gated on Phase 2** — Item 1 is explicitly deferred until the RN 0.85.x gate; don't touch it on this branch.

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

### 6. React 19 / React Compiler lint cleanup

**Status:** PR A in review (`rn-0_83-upgrade-follow-up-rd1`); PR B open. **Owner:** Justin. **Target:** App hygiene, post-upgrade.

`yarn lint` reports 26 warnings (0 errors) after the 0.83 / React 19 upgrade, all from rules that did not exist on the prior toolchain:

- 18× `react-hooks/set-state-in-effect` — `setState` called synchronously inside `useEffect` bodies (cascading renders). Hot spots include `app/src/screens/verification/ProofRequestStatusScreen.tsx`, `app/src/screens/verification/ProveScreen.tsx`, and `app/tests/src/providers/passportDataProvider.test.tsx`.
- 3× `react-hooks/preserve-manual-memoization` — React Compiler bailouts where `useMemo` dependency arrays don't match inferred deps (e.g. `ProveScreen.tsx:112`).
- 3× `react-hooks/refs` — ref usage that violates the new ref-purity rules.
- 1× `react-hooks/purity`, 1× `react-hooks/immutability` — Compiler purity violations.

These are warnings today but suppress real correctness signal and may become errors in a future Expo/RN bump.

**Scope of follow-up — split into two PRs to stay within the 1k–3k LOC target and keep semantic groups together:**

- **PR A — `set-state-in-effect` cleanup.** Per-site decision: move to an event handler, derive during render, lift to `useSyncExternalStore`, or guard with a state-equality check. Each site needs reasoning, not a blanket codemod. Pay extra attention to `ProofRequestStatusScreen` countdown cancellation and `ProveScreen` scroll-state — those are user-visible.
- **PR B — Compiler bailouts (`preserve-manual-memoization` + `refs` + `purity` + `immutability`).** Smaller, but semantically subtler — these are Compiler opt-out signals. Fixing them re-enables auto-memoization, which can change re-render behavior. Each fix needs a before/after Compiler-status check.

**PR A — what shipped (`rn-0_83-upgrade-follow-up-rd1`):** 17 of 18 `set-state-in-effect` sites resolved. Fixes by strategy:

- **Derive during render** (no effect): `DevLoadingScreen` loading text/animation, `LoadingScreen` loading text/animation, `CreateMockScreenDeepLink` selected country, `passportDataProvider.test` context fns.
- **Adjust-state-on-prop-change (prev-value during render):** `WalletAddressModal` copied reset, `HomeScreen` referral-test rising-edge latch.
- **Shared hook (DRY):** extracted `usePullToRefresh` for the duplicated pull-to-refresh logic in `ProofHistoryList` + `ProofHistoryScreen`; async `onRefresh` clears the spinner on completion (also fixed a latent unhandled-rejection). Unit-tested.
- **Async-load wrapper + relocated synchronous setState:** `ManageDocumentsScreen`, `DevFeatureFlagsScreen`, `useNotificationHandlers` (the last also gained an unmount-cancellation guard).
- **Extract + unit-test timer state-machines:** `ProofRequestStatusScreen` countdown → `useDeeplinkRedirectCountdown`; 90s stall → `useProvingStallTimeout`. Animation derived via `useMemo`; analytics effect reduced to side-effects only. Both hooks unit-tested (13 tests).

**Deferred from PR A:** `ProveScreen.tsx:232` (scroll-init `setHasScrolledToBottom`) is intentionally left for the in-flight ProveScreen simplification that builds on the proving-machine refactor (PR #1936). One `set-state-in-effect` warning remains in `ProveScreen` until that lands.

**Acceptance criteria:**

- `yarn lint` reports 0 warnings on both rule families after each PR lands. _(PR A: 0 `set-state-in-effect` warnings except the deferred `ProveScreen:232`.)_
- No behavioral regressions in the affected screens (manual smoke + existing tests pass). _(PR A: full app suite green — 1110 tests; 21 new tests across `usePullToRefresh`, `useDeeplinkRedirectCountdown`, `useProvingStallTimeout`. Note: repo `yarn types` has 113 pre-existing `KnownEventName`/analytics-export errors unrelated to this work — count unchanged by PR A.)_
- PR B records the Compiler optimization status (skipped → optimized) per touched component in the PR description.

### 5. (Optional) Root vs app React/RN version skew documentation

**Status:** Open. **Owner:** _unassigned_. **Target:** Monorepo policy.

Root `package.json` no longer declares `react`/`react-native` directly; the app workspace pins them, and resolutions force `@types/react@19` repo-wide. Confirm this is the intended steady-state contract for `mobile-sdk-alpha` peer ranges, and document the decision in either `OVERVIEW.md` or `app/AGENTS.md` so the next React major doesn't reopen the question.

**Acceptance criteria:**

- A short note in the SDK overview (or `app/AGENTS.md`) recording: "App workspace owns RN/React version; SDK peers must accept the app's pinned majors. Root has no direct RN/React dependency."
