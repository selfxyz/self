# RN Upgrade Checklist

_Last updated: August 6, 2026_

Use this file as the working state tracker for the React Native upgrade. The narrative plan lives in [React Native Upgrade Plan](./RN-UPGRADE-PLAN.md).

## What Landed

The version upgrade is **done and shipping**. PR #2049 moved the app
workspace to the SDK 55 fallback path:

|                               | Before     | After     |
| ----------------------------- | ---------- | --------- |
| `react-native`                | `0.77.0`   | `0.83.9`  |
| `react`                       | `18.x`     | `^19.2.0` |
| `expo`                        | `~52.0.40` | `55.0.20` |
| `@react-native-community/cli` | `^16.0.3`  | `^20.0.0` |

Verify against `app/package.json` rather than trusting this table.

**The SDK 56 / RN 0.85 columns below are inert.** That gate is closed —
see the **Phase 1 decision gate** section below and
[SDK DECISIONS.md](../projects/sdk/DECISIONS.md). Do not restart the
version bump work.

**The device flow validations and the rollout gate are also closed** —
superseded by ten weeks of production evidence, not by a manual pass. See
the note under _Upgrade track_.

**What is genuinely still open** is narrow: override cleanup (which
entries can drop now that the upgrade has settled) and the six unowned
items in [RN-UPGRADE-FOLLOWUPS.md](./RN-UPGRADE-FOLLOWUPS.md). Tracked in
SELF-3786.

## How To Use This Checklist

- Update `Owner`, `Backup`, `Status`, and `Last Note` every time work changes hands.
- Use `Blocked` only when another task or decision is required before progress can continue.
- Record the last command or smoke test that was actually run.
- Keep notes factual and short so another developer can resume work quickly across time zones.

## Status Legend

- `Not Started`
- `In Progress`
- `Blocked`
- `Ready For Review`
- `Done`

## Track Owners

| Track                 | Primary       | Backup        | Scope                                                      |
| --------------------- | ------------- | ------------- | ---------------------------------------------------------- |
| JS + package versions | `@unassigned` | `@unassigned` | RN core versions, JS toolchain, Metro/Babel/Jest, lockfile |
| iOS native            | `@unassigned` | `@unassigned` | Pods, Podfile, Xcode settings, iOS build/runtime           |
| Android native        | `@unassigned` | `@unassigned` | Gradle, Kotlin/AGP, Android build/runtime                  |
| Runtime validation    | `@unassigned` | `@unassigned` | Critical flows, smoke tests, rollout decisions             |

## Global Gates

- [x] Rollback boundary established: feature branch `justin/upgrade-react-native-phase1` off `dev`. Branch parent commit is the `0.77.0` baseline; CI history on `dev` is the green reference.
- [x] Phase 1 decision gate result recorded: **SDK 55 fallback path**. Gate failed because Expo SDK 56 is not GA on npm as of 2026-05-04 (canary builds only). Superseded 2026-08-06: the gate is closed and SDK 56 is deferred indefinitely — do not re-verify per bump.

## Version Upgrade Checklist

### Core RN and companion packages

| Item                              | Current   | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status | Last Validation | Last Note                                          |
| --------------------------------- | --------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------ | --------------- | -------------------------------------------------- |
| `react-native`                    | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in app workspace for SDK 55 fallback path |
| `@react-native/babel-preset`      | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in lockstep with RN core                  |
| `@react-native/eslint-config`     | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in lockstep with RN core                  |
| `@react-native/gradle-plugin`     | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in lockstep with RN core                  |
| `@react-native/metro-config`      | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in lockstep with RN core                  |
| `@react-native/typescript-config` | `0.77.0`  | `0.83.9`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded in lockstep with RN core                  |
| `@react-native-community/cli`     | `^16.0.3` | `^20.0.0`                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded to 20.x line for RN 0.83                  |

### Expo alignment

| Item               | Current    | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status | Last Validation | Last Note                        |
| ------------------ | ---------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------ | --------------- | -------------------------------- |
| `expo`             | `~52.0.40` | `55.0.20`                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded to SDK 55 fallback path |
| `expo-application` | `~6.0.2`   | `55.0.14`                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded to SDK 55 line          |
| `expo-camera`      | `~16.0.18` | `55.0.17`                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Done` | `2026-05-15`    | Upgraded to SDK 55 line          |

### Critical native dependencies

| Item                                           | Current                            | Target SDK `55.0.0` / RN `0.83`        | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status        | Last Validation | Last Note                                                   |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------- | -------------------------------- | ------------- | ------------- | ------------- | --------------- | ----------------------------------------------------------- |
| `react-native-webview`                         | `13.16.1` app / `13.16.0` override | `13.16.0` (drop dep/override mismatch) | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Align dep to match resolution; remove override post-upgrade |
| `react-native-gesture-handler`                 | `~2.22.0`                          | `~2.22.0` (keep)                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Navigation/input critical                                   |
| `react-native-screens`                         | `4.15.3`                           | `4.15.3` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Navigation stack dependency                                 |
| `react-native-safe-area-context`               | `^5.7.0`                           | `^5.7.0` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Common runtime dependency                                   |
| `react-native-svg`                             | `15.14.0`                          | `15.14.0` (keep)                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Rendering dependency                                        |
| `react-native-permissions`                     | `^4.1.5`                           | `^4.1.5` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Critical OS prompt flow                                     |
| `react-native-keychain`                        | `^10.0.0`                          | `^10.0.0` (keep)                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Security boundary                                           |
| `react-native-biometrics`                      | `^3.0.1`                           | `^3.0.1` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth critical path                                          |
| `react-native-nfc-manager`                     | `3.17.2`                           | `3.17.2` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Passport scan path                                          |
| `react-native-passport-reader`                 | `1.0.3`                            | `1.0.3` (keep)                         | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Passport scan path                                          |
| `@react-native-firebase/app`                   | `^21.14.0`                         | `^21.14.0` (keep)                      | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Firebase base                                               |
| `@react-native-firebase/analytics`             | `^21.14.0`                         | `^21.14.0` (keep)                      | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Analytics boot path                                         |
| `@react-native-firebase/messaging`             | `^21.14.0`                         | `^21.14.0` (keep)                      | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Push init critical                                          |
| `@react-native-firebase/remote-config`         | `^21.14.0`                         | `^21.14.0` (keep)                      | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Startup/config critical                                     |
| `@invertase/react-native-apple-authentication` | `^2.5.1`                           | `^2.5.1` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | iOS auth dependency                                         |
| `@react-native-google-signin/google-signin`    | `^16.1.2`                          | `^16.1.2` (keep)                       | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth dependency                                             |
| `react-native-app-auth`                        | `^8.1.0`                           | `^8.1.0` (keep)                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth dependency                                             |

### Monorepo alignment checks

| Item                                             | Current                          | Target SDK `55.0.0` / RN `0.83`                                                            | Target SDK `56` / RN `0.85.x`                         | Owner         | Backup        | Status        | Last Validation | Last Note                                                                                                                       |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------- | ------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Root `react-native` dependency                   | `0.76.9`                         | `Keep or align if required`                                                                | `Keep or align if required`                           | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Only change if it blocks app build/test integrity                                                                               |
| Root `react` resolution                          | `^18.3.1`                        | `Verify`                                                                                   | `Verify`                                              | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Confirm RN target compatibility                                                                                                 |
| Root `react-native-webview` resolution           | `13.16.0`                        | `13.16.0` (keep)                                                                           | `Gate-dependent: pin at kickoff`                      | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Matches app decision; revisit if app dep aligned                                                                                |
| SDK peer range truthfulness (`mobile-sdk-alpha`) | `react-native: >=0.76.0 <0.86.0` | Keep peers broad enough to include every in-repo consumer until all consumers are upgraded | Same rule; tighten only after full consumer migration | `@unassigned` | `@unassigned` | `In Progress` | `yarn install`  | Do not narrow SDK peer ranges based on `app/` alone; include `mobile-sdk-demo`, `rn-sdk`, `rn-sdk-test-app`, and root consumers |

## Work Breakdown Checklist

### Preparation

- [x] Rollback boundary: feature branch `justin/upgrade-react-native-phase1`. No tag needed — branch parent is the `0.77.0` baseline.
- [x] Overrides/resolutions inventory recorded in Phase 0 Findings.
- [ ] Link this checklist from the upgrade PR description.
- [ ] Owner assignments: deferred — single owner driving the upgrade. Revisit if work parallelizes.

### Phase 1 decision gate — CLOSED (`SDK 55.0.0 fallback`)

Recorded 2026-05-04, reaffirmed 2026-08-06. **This gate is closed. Do not
re-run it as part of the RN upgrade.**

- [x] Check whether Expo SDK `56` is published and installable from npm — no; canary builds only as of the gate date
- [x] Check whether Expo's live version docs list SDK `56` and its RN pairing — no
- [x] Check whether `expo`, `expo-application`, and `expo-camera` each have SDK `56`-compatible releases — no
- [x] Record one result only: **`SDK 55.0.0 fallback`**

**2026-08-06 decision — SDK 56 is deferred, not pending.** The SDK 55 /
RN 0.83 line is the landing state and is shipping. Moving to SDK 56 /
RN 0.85 would re-open the Jest preset migration, the Fabric view-manager
question, and a fresh round of device validation, for no product gain.
WebView-in-App is the priority; the app's UI surface is slated to move
into the WebView, which changes what an RN major is even worth.

Revisit only if a security fix or a hard dependency floor forces it. All
`Target SDK 56 / RN 0.85.x` columns in the tables above are inert until
then — treat them as historical planning, not open work.

### Upgrade track

- [x] Bump RN core and companion packages for the chosen path
- [x] Bump Expo packages for the chosen path
- [x] Regenerate iOS pods
- [x] Regenerate Android dependencies
- [x] Resolve Metro/Babel/Jest config drift
- [x] Resolve iOS build breaks
- [x] Resolve Android build breaks
- [x] ~~Resolve RN `0.85` Jest preset migration if the `SDK 56 now` path was chosen~~ — N/A, `SDK 55.0.0 fallback` was chosen. `rn-sdk-test-app` stays on `jest@^29.7.0` (MT-25).
- [x] Validate auth flow — superseded by production evidence, see below
- [x] Validate camera flow — superseded by production evidence, see below
- [x] Validate permissions prompts — superseded by production evidence, see below
- [x] Validate push initialization — superseded by production evidence, see below
- [x] Validate webview flows — superseded by production evidence, see below
- [x] Validate NFC/passport scan entry — superseded by production evidence, see below

> **Closed 2026-08-06 — superseded by production evidence, not by a manual pass.**
>
> These six checks were a **pre-rollout gate**. The rollout happened:
> **20 staging releases between 2026-05-30 and 2026-08-02** on RN `0.83.9` /
> Expo `55.0.20`, 110 commits to `main`, app at `2.9.28`. Gating a build
> that has been shipping for ten weeks is not a meaningful test.
>
> Field usage exercises every one of these flows at a scale and device
> spread a manual checklist cannot reach. The one flow where "nobody
> complained" would be weak evidence is NFC/passport scan, because a
> failed scan reads as user error and users silently retry — but that
> flow is instrumented with paired `NFC_STARTED` / `NFC_SUCCEEDED` /
> `NFC_SCAN_FAILED` events (and `SCAN_STARTED` / `SCAN_SUCCEEDED`), so a
> regression surfaces as a success-rate drop in Mixpanel.
>
> **If you want confidence in these flows, read the funnel — do not
> re-run the checklist.** See [analytics/SPEC.md](../projects/sdk/workstreams/analytics/SPEC.md).

### Stabilization track

- [x] ~~Get 3 consecutive green CI runs~~ — superseded; 110 commits merged to `main` since the upgrade
- [x] ~~Record rollout stop conditions before production rollout~~ — moot; rollout completed across 20 releases
- [ ] Capture path-specific regressions and follow-ups — see [RN-UPGRADE-FOLLOWUPS.md](./RN-UPGRADE-FOLLOWUPS.md), still unowned

## Validation Log

| Date         | Owner         | Command / Check              | Result    | Notes                                                                                                                                                               |
| ------------ | ------------- | ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-05-15` | `@unassigned` | `CI history on this branch`  | `Pending` | `No green CI runs recorded in this checklist yet; add run URLs/results as they complete.`                                                                           |
| `2026-08-06` | `@unassigned` | `Production release history` | `Passed`  | `20 staging releases 2026-05-30 → 2026-08-02 on RN 0.83.9 / Expo 55.0.20; 110 commits to main; app 2.9.28. Supersedes the pre-rollout flow checks and the CI gate.` |

## Open Questions

- [x] Which exact SDK `56` package versions should be pinned if the gate passes? Answer: none — the gate closed on `SDK 55.0.0 fallback` and SDK 56 is deferred indefinitely (2026-08-06). Re-open only on a security fix or hard dependency floor.
- [x] Does the root `react-native` dependency need to move, or can it remain isolated from the app upgrade? Answer: keep root on `0.76.9` for this PR; tracked in `Follow-Up: Align Remaining Workspaces` in `RN-UPGRADE-PLAN.md`.
- [x] Which current overrides/resolutions can be removed after the upgrade instead of carried forward? Answer: removed the breaking patch tracked by commit `32b373d11`; continue cleanup in follow-up PRs as remaining entries are validated.

## Phase 0 Findings (recorded 2026-05-04)

### Gate pre-check

- Expo SDK `56` is **not yet GA**. npm only publishes `56.0.0-canary-*` builds for `expo`, `expo-application`, and `expo-camera` (latest canary 2026-05-01). If the Phase 1 gate fired today it would fail; the live target is the SDK `55` fallback path. Re-check at Phase 1 kickoff before recording the gate result.

### Overrides and resolutions inventory

Source: `package.json:55-73` (root resolutions), `app/package.json:78-82` (app overrides).

| Package                    | Root resolution          | App override            | App dependency | Notes                                                                                                                                                                  |
| -------------------------- | ------------------------ | ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-native-webview`     | `13.16.0`                | `13.16.0`               | `13.16.1`      | Three-way mismatch. Resolution wins; the `13.16.1` dep is effectively pinned down to `13.16.0`. Decide during upgrade whether to keep the resolution or align the dep. |
| `react-native-blur-effect` | `1.1.3`                  | `1.1.3`                 | `^1.1.3`       | Resolution and override are redundant; the dep already accepts `1.1.3`. Candidate for cleanup post-upgrade.                                                            |
| `punycode`                 | `npm:punycode.js@^2.3.1` | `npm:punycode.js@2.3.1` | n/a            | Override is redundant with the root resolution. Candidate for cleanup post-upgrade.                                                                                    |
| `react-native-passkey`     | `^3.3.3`                 | n/a                     | `^3.3.3`       | Resolution mirrors the dep; harmless.                                                                                                                                  |
| `react` / `react-dom`      | `^18.3.1`                | n/a                     | `^18.3.1`      | Aligned. Re-verify against RN target's required React version at Phase 1.                                                                                              |

### Monorepo RN skew

- Root `package.json:78` pins `react-native: 0.76.9`.
- `app/package.json:142` pins `react-native: 0.77.0`.
- The skew is real but isolated: the root `react-native` is consumed by non-app workspaces. Decide at Phase 1 whether the upgrade should also bump the root pin or leave it alone — recorded as an open question above.

### Peer-range guardrail (added 2026-05-15)

- `packages/mobile-sdk-alpha` peer dependency ranges must match the oldest actively supported in-repo consumer, not just `app/`.
- During partial RN upgrades (for example, `app/` on RN `0.83` while `mobile-sdk-demo`, `rn-sdk`, `rn-sdk-test-app`, and root remain on RN `0.76.x`), keep SDK peers broad (`>=0.76.0 <0.86.0`) to avoid false peer warnings.
- Tighten the RN peer floor only in the same change set that upgrades all listed consumers.

### Baseline validation

Not yet captured. Owner runs the validation gate set on the `0.77.0` baseline before Phase 1 begins and records pass/fail in the Validation Log.
