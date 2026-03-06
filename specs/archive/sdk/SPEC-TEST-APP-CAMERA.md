# RN SDK Test App Native MRZ Camera Integration Plan

> Date: 2026-03-05
> Status: **Done** — archived 2026-03-05

## Goal

Wire real native MRZ scanning into the RN SDK test app so the WebView camera screen can execute `camera.scanMRZ` through `@selfxyz/rn-sdk` without the JavaScript fallback module.

## Scope

Primary scope: `packages/rn-sdk-test-app/`

Additional scope (cancellation behavior fix):

- `packages/rn-sdk/src/handlers/CameraHandler.ts` — map native `MRZ_SCAN_CANCELLED` distinctly
- `packages/rn-sdk/src/__tests__/CameraHandler.test.ts` — cancellation test
- `packages/webview-app/src/screens/onboarding/DocumentCameraScreen.tsx` — handle cancellation as clean exit

## What Was Delivered

1. Removed JS fallback injection from `App.tsx`
2. Android native MRZ module (CameraX + ML Kit): `SelfMRZScannerModule.kt`, `SelfMRZScannerPackage.kt`, `SelfMrzScannerActivity.kt`, `SelfMrzParser.kt`
3. iOS native MRZ module (AVFoundation + Vision): `SelfMRZScannerModule.swift`, `SelfMRZScannerModule.m`
4. Cancellation behavior: CameraHandler distinguishes `MRZ_SCAN_CANCELLED` from generic failures; DocumentCameraScreen navigates home on cancel
5. Scanner UX: guide frame, instruction text, privacy note, styled cancel button on both platforms

## Validation

- `yarn workspace @selfxyz/rn-sdk test` — 65 tests pass
- Android `./gradlew assembleDebug` — pass
- iOS `xcodebuild` simulator build — pass
