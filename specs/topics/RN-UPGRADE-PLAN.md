# React Native Upgrade Plan (Mobile App)

_Last updated: May 4, 2026_

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

## External Version Findings (as of May 4, 2026)

- RN `0.85.x` is the latest stable release line.
- The RN `0.85` release notes state that Expo SDK `56` will include RN `0.85`.
- Expo's published version matrix currently lists SDK `55 -> RN 0.83`, SDK `54 -> RN 0.81`, and SDK `53 -> RN 0.79`.
- Expo's published version matrix does not yet list SDK `56`.
- Expo SDK 52 was tied to RN 0.76 with opt-in support for RN 0.77; newer RN lines require corresponding Expo SDK progression.
- RN `0.82+` centers around the New Architecture transition and related toolchain changes.

## Decision

### Recommendation

Use a staged execution model with one decision gate:

1. **Preferred target if gate passes at Phase 1 kickoff:** Expo SDK `56` + RN `0.85.x`
2. **Pinned fallback if gate fails at Phase 1 kickoff:** Expo SDK `55.0.0` + RN `0.83`
3. **After the fallback path stabilizes:** plan a separate follow-up spec for SDK `56` instead of stretching this spec into another live version bump

### Why this is not a two-hop version plan

This spec does not stage through RN `0.84.x`.

- Expo does not currently publish an SDK line for RN `0.84.x`.
- Upgrading through an unsupported intermediate would add churn without adding a supported landing zone.
- The real execution choice is whether SDK `56` is consumable when Phase 1 starts.

### Phase 1 Decision Gate

At Phase 1 kickoff, you will choose exactly one path and record it in the checklist before changing dependencies:

- **Take SDK `56` now** only if all of the following are true:
  - Expo SDK `56` is published and installable from npm
  - Expo's live version docs list SDK `56` and its RN pairing
  - The packages this repo uses from the Expo line have SDK `56`-compatible releases: `expo`, `expo-application`, `expo-camera`
- **Take SDK `55.0.0` first** if any gate condition above fails, or if installation fails while resolving the SDK `56` package set

Do not re-litigate the target mid-upgrade. Fire this gate once, record the result, and execute that path.

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

- Coordinate with anyone touching `app/ios`, `app/android`, or `app/package.json` during Phase 1. Do not rely on a blanket merge freeze.
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

### Phase 1: Upgrade to the Chosen Supported Target

- Fire the Phase 1 decision gate and record the chosen path in the checklist:
  - **Primary path:** Expo SDK `56` + RN `0.85.x` if the gate passes
  - **Fallback path:** Expo SDK `55.0.0` + RN `0.83` if the gate fails
- Upgrade RN and aligned RN packages in `app/package.json`.
- Upgrade Expo packages only to the chosen supported Expo line.
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
- If the chosen path is SDK `56` + RN `0.85.x`, include the RN `0.85` Jest preset migration and any `0.85`-specific build-chain changes in this phase.

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

### Phase 2: Stabilize on the Chosen Path

- Hold on the chosen target until build stability and runtime regressions are understood.
- Collect:
  - crash metrics
  - performance regressions
  - flaky test/build signals
  - any platform-specific issues that only show up after multiple clean builds
- Run the stabilization checklist against the path actually chosen:
  - **SDK `56` / RN `0.85.x` path:** treat this as the highest-risk path because it spans the largest RN gap and includes the RN `0.85` Jest preset migration
  - **SDK `55.0.0` / RN `0.83` path:** still validate the same critical flows, but capture any residual blockers that would affect a later SDK `56` follow-up spec
- Fix stability regressions before rollout. If you took the SDK `55.0.0` fallback path, do not start the SDK `56` bump inside this spec.

### Exit Criteria

- 3 consecutive green CI runs on the app pipeline
- No unresolved high-priority regression issues
- Rollout guardrails and stop conditions are agreed before production rollout

## Risks and Mitigations

1. **Native module incompatibility**
   - Mitigation: per-package tracking, explicit owner assignment, and stop/go decisions recorded in the checklist.
2. **Expo package mismatch with RN target**
   - Mitigation: fire the SDK `56 now vs SDK 55 first` gate before code changes and do not mix speculative bumps into the same PR.
3. **CI instability during toolchain changes**
   - Mitigation: keep tooling changes isolated from app behavior fixes where practical.
4. **Monorepo RN skew causing hidden failures**
   - Mitigation: track root and sibling RN versions explicitly; resolve only the skew that blocks app build or test integrity.
5. **Cross-time-zone handoff loss**
   - Mitigation: require status, blocker, and last validation evidence in the checklist for every in-progress item.

## Review Checklist

- [ ] Decision-gated approach approved (`SDK 56 now` or pinned `SDK 55.0.0` fallback)
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
- Upgrade PR set for the chosen target path
- Stabilization fixes PR set
- Shared state tracker: [RN Upgrade Checklist](./RN-UPGRADE-CHECKLIST.md)
- Final post-upgrade report with regressions, metrics, and follow-up backlog

## Suggested PR Split

Keep PRs aligned to ownership boundaries so two developers can parallelize safely:

- **PR A: prep only**
  Adds checklist, compatibility tracker, ownership, metrics, rollback notes.
- **PR B: JS/tooling**
  RN core package bump, RN companion packages, Metro/Babel/Jest changes for the chosen target path.
- **PR C: iOS**
  Pods, Podfile, Xcode, iOS-specific native fixes.
- **PR D: Android**
  Gradle, Kotlin/AGP, Android-specific native fixes.
- **PR E: runtime regressions**
  App behavior fixes and regression coverage for critical flows.
- **PR F: fallback-only follow-up gate result**
  Only used if the chosen path is SDK `55.0.0` and you need a separate future spec/PR chain for SDK `56`.

Do not merge a later PR if it depends on unmerged fixes from an earlier track unless the dependency is explicitly documented in the checklist.

## Known Gaps This Plan Now Closes

1. **Task state was previously implicit**
   - Fixed by adding a dedicated shared checklist with owner, status, blocker, and validation fields.
2. **Version work was previously too coarse**
   - Fixed by splitting version work into a pre-committed decision gate, per-track checklist items, and per-PR boundaries.
3. **Time estimates were low-signal**
   - Fixed by removing day and week estimates entirely and focusing on state transitions and exit criteria.
4. **Cross-time-zone coordination was under-specified**
   - Fixed by adding ownership, backup ownership, and handoff expectations.

## Definition of Done

- The chosen supported target path is running in the production release channel.
- Critical flows are validated on both iOS and Android.
- Crash and performance metrics remain within agreed guardrails for at least 7 consecutive days after rollout.
- The checklist has no unresolved unknowns for upgrade-blocking packages.
- Non-blocking follow-ups are captured separately and not left mixed into the upgrade state tracker.
