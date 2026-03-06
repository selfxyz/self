# RN SDK Test App Native MRZ Camera Integration Plan

> Date: 2026-03-05
> Scope: `packages/rn-sdk-test-app/` only

## Goal

Wire real native MRZ scanning into the RN SDK test app so the WebView camera screen can execute `camera.scanMRZ` through `@selfxyz/rn-sdk` without the JavaScript fallback module.

## Constraints

- Do not modify `packages/rn-sdk/`, `packages/webview-app/`, `packages/webview-bridge/`, or `packages/mobile-sdk-alpha/`.
- Native module name must be `SelfMRZScannerModule`.
- Native modules remain thin wrappers around camera capture + OCR + MRZ extraction.
- Return payload must include:
  - `documentNumber: string`
  - `dateOfBirth: string` (YYMMDD)
  - `dateOfExpiry: string` (YYMMDD)

## Implementation Steps

1. Add Android native scanner module
- Create `SelfMRZScannerModule` (`ReactContextBaseJavaModule`) with `startScanning()` Promise API.
- Launch a dedicated camera scan Activity and resolve/reject via `ActivityEventListener`.
- Implement camera feed with CameraX + ML Kit text recognition and lightweight MRZ parsing (TD3/TD1 extraction) in app-local Kotlin files.
- Register a `ReactPackage` in `MainApplication.kt`.
- Add Android dependencies and Activity manifest entry.

2. Add iOS native scanner module
- Create `SelfMRZScannerModule` Swift bridge (`RCTBridgeModule`) plus ObjC export file.
- Present a full-screen scanner view controller using `AVCaptureSession` + Vision text recognition.
- Parse TD3/TD1 MRZ lines and resolve with `{ documentNumber, dateOfBirth, dateOfExpiry }`.
- Dismiss scanner on success/cancel and reject on errors.
- Add new source files to `SelfRNTestApp.xcodeproj` sources.

3. Remove JavaScript fallback
- Update `packages/rn-sdk-test-app/App.tsx` to stop injecting a fake `SelfMRZScannerModule`.
- Keep the rest of the test app flow unchanged.

4. Validate builds
- iOS: `cd packages/rn-sdk-test-app/ios && pod install && xcodebuild -workspace SelfRNTestApp.xcworkspace -scheme SelfRNTestApp -sdk iphonesimulator build`
- Android: `cd packages/rn-sdk-test-app/android && ./gradlew assembleDebug`

## Expected Outcome

- RN SDK CameraHandler finds `NativeModules.SelfMRZScannerModule` on both platforms.
- Camera screen in WebView opens live camera and returns real MRZ values for NFC step.
- No code changes outside `packages/rn-sdk-test-app/`.
