# React Native Upgrade Plan (Mobile App)

_Last updated: April 28, 2026_

## Purpose

Define a low-risk, staged upgrade path for `app/` from React Native `0.77.0` to a supported version, with explicit risk controls for native modules, Expo modules usage, CI stability, and multi-developer coordination.

## Current State (Repo Evidence)

- `app` is pinned to React Native `0.77.0`.
- `app` uses Expo modules in a bare React Native app (`expo`, `expo-application`, `expo-camera`, `use_expo_modules!` in Podfile).
- Hermes is enabled on both platforms.
- The app has a high count of RN/Expo/native dependencies (42), increasing compatibility risk during major upgrades.
- The monorepo contains mixed RN versions across workspaces (`0.77.0` in `app` and `0.76.9` in several other workspaces, including the workspace root dependency).
- The app has platform-specific build and validation steps that must keep working during the upgrade:
  - `yarn workspace @selfxyz/mobile-app lint`
  - `yarn workspace @selfxyz/mobile-app types`
  - `yarn workspace @selfxyz/mobile-app test`
  - `yarn workspace @selfxyz/mobile-app ios`
  - `yarn workspace @selfxyz/mobile-app android`
  - `yarn workspace @selfxyz/mobile-app web:build`

## External Version Findings (as of April 28, 2026)

- RN `0.85.x` is the latest active release line.
- RN `0.84.x` is active and is the safer intermediate landing zone from `0.77.0`.
- RN `0.83` is end-of-cycle.
- RN `0.82+` centers around the New Architecture transition and related toolchain changes.
- Expo SDK 52 was tied to RN 0.76 with opt-in support for RN 0.77; newer RN lines require corresponding Expo SDK progression.

## Decision

### Recommendation

Use a staged upgrade, not a one-shot leap:

1. **Stage 1 target: RN `0.84.x`**
2. **Stage 2 target: RN `0.85.x`**

### Why not jump directly from `0.77.0` to `0.85.x`?

Direct upgrade risk is high due to:

- Long version gap across multiple RN release lines
- Large native dependency surface area
- Expo package version coupling
- Existing RN skew across workspaces in the monorepo

## Scope

### In Scope

- `app/` React Native runtime and platform configs
- Expo packages used by `app/`
- RN build-chain compatibility for Android, iOS, Metro, Babel, Jest, and web build
- App CI quality gates
- Version alignment in sibling workspaces only where required for build or test integrity

### Out of Scope

- Moving to Expo managed workflow or Expo Go
- Broad package refreshes unrelated to RN compatibility
- Non-app workspace upgrades unless they are proven blockers

## Coordination Model

This work needs two separate artifacts:

1. **Narrative plan**: this file
2. **State tracker**: [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md)

Do not use this plan as a task board. Update the checklist as work progresses.

### Ownership split

Use explicit track ownership so two developers can work asynchronously without stepping on each other:

- **Track 1: JS + package versions**
  Covers `package.json`, Yarn resolutions/overrides, Metro/Babel/Jest config, and JS compile issues.
- **Track 2: iOS native**
  Covers `Podfile`, pods, Xcode settings, iOS build breaks, and iOS runtime smoke tests.
- **Track 3: Android native**
  Covers Gradle, Android config, Kotlin/AGP issues, and Android build/runtime smoke tests.
- **Track 4: App runtime validation**
  Covers critical flow validation, regression triage, and rollout decisions after builds are green.

Each track needs:

- one directly responsible owner
- one backup owner for handoff across time zones
- a clearly defined stop condition

### Handoff rule

Every task in the checklist should carry:

- current owner
- current state
- latest blocking issue or next action
- last validated command or smoke test

If a developer ends their day with a track in progress, they should leave the checklist in a state where the other developer can continue without reopening the entire plan.

## Execution Plan

### Phase 0: Preparation

- Freeze non-upgrade app feature merges during the active migration window.
- Create and maintain the shared state tracker in [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md).
- Inventory and classify native dependencies:
  - **Critical path**: auth, biometrics, keychain, permissions, camera, webview, firebase, navigation, NFC.
  - **Lower risk**: UI-only libraries and purely JS helpers.
- Confirm an owner and backup owner per critical dependency area.
- Capture baseline evidence:
  - iOS build
  - Android build
  - unit tests
  - web build
  - startup smoke test on both platforms
- Record current overrides and resolutions that may hide incompatibilities during the bump:
  - root `resolutions`
  - `app/overrides`
  - root `react-native` dependency skew versus `app`

### Exit Criteria

- Baseline passes in CI and locally for `app`
- Compatibility tracker exists and has owners
- Rollback checkpoints are documented

### Phase 1: Compatibility Lift to RN `0.84.x`

- Upgrade RN and aligned RN packages in `app/package.json`.
- Upgrade Expo packages only to a line explicitly compatible with the chosen RN `0.84.x` target.
- Upgrade companion RN packages in lockstep:
  - `@react-native/babel-preset`
  - `@react-native/eslint-config`
  - `@react-native/gradle-plugin`
  - `@react-native/metro-config`
  - `@react-native/typescript-config`
- Re-evaluate app overrides and root resolutions after each version bump.
- Apply Upgrade Helper diffs incrementally while preserving repo-specific customizations.
- Regenerate pods and Android dependencies.
- Resolve breaking API or build config changes before moving to runtime validation.

### Validation Gates

- `yarn workspace @selfxyz/mobile-app lint`
- `yarn workspace @selfxyz/mobile-app types`
- `yarn workspace @selfxyz/mobile-app test`
- `yarn workspace @selfxyz/mobile-app web:build`
- `yarn workspace @selfxyz/mobile-app ios`
- `yarn workspace @selfxyz/mobile-app android`

### Exit Criteria

- App boots on iOS and Android
- No unresolved build blockers remain
- Core flows validated manually:
  - login/auth
  - camera flow
  - permissions prompts
  - push notification initialization
  - webview-based flows
  - NFC/passport scan entry
- Any required sibling-workspace version alignment is either complete or explicitly deferred with justification

### Phase 2: Stabilize on RN `0.84.x`

- Hold on `0.84.x` until build stability and runtime regressions are understood.
- Collect:
  - crash metrics
  - performance regressions
  - flaky test/build signals
  - any platform-specific issues that only show up after multiple clean builds
- Fix stability regressions before attempting `0.85.x`.

### Exit Criteria

- 3 consecutive green CI runs on the app pipeline
- No unresolved high-priority regression issues
- Rollout guardrails and stop conditions are agreed before the next bump

### Phase 3: Increment to RN `0.85.x`

- Apply the `0.84.x -> 0.85.x` version diff.
- Address `0.85.x` breaking changes, including Jest preset migration and any build-chain deltas.
- Re-run the full validation matrix and update the checklist with each pass/fail result.

### Exit Criteria

- Same validation and quality bars as Phase 1
- No blocker regressions introduced by `0.85.x`

## Risks and Mitigations

1. **Native module incompatibility**
   - Mitigation: per-package tracking, explicit owner assignment, and stop/go decisions recorded in the checklist.
2. **Expo package mismatch with RN target**
   - Mitigation: choose an Expo/RN pair before code changes and do not mix speculative bumps into the same PR.
3. **CI instability during toolchain changes**
   - Mitigation: keep tooling changes isolated from app behavior fixes where practical.
4. **Monorepo RN skew causing hidden failures**
   - Mitigation: track root and sibling RN versions explicitly; resolve only the skew that blocks app build or test integrity.
5. **Cross-time-zone handoff loss**
   - Mitigation: require status, blocker, and last validation evidence in the checklist for every in-progress item.

## Review Checklist

- [ ] Staged approach approved (`0.84.x` then `0.85.x`)
- [ ] Shared checklist created and linked in PR descriptions
- [ ] Dependency compatibility tracker completed
- [ ] Owners and backup owners assigned for each critical track
- [ ] CI validation gates agreed
- [ ] Rollback strategy documented per phase
- [ ] Rollout and stop conditions documented before production rollout

## Rollback Strategy

- Keep each phase in isolated PRs.
- Tag a known-good commit before each phase.
- Do not combine version bumps with unrelated refactors.
- If build or runtime blockers appear, revert the phase PR and continue investigation in follow-up branches.

## Deliverables

- Preparation PR
- RN `0.84.x` PR set
- Stabilization fixes PR set
- RN `0.85.x` PR set
- Shared state tracker: [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md)
- Final post-upgrade report with regressions, metrics, and follow-up backlog

## Suggested PR Split

Keep PRs aligned to ownership boundaries so two developers can parallelize safely:

- **PR A: prep only**
  Adds checklist, compatibility tracker, ownership, metrics, rollback notes.
- **PR B: JS/tooling**
  RN core package bump, RN companion packages, Metro/Babel/Jest changes.
- **PR C: iOS**
  Pods, Podfile, Xcode, iOS-specific native fixes.
- **PR D: Android**
  Gradle, Kotlin/AGP, Android-specific native fixes.
- **PR E: runtime regressions**
  App behavior fixes and regression coverage for critical flows.
- **PR F: `0.85.x` delta**
  Final version increment and any `0.85.x`-specific cleanup.

Do not merge a later PR if it depends on unmerged fixes from an earlier track unless the dependency is explicitly documented in the checklist.

## Known Gaps This Plan Now Closes

1. **Task state was previously implicit**
   - Fixed by adding a dedicated shared checklist with owner, status, blocker, and validation fields.
2. **Version work was previously too coarse**
   - Fixed by splitting version work into per-track checklist items and per-PR boundaries.
3. **Time estimates were low-signal**
   - Fixed by removing day and week estimates entirely and focusing on state transitions and exit criteria.
4. **Cross-time-zone coordination was under-specified**
   - Fixed by adding ownership, backup ownership, and handoff expectations.

## Definition of Done

- RN `0.85.x` is running in the production release channel.
- Critical flows are validated on both iOS and Android.
- Crash and performance metrics remain within agreed guardrails for at least 7 consecutive days after rollout.
- The checklist has no unresolved unknowns for upgrade-blocking packages.
- Non-blocking follow-ups are captured separately and not left mixed into the upgrade state tracker.
