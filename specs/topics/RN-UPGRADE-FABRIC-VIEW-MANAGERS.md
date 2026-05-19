# Migrate Android Camera View Managers to Fabric

_Last updated: 2026-05-19_
_Owner: Mobile App_
_Linear: (TBD)_
_Status: In progress — blocking RN 0.83 / Expo 55 upgrade_

## Context

The RN 0.83 / Expo SDK 55 upgrade turns on bridgeless + Fabric on Android (`android/gradle.properties:40` → `newArchEnabled=true`). Two legacy Paper view managers in `app/android/` stopped rendering on Android. iOS is unaffected — the iOS components were already Fabric-compatible.

A first attempt added a `ReactNativeFeatureFlags.override` block in `MainApplication.onCreate` that set `useFabricInterop = true` and `useNativeViewConfigsInBridgelessMode = true`. **That override did not work** — logcat during MRZ scan attempts shows zero output from `PassportOCRViewManager.createViewInstance`, `createFragment`, or any of the downstream Fotoapparat / ML Kit calls. `requireNativeComponent('PassportOCRViewManager')` returns a no-op stub under bridgeless without proper Fabric codegen, regardless of the interop flag.

So: Fabric migration is the real fix, not a follow-up. The override block in `MainApplication.kt` should be deleted as part of this work — it does nothing.

## You are migrating

1. `app/android/app/src/main/java/com/proofofpassportapp/ui/PassportOCRViewManager.kt` (+ `CameraMLKitFragment.kt`) — MRZ scan camera. JS handle `PassportOCRViewManager`. JS callsite: `app/src/components/native/PassportCamera.tsx:40`.
2. `app/android/app/src/main/java/com/proofofpassportapp/ui/QRCodeScannerViewManager.kt` (+ `QrCodeScannerFragment.kt`) — QR scan camera. JS handle `QRCodeScannerViewManager`. Search `app/src/` for the `requireNativeComponent('QRCodeScannerViewManager')` site before starting.

iOS counterparts (`PassportOCRView`, the iOS QR scanner) are out of scope — they render under Fabric already.

## Approach (decisions, not options)

Two coupled changes per view manager. Do both in one PR per manager, or both managers in one PR — your call on PR size, but do not split codegen from the implementation rewrite.

### Change A — Fabric codegen

1. **Author a codegen spec** in TypeScript at `app/src/specs/PassportOCRViewNativeComponent.ts` (and `QRCodeScannerViewNativeComponent.ts`) using `codegenNativeComponent` and `codegenNativeCommands`. Surface: `width: Int32`, `height: Int32`, commands `start()` / `stop()` (rename from the current `create` / `destroy` — see Change B below), bubbled events `onPassportRead`/`onError` and `onQRData`/`onError`.
2. **Wire codegen** by adding a `codegenConfig` block to `app/package.json` with `name`, `type: 'all'`, `jsSrcsDir: './src/specs'`, `android.javaPackageName: 'com.proofofpassportapp.specs'`. Run `cd app/android && ./gradlew generateCodegenArtifactsFromSchema` and verify the generated `*ManagerDelegate` and `*ManagerInterface` land under `app/android/app/build/generated/source/codegen/...`.
3. **Convert the Kotlin manager** to `SimpleViewManager<View>` implementing the generated `<ComponentName>ViewManagerInterface`. Replace `RCTEventEmitter.receiveEvent(...)` with `UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)?.dispatchEvent(...)` emitting `Event<>` subclasses. Replace `getCommandsMap()` and the integer `receiveCommand` overload with the codegen string-name `receiveCommand(view, command, args)` overload.
4. **Update the JS callsite.** Replace `requireNativeComponent('PassportOCRViewManager')` with the default export of the new spec file. Keep `Platform.select` — iOS continues to use `requireNativeComponent('PassportOCRView')` unchanged.

### Change B — Drop fragment-replace, embed the camera directly

The current managers use `supportFragmentManager.beginTransaction().replace(reactNativeViewId, fragment, ...)` to swap a `Fragment` into a `FrameLayout` whose Android id equals the React tag. **This pattern is unreliable under Fabric** — view IDs are not stable the way Paper assumes, and the fragment transaction commonly commits before the view tree is settled. It is the #1 source of "Fabric component registered but still blank" regressions after a Paper-to-Fabric port.

Replace the fragment indirection with a direct view:

1. The view manager creates and returns a `androidx.camera.view.PreviewView` (or a `FrameLayout` containing one) from `createViewInstance`. No fragment.
2. Migrate `CameraMLKitFragment` / `QrCodeScannerFragment` into a non-fragment helper class (`CameraMrzController`, `QrScannerController`) that takes a `LifecycleOwner`, a `PreviewView`, and a `ProcessCameraProvider`. Move the OCR / barcode logic verbatim — only the host changes.
3. The view manager observes the `ThemedReactContext`'s `currentActivity` as `LifecycleOwner` for CameraX lifecycle binding. Bind on `onViewAttachedToWindow`, unbind on `onViewDetachedFromWindow`. Do not call `currentActivity.supportFragmentManager`.
4. Drop the `Choreographer.postFrameCallback` + `manuallyLayoutChildren` hack at `PassportOCRViewManager.kt:97-120`. Fabric drives layout itself; the manual-layout loop is both unnecessary and a perf cost.

### Change C — Camera backend stays on Fotoapparat (deferred)

Fotoapparat (`io.fotoapparat`) is unmaintained since 2019 and uses the deprecated Camera1 API. It is **not** the reason MRZ and QR recognition work — that pipeline is ML Kit (`OcrMrzDetectorProcessor`, `OcrUtils`, `MRZUtil`, `BarcodeScanning`), independent of the frame source. Swapping Fotoapparat → CameraX is a worthwhile follow-up but is **not required** for this PR.

For this PR, keep Fotoapparat. Inside the new non-fragment controller classes, instantiate `io.fotoapparat.Fotoapparat` directly against the embedded `io.fotoapparat.view.CameraView`. The existing frame processor and OCR / barcode listener wiring port over unchanged — only the host changes.

Follow-up (separate spec, not this PR): migrate to CameraX. Trigger criteria: a Camera1 failure that affects a real device on a supported Android version, or `targetSdk` 36 (whichever comes first).

## Out of scope

- Migrating `CameraActivityPackage.java`, `QRCodeScannerPackage.java`, or `BackupPackage.kt` to TurboModules. These are non-view native modules and are not affected by this issue.
- iOS Fabric migration. iOS already works.
- Replacing the in-app cameras with the SDK bridge handlers from `specs/projects/sdk/workstreams/native-hardware-handlers/SPEC.md`. That is a separate, larger workstream.
- Disabling new arch as a workaround. The branch has committed to keeping new arch on; this spec is the path to making that decision hold.

## Validation

Run, in order, before opening the PR:

```bash
cd app/android && ./gradlew generateCodegenArtifactsFromSchema
yarn workspace @selfxyz/mobile-app types
yarn workspace @selfxyz/mobile-app lint
cd app/android && ./gradlew assembleDebug -PbundleInDebug=true
```

Manual smoke (required, no e2e covers it):

- Build and install on a physical Android device. Emulator camera surfaces are unreliable for MRZ.
- Open the MRZ scan flow → camera preview appears, MRZ string returns via `onPassportRead`. Confirm in logcat that the new controller logs `bindToLifecycle` succeeding and ML Kit emits text frames.
- Open the QR scan flow → camera preview appears, QR string returns via `onQRData`.
- Navigate away from each flow → camera releases. No logcat errors about leaked surfaces or `CameraDevice` not closing.

After both flows pass: confirm `ReactNativeFeatureFlags.override(...)` and its imports are removed from `MainApplication.onCreate`, the `TODO(RN-NEW-ARCH-MIGRATION)` comment is gone, Fotoapparat is removed from `build.gradle`, and the two fragment classes are deleted (or empty shells noted for removal). Rebuild and re-run both smoke tests. If anything regresses, the migration is incomplete.

## Acceptance criteria

- `PassportOCRViewManager` and `QRCodeScannerViewManager` are Fabric components registered via codegen.
- Neither view manager uses `supportFragmentManager` or the fragment-replace pattern.
- `CameraMLKitFragment` and `QrCodeScannerFragment` are deleted; their camera logic lives in non-fragment controller classes that host the Fotoapparat `CameraView` directly.
- Fotoapparat remains the camera backend. Removing it is a tracked follow-up, not part of this PR.
- JS callsites in `app/src/components/native/PassportCamera.tsx` and the QR scanner wrapper import from generated codegen specs, not `requireNativeComponent`.
- `MainApplication.onCreate` contains no `ReactNativeFeatureFlags.override` block.
- Both camera flows render and emit events on a physical Android device with `newArchEnabled=true`.
- `--ci-match` Android e2e still passes.

## Risks and known sharp edges

- **Fragment transactions vs. Fabric.** Resist the temptation to keep the fragments and "just add codegen." The fragment-replace pattern has caused enough Paper-to-Fabric regressions that the safer engineering path is to drop it entirely. If you find yourself fighting `IllegalStateException: Fragment already added` or "no view found for id", you are on the wrong path.
- **Fotoapparat lifecycle in a view manager.** Fotoapparat has explicit `start()` / `stop()` calls. Call `start()` in `onViewAttachedToWindow`, `stop()` in `onViewDetachedFromWindow`. Gate frame-processor callbacks on `view.isAttachedToWindow` to avoid emitting events into a detached React tree.
- **Camera1 deprecation.** Fotoapparat uses the Camera1 API. It works on current devices but Android 15+ and OEM-specific Camera HALs increasingly mishandle it. If you see a "camera fails to open" report after this PR, it is a Fotoapparat / Camera1 issue, not a Fabric issue — the migration to CameraX is the answer, not re-debugging codegen.
- **Codegen and bridgeless are tightly coupled.** If `generateCodegenArtifactsFromSchema` fails, the most likely cause is a missing or malformed `codegenConfig` block in `app/package.json`. Fix codegen before debugging Kotlin.
- **Prop types.** The current `@ReactPropGroup(customType = "Style")` for `width`/`height` does not translate cleanly to Fabric. Expose them as plain `Int32` props in the codegen spec. Verify `PassportCamera.tsx` still sets them through `PixelRatio.getPixelSizeForLayoutSize`.
- **Event payload shape.** The existing `onPassportRead` payload is `{ data: string }` from `mrzInfo.toString()`. The MRZ parsing then re-parses the same string on the JS side. Do not "improve" the payload shape — keep it byte-for-byte compatible to avoid touching JS parsing in the same PR.
