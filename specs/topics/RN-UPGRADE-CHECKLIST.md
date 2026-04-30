# RN Upgrade Checklist

_Last updated: April 28, 2026_

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

| Track | Primary | Backup | Scope |
|---|---|---|---|
| JS + package versions | `@unassigned` | `@unassigned` | RN core versions, JS toolchain, Metro/Babel/Jest, lockfile |
| iOS native | `@unassigned` | `@unassigned` | Pods, Podfile, Xcode settings, iOS build/runtime |
| Android native | `@unassigned` | `@unassigned` | Gradle, Kotlin/AGP, Android build/runtime |
| Runtime validation | `@unassigned` | `@unassigned` | Critical flows, smoke tests, rollout decisions |

## Global Gates

- [ ] Baseline iOS build passes on current `0.77.0`
- [ ] Baseline Android build passes on current `0.77.0`
- [ ] Baseline `yarn workspace @selfxyz/mobile-app test` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app types` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app lint` passes
- [ ] Baseline `yarn workspace @selfxyz/mobile-app web:build` passes
- [ ] Rollback tag/commit recorded before `0.84.x` work starts
- [ ] Rollback tag/commit recorded before `0.85.x` work starts

## Version Upgrade Checklist

### Core RN and companion packages

| Item | Current | Target `0.84.x` | Target `0.85.x` | Owner | Backup | Status | Last Validation | Last Note |
|---|---|---|---|---|---|---|---|---|
| `react-native` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Core runtime |
| `@react-native/babel-preset` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Must stay aligned with RN |
| `@react-native/eslint-config` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Must stay aligned with RN |
| `@react-native/gradle-plugin` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Android track dependency |
| `@react-native/metro-config` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Metro config drift risk |
| `@react-native/typescript-config` | `0.77.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | TS config alignment |
| `@react-native-community/cli` | `^16.0.3` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Verify version expectations per RN line |

### Expo alignment

| Item | Current | Target `0.84.x` | Target `0.85.x` | Owner | Backup | Status | Last Validation | Last Note |
|---|---|---|---|---|---|---|---|---|
| `expo` | `~52.0.40` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Must follow Expo/RN support matrix |
| `expo-application` | `~6.0.2` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Keep aligned with Expo SDK |
| `expo-camera` | `~16.0.18` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Camera is critical flow |

### Critical native dependencies

| Item | Current | Target `0.84.x` | Target `0.85.x` | Owner | Backup | Status | Last Validation | Last Note |
|---|---|---|---|---|---|---|---|---|
| `react-native-webview` | `13.16.1` app / `13.16.0` override | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Resolve override mismatch explicitly |
| `react-native-gesture-handler` | `~2.22.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Navigation/input critical |
| `react-native-screens` | `4.15.3` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Navigation stack dependency |
| `react-native-safe-area-context` | `^5.7.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Common runtime dependency |
| `react-native-svg` | `15.14.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Rendering dependency |
| `react-native-permissions` | `^4.1.5` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Critical OS prompt flow |
| `react-native-keychain` | `^10.0.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Security boundary |
| `react-native-biometrics` | `^3.0.1` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Auth critical path |
| `react-native-nfc-manager` | `3.17.2` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Passport scan path |
| `react-native-passport-reader` | `1.0.3` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Passport scan path |
| `@react-native-firebase/app` | `^21.14.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Firebase base |
| `@react-native-firebase/analytics` | `^21.14.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Analytics boot path |
| `@react-native-firebase/messaging` | `^21.14.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Push init critical |
| `@react-native-firebase/remote-config` | `^21.14.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Startup/config critical |
| `@invertase/react-native-apple-authentication` | `^2.5.1` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | iOS auth dependency |
| `@react-native-google-signin/google-signin` | `^16.1.2` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Auth dependency |
| `react-native-app-auth` | `^8.1.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Auth dependency |

### Monorepo alignment checks

| Item | Current | Target `0.84.x` | Target `0.85.x` | Owner | Backup | Status | Last Validation | Last Note |
|---|---|---|---|---|---|---|---|---|
| Root `react-native` dependency | `0.76.9` | `TBD / keep or align` | `TBD / keep or align` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Only change if it blocks app build/test integrity |
| Root `react` resolution | `^18.3.1` | `Verify` | `Verify` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Confirm RN target compatibility |
| Root `react-native-webview` resolution | `13.16.0` | `TBD` | `TBD` | `@unassigned` | `@unassigned` | `Not Started` | `None` | Must match app decision |

## Work Breakdown Checklist

### Preparation

- [ ] Assign primary and backup owners for all four tracks
- [ ] Record baseline pass/fail results for lint, types, test, web build, iOS, and Android
- [ ] Record current overrides/resolutions that may need cleanup during the upgrade
- [ ] Confirm rollback commit/tag for the `0.77.0` baseline
- [ ] Link this checklist from the upgrade PR description

### RN `0.84.x` track

- [ ] Pick exact `0.84.x` target
- [ ] Pick exact Expo SDK line compatible with the chosen `0.84.x` target
- [ ] Bump RN core and companion packages
- [ ] Regenerate iOS pods
- [ ] Regenerate Android dependencies
- [ ] Resolve Metro/Babel/Jest config drift
- [ ] Resolve iOS build breaks
- [ ] Resolve Android build breaks
- [ ] Validate auth flow
- [ ] Validate camera flow
- [ ] Validate permissions prompts
- [ ] Validate push initialization
- [ ] Validate webview flows
- [ ] Validate NFC/passport scan entry
- [ ] Get 3 consecutive green CI runs

### RN `0.85.x` track

- [ ] Confirm `0.84.x` stabilization is complete before bumping again
- [ ] Pick exact `0.85.x` target
- [ ] Apply `0.84.x -> 0.85.x` package bump
- [ ] Resolve any Jest preset migration work
- [ ] Re-run pods and Android dependency refresh
- [ ] Resolve iOS build breaks
- [ ] Resolve Android build breaks
- [ ] Re-run critical flow validation
- [ ] Record rollout stop conditions before production rollout

## Validation Log

| Date | Owner | Command / Check | Result | Notes |
|---|---|---|---|---|
| `YYYY-MM-DD` | `@name` | `yarn workspace @selfxyz/mobile-app test` | `Pass/Fail` | `Short note` |

## Open Questions

- [ ] Which exact RN `0.84.x` target should be the stabilization line?
- [ ] Which exact Expo SDK line is the supported pair for the chosen `0.84.x` target?
- [ ] Does the root `react-native` dependency need to move, or can it remain isolated from the app upgrade?
- [ ] Which current overrides/resolutions can be removed after the upgrade instead of carried forward?
