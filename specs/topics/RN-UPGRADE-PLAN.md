# React Native Upgrade Plan (Mobile App)

_Last updated: April 28, 2026_

## Purpose

Define a low-risk, staged upgrade path for `app/` from React Native `0.77.0` to a supported version, with explicit risk controls for native modules, Expo modules usage, and CI stability.

## Current State (Repo Evidence)

- `app` is pinned to React Native `0.77.0`.
- `app` uses Expo modules in a bare React Native app (`expo`, `expo-application`, `expo-camera`, `use_expo_modules!` in Podfile).
- Hermes is enabled on both platforms.
- The app has a high count of RN/Expo/native dependencies (42), increasing compatibility risk during major upgrades.
- The monorepo contains mixed RN versions across workspaces (`0.77.0` in app and `0.76.9` in several other workspaces).

## External Version Findings (as of April 28, 2026)

- RN `0.85.x` is the latest active release line.
- RN `0.84.x` is active and generally lower-risk than jumping straight to `0.85` from `0.77`.
- RN `0.83` is end-of-cycle.
- RN `0.82+` centers around the New Architecture transition.
- Expo SDK 52 was tied to RN 0.76 with opt-in support for RN 0.77; newer RN lines require corresponding Expo SDK progression.

## Decision

### Recommendation

Use a staged upgrade, not a one-shot leap:

1. **Stage 1 target: RN `0.84.x`** (supported, avoids stacking all `0.85` changes immediately)
2. **Stage 2 target: RN `0.85.x`** (after hardening and validation)

### Why not jump directly from 0.77 to 0.85?

Direct upgrade risk is high due to:

- Long version gap (multiple release lines)
- 42 native/module dependencies
- Expo modules dependency line needing coordinated upgrades
- Mixed RN versions in sibling workspaces

## Scope

### In Scope

- `app/` React Native runtime + platform configs
- Expo packages used by `app/`
- RN build chain compatibility (Android/iOS/Metro/Jest)
- CI quality gates for app build, types, lint, tests

### Out of Scope

- Moving to Expo managed workflow / Expo Go (explicitly not planned)
- Non-app workspaces unless version alignment is required for build/test integrity

## Execution Plan

## Phase 0 — Preparation (1–2 days)

- Freeze app feature merges during migration window.
- Inventory and classify native deps:
  - **Critical path**: auth, biometrics, keychain, permissions, camera, webview, firebase.
  - **Lower risk**: UI-only libraries.
- Confirm owning engineer per critical dependency.
- Capture baseline:
  - iOS build
  - Android build
  - unit tests
  - startup crash-free smoke test

### Exit Criteria

- Baseline passes in CI and locally for app
- Compatibility tracker created for all native deps

## Phase 1 — Compatibility Lift to RN 0.84.x (3–6 days)

- Upgrade RN and aligned RN packages in `app/package.json`.
- Upgrade Expo packages to a line compatible with chosen RN target.
- Regenerate iOS pods and Android dependencies.
- Apply Upgrade Helper diffs incrementally and preserve repo customizations.
- Resolve breaking API/build config changes.

### Validation Gates

- `yarn workspace @selfxyz/mobile-app lint`
- `yarn workspace @selfxyz/mobile-app types`
- `yarn workspace @selfxyz/mobile-app test`
- `yarn workspace @selfxyz/mobile-app ios` (or CI iOS build lane)
- `yarn workspace @selfxyz/mobile-app android` (or CI Android build lane)

### Exit Criteria

- App boots on iOS and Android
- Core flows validated manually:
  - login/auth
  - camera flow
  - permissions prompts
  - push notification initialization
  - webview-based flows
- No Sev1/Sev2 regressions in crash logs during test window

## Phase 2 — Hardening Window (2–4 days)

- Keep on RN 0.84.x while collecting:
  - crash metrics
  - performance regressions
  - flaky test/build signals
- Fix stability regressions before next bump.

### Exit Criteria

- 3 consecutive green CI runs on app pipeline
- No unresolved high-priority regression issues

## Phase 3 — Increment to RN 0.85.x (2–4 days)

- Apply `0.84 -> 0.85` diff.
- Address RN 0.85 breaking changes (notably Jest preset migration and any build-chain changes).
- Re-run full app validation matrix.

### Exit Criteria

- Same validation and quality bars as Phase 1
- No blocker regressions from 0.85-specific changes

## Risks and Mitigations

1. **Native module incompatibility**
   - Mitigation: compatibility tracker, owner assignments, phased rollouts.
2. **Expo package mismatch with RN target**
   - Mitigation: lock to supported Expo SDK/RN pair before code changes.
3. **CI instability during toolchain changes**
   - Mitigation: isolate infra/tooling commits from functional changes.
4. **Monorepo RN skew causing hidden failures**
   - Mitigation: evaluate whether sibling workspaces need coordinated version bumps.

## Review Checklist

- [ ] Upgrade plan approves staged approach (`0.84` then `0.85`)
- [ ] Dependency compatibility tracker completed
- [ ] CI validation gates agreed
- [ ] Rollback strategy documented per phase
- [ ] Owners assigned for critical modules

## Rollback Strategy

- Keep each phase in isolated PRs.
- Tag a known-good commit before each phase.
- If build/runtime blockers appear, revert the phase PR and continue investigation in follow-up branches.

## Deliverables

- Phase PR set (prep, 0.84, hardening fixes, 0.85)
- Compatibility matrix artifact (linked from PR descriptions)
- Final post-upgrade report with regressions and follow-up backlog

## Suggested First PR (Smallest Sensible Step)

Create a preparation PR that adds:

- dependency compatibility tracker markdown
- CI validation checklist for app upgrade
- explicit owner assignments for critical native modules

No runtime version bumps in the first PR.


## Known Gaps in This Plan (to close before execution)

1. **No explicit package compatibility matrix yet**
   - We need a table with one row per RN/Expo/native dependency and columns for: current version, target version, RN `0.84` support, RN `0.85` support, owner, and status.
2. **No named owners or deadlines yet**
   - Current plan says "assign owners" but does not record who owns auth/camera/firebase/webview tracks.
3. **No release/canary rollout design yet**
   - Add rollout steps (internal dogfood -> beta % -> full rollout) with stop conditions.
4. **No explicit acceptance metrics yet**
   - Define measurable thresholds (startup time delta, crash-free sessions, ANR rate, memory regression limits).
5. **No explicit 0.85 PR split yet**
   - We should pre-split 0.85 work into predictable PRs (tooling, iOS, Android, app-runtime, cleanup).

## Concrete Next Steps to Reach RN 0.85

### Week 0: Planning + Tracker PR (no runtime bumps)

- Add `specs/topics/RN-UPGRADE-COMPAT-MATRIX.md` with the dependency tracker table.
- Add owner assignments for each critical dependency area.
- Finalize go/no-go metrics and rollout policy.

**Done when:** owners + matrix + metrics are approved in review.

### Week 1: RN 0.84 upgrade PRs

- PR A: JS/tooling alignment (`react-native`, RN companion packages, Jest/babel/metro updates required for 0.84).
- PR B: iOS native fixes (pods, build flags, module breakages).
- PR C: Android native fixes (Gradle/AGP/Kotlin changes if required, module breakages).
- PR D: app behavior fixes + regression tests for critical flows.

**Done when:** all validation gates pass + 3 green CI runs + no Sev1/Sev2 issues.

### Week 2: Stabilization window on 0.84

- Run dogfood builds and track crash/perf metrics daily.
- Fix remaining high-priority issues.

**Go/No-Go for 0.85:** proceed only if stability metrics meet agreed thresholds.

### Week 3: RN 0.85 upgrade PRs

- PR E: 0.85 core upgrade + known breaking changes (including Jest preset migration where applicable).
- PR F: iOS/Android native delta fixes.
- PR G: follow-up cleanup and dependency lockfile normalization.

**Done when:** same quality gates as 0.84 + successful canary rollout.

## Minimal Compatibility Matrix Template

Use this table format in the first follow-up PR:

| Package | Current | Target (0.84 path) | Target (0.85 path) | 0.84 Support | 0.85 Support | Owner | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| react-native | 0.77.0 | 0.84.x | 0.85.x | TBD | TBD | @owner | Not Started | Core runtime |
| expo | ~52.0.40 | TBD | TBD | TBD | TBD | @owner | Not Started | Must follow Expo/RN support matrix |
| react-native-webview | 13.16.1 | TBD | TBD | TBD | TBD | @owner | Not Started | Critical flow dependency |

## Definition of Done (Final)

- RN `0.85.x` running in production channel.
- Critical flows validated on both iOS and Android.
- Crash/perf metrics within agreed guardrails for at least 7 consecutive days post-release.
- Compatibility matrix fully resolved (no unknown statuses).
- Follow-up backlog created for non-blocking cleanups.
