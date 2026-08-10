# RSP-06 — Retire the legacy Android MRZ view

> Workstream: [RN SDK Packaging](../SPEC.md)
> Status: Ready
> Priority: High
> Depends on: RSP-03

## Why

`packages/mobile-sdk-alpha/src/components/MRZScannerView.tsx` selects
`SelfOCRViewManager` on Android. The manager at
`packages/mobile-sdk-alpha/mobile-sdk-native/src/main/java/com/selfxyz/selfSDK/SelfOCRViewManager.kt`
uses the Paper-era `ViewGroupManager` + command + fragment-replacement
pattern that silently failed under bridgeless in the app.

**This is a two-repo change — read before scoping the PR.**
`packages/mobile-sdk-alpha/mobile-sdk-native` is a **git submodule**
(`git@github.com:selfxyz/mobile-sdk-native.git`, tracked at gitlink
`074f2353`). The Kotlin source is not in this repo and cannot be edited by
a PR against `selfxyz/self`. The native removal lands as a PR in
`selfxyz/mobile-sdk-native`; this repo takes a submodule pointer bump plus
the TypeScript and demo-app changes.

A second copy exists at `packages/mobile-sdk-alpha/android/src/` — byte-identical,
but **untracked** (only `android/*.gradle` and `gradle.properties` are in
git). It is local residue, not a source of truth. Deleting it changes
nothing and must not be mistaken for completing this plan.

This is a live in-repo consumer gap: `packages/mobile-sdk-demo` renders
`DocumentCameraScreen` and sets `newArchEnabled=true`. RSP-03 already
provides the maintained CameraX-backed `@selfxyz/rn-mrz-scanner` module,
so preserving the legacy manager would create a third native MRZ path.

## Decision

Replace the Android implementation reachable from `MRZScannerView` with
an adapter over `@selfxyz/rn-mrz-scanner`. Preserve the exported
`DocumentCameraScreen` callbacks and MRZ result contract. Do not migrate
the legacy manager to Fabric, restore interop flags, or change the iOS
`SelfMRZScannerView` path covered by the Paper exception.

Keep the browser entry safe: nothing reachable from
`packages/mobile-sdk-alpha/src/browser.ts` may import React Native or the
scanner module.

## Files modified

- `packages/mobile-sdk-alpha/src/components/MRZScannerView*` — Android
  adapter using the maintained scanner module; preserve the public props.
- `packages/mobile-sdk-alpha/package.json` — declare the scanner using the
  narrowest dependency/peer shape consistent with optional native capture.
- `packages/mobile-sdk-demo/` — install/wire the scanner and exercise the
  real New Architecture path.
- `packages/mobile-sdk-alpha/mobile-sdk-native/` — **submodule; separate
  PR in `selfxyz/mobile-sdk-native`.** Remove the obsolete Android
  manager, fragment, registration, and dependencies after no exported
  path reaches them. Land that PR first, then bump the gitlink here.

## Acceptance criteria

- `mobile-sdk-alpha` no longer registers or renders Android
  `SelfOCRViewManager` from its public onboarding flow.
- `mobile-sdk-demo` completes a real MRZ scan on Android with
  `newArchEnabled=true` using `@selfxyz/rn-mrz-scanner`.
- Existing `DocumentCameraScreen` consumers receive compatible success,
  cancellation, and error behavior.
- The browser dependency graph remains React Native-free.
- Obsolete Android MRZ view code and dependencies are removed; no third
  scanner implementation is introduced.
- The `mobile-sdk-native` submodule pointer in this repo is bumped to the
  commit that removes them, and `git submodule status` is clean.

## Validation

```bash
pnpm --filter @selfxyz/mobile-sdk-alpha test
pnpm --filter @selfxyz/mobile-sdk-alpha types
pnpm --filter @selfxyz/mobile-sdk-alpha build
pnpm --filter @selfxyz/webview-app build
pnpm --filter @selfxyz/mobile-sdk-alpha exec npx --yes madge --no-spinner src/browser.ts | grep -i react-native
```

The Madge command must print nothing. Build and run `mobile-sdk-demo` on
an Android device or emulator with New Architecture enabled, complete an
MRZ scan, and attach the result to the implementation PR.
