# RN Upgrade Checklist

_Last updated: May 4, 2026_

Use this file as the working state tracker for the React Native upgrade. The narrative plan lives in [React Native Upgrade Plan](./RN-UPGRADE-PLAN.md).

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

- [ ] Baseline iOS build passes on current `0.77.0`
- [ ] Baseline Android build passes on current `0.77.0`
- [ ] Baseline `yarn workspace @selfxyz/mobile-app test` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app types` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app lint` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app web:build` passes
- [ ] Rollback tag/commit recorded before Phase 1 upgrade work starts
- [ ] Phase 1 decision gate result recorded before dependency changes begin

## Version Upgrade Checklist

### Core RN and companion packages

| Item                              | Current   | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status        | Last Validation | Last Note                               |
| --------------------------------- | --------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------------- | --------------- | --------------------------------------- |
| `react-native`                    | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Core runtime                            |
| `@react-native/babel-preset`      | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Must stay aligned with RN               |
| `@react-native/eslint-config`     | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Must stay aligned with RN               |
| `@react-native/gradle-plugin`     | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Android track dependency                |
| `@react-native/metro-config`      | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Metro config drift risk                 |
| `@react-native/typescript-config` | `0.77.0`  | `0.83`                          | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | TS config alignment                     |
| `@react-native-community/cli`     | `^16.0.3` | `Pin at kickoff for RN 0.83`    | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Verify version expectations per RN line |

### Expo alignment

| Item               | Current    | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status        | Last Validation | Last Note                          |
| ------------------ | ---------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------------- | --------------- | ---------------------------------- |
| `expo`             | `~52.0.40` | `55.0.0`                        | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Must follow Expo/RN support matrix |
| `expo-application` | `~6.0.2`   | `Pin SDK 55 compatible release` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Keep aligned with Expo SDK         |
| `expo-camera`      | `~16.0.18` | `Pin SDK 55 compatible release` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Camera is critical flow            |

### Critical native dependencies

| Item                                           | Current                            | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status        | Last Validation | Last Note                            |
| ---------------------------------------------- | ---------------------------------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------------- | --------------- | ------------------------------------ |
| `react-native-webview`                         | `13.16.1` app / `13.16.0` override | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Resolve override mismatch explicitly |
| `react-native-gesture-handler`                 | `~2.22.0`                          | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Navigation/input critical            |
| `react-native-screens`                         | `4.15.3`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Navigation stack dependency          |
| `react-native-safe-area-context`               | `^5.7.0`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Common runtime dependency            |
| `react-native-svg`                             | `15.14.0`                          | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Rendering dependency                 |
| `react-native-permissions`                     | `^4.1.5`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Critical OS prompt flow              |
| `react-native-keychain`                        | `^10.0.0`                          | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Security boundary                    |
| `react-native-biometrics`                      | `^3.0.1`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth critical path                   |
| `react-native-nfc-manager`                     | `3.17.2`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Passport scan path                   |
| `react-native-passport-reader`                 | `1.0.3`                            | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Passport scan path                   |
| `@react-native-firebase/app`                   | `^21.14.0`                         | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Firebase base                        |
| `@react-native-firebase/analytics`             | `^21.14.0`                         | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Analytics boot path                  |
| `@react-native-firebase/messaging`             | `^21.14.0`                         | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Push init critical                   |
| `@react-native-firebase/remote-config`         | `^21.14.0`                         | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Startup/config critical              |
| `@invertase/react-native-apple-authentication` | `^2.5.1`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | iOS auth dependency                  |
| `@react-native-google-signin/google-signin`    | `^16.1.2`                          | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth dependency                      |
| `react-native-app-auth`                        | `^8.1.0`                           | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Auth dependency                      |

### Monorepo alignment checks

| Item                                   | Current   | Target SDK `55.0.0` / RN `0.83` | Target SDK `56` / RN `0.85.x`    | Owner         | Backup        | Status        | Last Validation | Last Note                                         |
| -------------------------------------- | --------- | ------------------------------- | -------------------------------- | ------------- | ------------- | ------------- | --------------- | ------------------------------------------------- |
| Root `react-native` dependency         | `0.76.9`  | `Keep or align if required`     | `Keep or align if required`      | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Only change if it blocks app build/test integrity |
| Root `react` resolution                | `^18.3.1` | `Verify`                        | `Verify`                         | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Confirm RN target compatibility                   |
| Root `react-native-webview` resolution | `13.16.0` | `Pin after compatibility check` | `Gate-dependent: pin at kickoff` | `@unassigned` | `@unassigned` | `Not Started` | `None`          | Must match app decision                           |

## Work Breakdown Checklist

### Preparation

- [ ] Assign primary and backup owners for all four tracks
- [ ] Record baseline pass/fail results for lint, types, test, web build, iOS, and Android
- [ ] Record current overrides/resolutions that may need cleanup during the upgrade
- [ ] Confirm rollback commit/tag for the `0.77.0` baseline
- [ ] Link this checklist from the upgrade PR description

### Phase 1 decision gate

- [ ] Check whether Expo SDK `56` is published and installable from npm
- [ ] Check whether Expo's live version docs list SDK `56` and its RN pairing
- [ ] Check whether `expo`, `expo-application`, and `expo-camera` each have SDK `56`-compatible releases
- [ ] Record one result only: `SDK 56 now` or `SDK 55.0.0 fallback`

### Upgrade track

- [ ] Bump RN core and companion packages for the chosen path
- [ ] Bump Expo packages for the chosen path
- [ ] Regenerate iOS pods
- [ ] Regenerate Android dependencies
- [ ] Resolve Metro/Babel/Jest config drift
- [ ] Resolve iOS build breaks
- [ ] Resolve Android build breaks
- [ ] Resolve RN `0.85` Jest preset migration if the `SDK 56 now` path was chosen
- [ ] Validate auth flow
- [ ] Validate camera flow
- [ ] Validate permissions prompts
- [ ] Validate push initialization
- [ ] Validate webview flows
- [ ] Validate NFC/passport scan entry

### Stabilization track

- [ ] Get 3 consecutive green CI runs
- [ ] Record rollout stop conditions before production rollout
- [ ] Capture path-specific regressions and follow-ups

## Validation Log

| Date         | Owner   | Command / Check                           | Result      | Notes        |
| ------------ | ------- | ----------------------------------------- | ----------- | ------------ |
| `YYYY-MM-DD` | `@name` | `yarn workspace @selfxyz/mobile-app test` | `Pass/Fail` | `Short note` |

## Open Questions

- [ ] Which exact SDK `56` package versions should be pinned if the gate passes?
- [ ] Does the root `react-native` dependency need to move, or can it remain isolated from the app upgrade?
- [ ] Which current overrides/resolutions can be removed after the upgrade instead of carried forward?
