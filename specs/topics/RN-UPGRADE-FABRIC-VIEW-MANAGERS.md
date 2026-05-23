# Migrate Android Camera View Managers to Fabric

_Last updated: 2026-05-20_
_Owner: Mobile App_
_Linear: (TBD)_
_Status: In progress — blocking RN 0.83 / Expo 55 upgrade_

## Context

The RN 0.83 / Expo SDK 55 upgrade turns on bridgeless + Fabric on Android (`android/gradle.properties:40` → `newArchEnabled=true`). Two legacy Paper view managers in `app/android/` stopped rendering on Android. iOS is unaffected — the iOS components were already Fabric-compatible.

A first attempt added a `ReactNativeFeatureFlags.override` block in `MainApplication.onCreate` that set `useFabricInterop = true` and `useNativeViewConfigsInBridgelessMode = true`. **That override did not work** — logcat during MRZ scan attempts shows zero output from `PassportOCRViewManager.createViewInstance`, `createFragment`, or any of the downstream Fotoapparat / ML Kit calls. `requireNativeComponent('PassportOCRViewManager')` returns a no-op stub under bridgeless without proper Fabric codegen, regardless of the interop flag.

So: Fabric migration is the real fix, not a follow-up. The override block in `MainApplication.kt` should be deleted as part of this work — it does nothing.

There are two similarly named Android passport-reader codebases in this app:

- `app/android/android-passport-nfc-reader/` — vendored passport sample app. This contains the reusable MRZ camera/OCR implementation (`CameraFragment`, `CameraMLKitFragment`, `OcrMrzDetectorProcessor`, `OcrUtils`) that the app-local camera fragments currently reuse.
- `app/android/react-native-passport-reader/` — NFC chip reader React Native module. This does **not** contain MRZ camera code. It is wired as `:react-native-passport-reader` in `app/android/settings.gradle` and used by NFC flows.

Related upstream branch: [`selfxyz/react-native-passport-reader#4`](https://github.com/selfxyz/react-native-passport-reader/pull/4) (`chore/upgrade-rn-0_83`). Reviewed 2026-05-20. It changes only `android/src/main/java/io/tradle/nfc/RNPassportReaderModule.kt`, replacing `currentActivity`/`this.reactContext` foreground-dispatch access with guarded `reactApplicationContext.currentActivity` access in `onHostResume`/`onHostPause`. That PR is an NFC lifecycle compatibility patch, not an Android camera/Fabric view-manager patch. Track/apply it separately for NFC validation, but do not treat it as the MRZ camera fix.

Vendored module edits are allowed. This repo already builds `app/android/react-native-passport-reader` and `app/android/android-passport-nfc-reader` as local Gradle projects rather than consuming only immutable package artifacts. If moving camera-host code into `android-passport-nfc-reader` or applying the NFC lifecycle patch inside `react-native-passport-reader` makes the RN 0.83 upgrade cleaner, do it in the same branch with clear ownership and validation. Keep those edits narrowly scoped and update upstream forks/PRs as needed after the app branch passes.

## You are migrating

1. `app/android/app/src/main/java/com/proofofpassportapp/ui/PassportOCRViewManager.kt` (+ `CameraMLKitFragment.kt`) — MRZ scan camera. JS handle `PassportOCRViewManager`. JS callsite: `app/src/components/native/PassportCamera.tsx:40`.
2. `app/android/android-passport-nfc-reader/app/src/main/java/example/jllarraz/com/passportreader/ui/fragments/CameraFragment.kt` and `CameraMLKitFragment.kt` — source logic to extract into a non-fragment controller. The app-local `com.proofofpassportapp.ui.CameraMLKitFragment` currently subclasses this `CameraFragment`, so port the relevant Fotoapparat setup, rotation, zoom, permission assumptions, frame processing, and ML Kit OCR flow from this vendored code.
3. Optional cleanup surface: create the reusable non-fragment MRZ camera host inside `app/android/android-passport-nfc-reader` if that keeps the app-local manager thin and avoids duplicating `CameraFragment` behavior. The app-local Fabric view manager can then instantiate that controller/view from the module. Do not move React Native Fabric code into the vendored passport-reader sample module; keep RN view-manager registration in `app/android/app`.

iOS counterparts (`PassportOCRView`, the iOS QR scanner) are out of scope — they render under Fabric already.

`QRCodeScannerViewManager.kt` is not an active target on this branch unless a live JS callsite is restored. `app/src/components/native/QRCodeScanner.tsx` currently uses `expo-camera`, and `rg "requireNativeComponent\\('QRCodeScannerViewManager'" app/src` returns no active callsite. Leave `QRCodeScannerViewManager.kt` alone in the MRZ camera PR unless you first prove it is still reachable.

## Approach (decisions, not options)

Two coupled changes for the MRZ view manager. Do not split codegen from the implementation rewrite.

### Change A — Fabric codegen

1. **Author a codegen spec** in TypeScript at `app/src/specs/PassportOCRViewNativeComponent.ts` using `codegenNativeComponent`. Surface: an `isMounted: boolean` prop that drives camera start/release (replacing the previous `create` / `destroy` imperative commands), and bubbled events `onPassportRead`/`onError`. Sizing is delegated to standard `style` (`ViewProps`) — no dedicated `width` / `height` Int32 props. No `codegenNativeCommands` are needed; the declarative `isMounted` prop replaces them.

   **Android Fabric event contract (locked):** the Android `onPassportRead` payload is `{ data: string }` only — `data` is the raw MRZ string emitted by `mrzInfo.toString()`, and JS re-parses it via `selfClient.extractMRZInfo`. Do **not** widen the Android codegen payload type to a `string | object` union, do **not** add structured fields (`documentNumber`, `expiryDate`, …) to the Android payload, and do **not** parse MRZ in Kotlin. The iOS `requireNativeComponent` typing keeps the legacy `string | object` union as a separate type local to `PassportCamera.tsx`; that union is iOS-only and must not leak into `PassportOCRViewNativeComponent.ts`. If iOS migrates to Fabric later, that PR is the one that unifies the payload — not this one.

   **Android Fabric command surface (locked):** there are no `codegenNativeCommands` on the Android Fabric component. Lifecycle is driven by the `isMounted` prop alone. Do **not** reintroduce `start` / `stop` / `create` / `destroy` commands, `dispatchViewManagerCommand`, or any `Commands` export. If a future flow needs imperative control, add it as another declarative prop, not a command.

2. **Wire codegen** by adding a `codegenConfig` block to `app/package.json` with `name`, `type: 'all'`, `jsSrcsDir: './src/specs'`, `android.javaPackageName: 'com.proofofpassportapp.specs'`. Run `cd app/android && ./gradlew generateCodegenArtifactsFromSchema` and verify the generated `*ManagerDelegate` and `*ManagerInterface` land under `app/android/app/build/generated/source/codegen/...`.
3. **Convert the Kotlin manager** to `SimpleViewManager<View>` implementing the generated `<ComponentName>ViewManagerInterface`. Replace `RCTEventEmitter.receiveEvent(...)` with `UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)?.dispatchEvent(...)` emitting `Event<>` subclasses. Delete `getCommandsMap()` and both `receiveCommand` overloads — there are no commands. The only manager-level setter is the generated `setIsMounted(view, value: Boolean)`.
4. **Update the JS callsite.** Replace `requireNativeComponent('PassportOCRViewManager')` with the default export of the new spec file. Keep `Platform.select` — iOS continues to use `requireNativeComponent('PassportOCRView')` unchanged.

### Change B — Drop fragment-replace, embed the camera directly

The current managers use `supportFragmentManager.beginTransaction().replace(reactNativeViewId, fragment, ...)` to swap a `Fragment` into a `FrameLayout` whose Android id equals the React tag. **This pattern is unreliable under Fabric** — view IDs are not stable the way Paper assumes, and the fragment transaction commonly commits before the view tree is settled. It is the #1 source of "Fabric component registered but still blank" regressions after a Paper-to-Fabric port.

Replace the fragment indirection with a direct view:

1. The view manager creates and returns a direct Android view from `createViewInstance`: either `io.fotoapparat.view.CameraView` directly, or a small `FrameLayout`/custom view containing one `CameraView` plus any status overlay you still need. No fragment.
2. Migrate the app-local `CameraMLKitFragment` into a non-fragment helper class (`CameraMrzController`) that takes a `Context`, the embedded `CameraView`, and callbacks for success/error. Move the OCR logic verbatim, and port the required camera-host behavior from `app/android/android-passport-nfc-reader/.../CameraFragment.kt`: `Fotoapparat.with(context.applicationContext).into(cameraView)`, `frameProcessor(...)`, back lens selection, rotation calculation, autofocus/off-flash configuration, pinch zoom if required, and `start()`/`stop()`.
3. The screen already gates camera permission before rendering `PassportCamera` (`DocumentCameraScreen.tsx`). Preserve that contract. The new controller may still check `CAMERA` permission defensively, but it should not launch fragment permission dialogs or call `requestPermissions`; report a JS `onError` if permission is missing.
4. Drop the `Choreographer.postFrameCallback` + `manuallyLayoutChildren` hack at `PassportOCRViewManager.kt:97-120`. Fabric drives layout itself; the manual-layout loop is both unnecessary and a perf cost.

Preferred ownership split if you touch vendored code:

- `android-passport-nfc-reader`: owns pure Android MRZ camera/OCR primitives such as `CameraMrzController`, `CameraMrzView`, Fotoapparat configuration, rotation/zoom handling, and ML Kit frame processing.
- `app/android/app`: owns React Native Fabric codegen specs, `PassportOCRViewManager`, event dispatch, and JS callsites.

This split is optional, but if you find yourself copying large chunks of `CameraFragment` into `app/android/app`, prefer extracting a reusable non-fragment helper into `android-passport-nfc-reader` instead.

### Change C — Camera backend stays on Fotoapparat

Fotoapparat (`io.fotoapparat`) is unmaintained since 2019 and uses the deprecated Camera1 API. It is **not** the reason MRZ and QR recognition work — that pipeline is ML Kit (`OcrMrzDetectorProcessor`, `OcrUtils`, `MRZUtil`, `BarcodeScanning`), independent of the frame source. Swapping Fotoapparat → CameraX is a worthwhile follow-up but is **not required** for this PR.

For this PR, keep Fotoapparat. Inside the new non-fragment controller class, instantiate `io.fotoapparat.Fotoapparat` directly against the embedded `io.fotoapparat.view.CameraView`. The existing frame processor and OCR listener wiring port over unchanged — only the host changes.

Follow-up (separate spec, not this PR): migrate to CameraX. Trigger criteria: a Camera1 failure that affects a real device on a supported Android version, or `targetSdk` 36 (whichever comes first).

Do not introduce `androidx.camera.view.PreviewView`, `ProcessCameraProvider`, or `bindToLifecycle` in this PR unless you intentionally change scope to a CameraX migration. Those belong to the follow-up, not the Fabric/Freestanding-Fotoapparat fix.

## Out of scope

- Migrating `CameraActivityPackage.java`, `QRCodeScannerPackage.java`, or `BackupPackage.kt` to TurboModules. These are non-view native modules and are not affected by this issue.
- Migrating `app/android/react-native-passport-reader` to TurboModules or Fabric. It is an NFC native module, not a view manager.
- Migrating `QRCodeScannerViewManager.kt` unless an active JS callsite is reintroduced. The current QR viewfinder uses `expo-camera`.
- iOS Fabric migration. iOS already works.
- Replacing the in-app cameras with the SDK bridge handlers from `specs/projects/sdk/workstreams/native-hardware-handlers/SPEC.md`. That is a separate, larger workstream.
- Disabling new arch as a workaround. The branch has committed to keeping new arch on; this spec is the path to making that decision hold.

Allowed companion change: apply or vendor [`selfxyz/react-native-passport-reader#4`](https://github.com/selfxyz/react-native-passport-reader/pull/4) in `app/android/react-native-passport-reader` if this branch will validate NFC alongside MRZ. Keep it clearly separated in the PR summary because it fixes NFC foreground-dispatch lifecycle behavior, not Fabric camera instantiation.

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
- Open the MRZ scan flow → camera preview appears, MRZ string returns via `onPassportRead`. Confirm in logcat that the new controller creates `Fotoapparat`, starts it after attach/start command, and ML Kit emits text frames.
- Navigate away from the MRZ flow → camera releases. No logcat errors about leaked surfaces, Camera1 failing to release, or events emitted after detach.
- Run the QR flow as a regression smoke because camera permission and camera package versions are shared, but do not require QR native view-manager changes unless a native QR callsite exists.
- Run the NFC chip-read flow separately after applying/updating `app/android/react-native-passport-reader` with the upstream PR #4 foreground-dispatch patch. Confirm `enableForegroundDispatch`/`disableForegroundDispatch` do not crash when `currentActivity` is briefly null during RN 0.83 lifecycle transitions.
- If `android-passport-nfc-reader` is changed, run `cd app/android && ./gradlew :passportreader:assembleDebug` or the closest available Gradle build task for that module before the full app assemble.

After MRZ passes: confirm `ReactNativeFeatureFlags.override(...)` and its imports are removed from `MainApplication.onCreate`, the `TODO(RN-NEW-ARCH-MIGRATION)` comment is gone, Fotoapparat remains in `build.gradle`, and the app-local `CameraMLKitFragment` is deleted (or left only as a temporary shell with a removal note). Rebuild and re-run the MRZ smoke test. If anything regresses, the migration is incomplete.

## Acceptance criteria

- `PassportOCRViewManager` is a Fabric component registered via codegen.
- `PassportOCRViewManager` does not use `supportFragmentManager` or the fragment-replace pattern.
- `PassportOCRViewNativeComponent.ts` declares no `codegenNativeCommands` and exports no `Commands` object. `PassportOCRViewManager.kt` has no `getCommandsMap` / `receiveCommand` overrides. Camera lifecycle is driven only by the `isMounted` prop.
- The Android codegen event payload for `onPassportRead` is exactly `{ data: string }`. No `string | object` union, no structured MRZ fields on the Android side. The iOS legacy union, if preserved, lives in a type local to `PassportCamera.tsx` and is not imported from the codegen spec.
- The app-local `CameraMLKitFragment` logic lives in a non-fragment controller class that hosts the Fotoapparat `CameraView` directly.
- If large camera-host logic is extracted, it lives in `app/android/android-passport-nfc-reader` as pure Android code with no React Native dependency.
- Fotoapparat remains the camera backend. Removing it is a tracked follow-up, not part of this PR.
- JS callsite in `app/src/components/native/PassportCamera.tsx` imports from the generated codegen spec on Android, not `requireNativeComponent('PassportOCRViewManager')` or `RCTFragment`.
- `MainApplication.onCreate` contains no `ReactNativeFeatureFlags.override` block.
- MRZ camera flow renders and emits events on a physical Android device with `newArchEnabled=true`.
- QR scanner still works through the existing `expo-camera` wrapper.
- NFC chip read is validated separately with the `react-native-passport-reader` foreground-dispatch lifecycle patch from PR #4 applied or vendored, if NFC is in the RN 0.83 branch validation scope.
- `--ci-match` Android e2e still passes.

## Risks and known sharp edges

- **Fragment transactions vs. Fabric.** Resist the temptation to keep the fragments and "just add codegen." The fragment-replace pattern has caused enough Paper-to-Fabric regressions that the safer engineering path is to drop it entirely. If you find yourself fighting `IllegalStateException: Fragment already added` or "no view found for id", you are on the wrong path.
- **Fotoapparat lifecycle in a view manager.** Fotoapparat has explicit `start()` / `stop()` calls. Call `start()` in `onViewAttachedToWindow`, `stop()` in `onViewDetachedFromWindow`. Gate frame-processor callbacks on `view.isAttachedToWindow` to avoid emitting events into a detached React tree.
- **Camera1 deprecation.** Fotoapparat uses the Camera1 API. It works on current devices but Android 15+ and OEM-specific Camera HALs increasingly mishandle it. If you see a "camera fails to open" report after this PR, it is a Fotoapparat / Camera1 issue, not a Fabric issue — the migration to CameraX is the answer, not re-debugging codegen.
- **Codegen and bridgeless are tightly coupled.** If `generateCodegenArtifactsFromSchema` fails, the most likely cause is a missing or malformed `codegenConfig` block in `app/package.json`. Fix codegen before debugging Kotlin.
- **Prop types.** The legacy `@ReactPropGroup(customType = "Style")` for `width`/`height` does not translate cleanly to Fabric. Drop the dedicated `width`/`height` props and let `PassportCamera.tsx` size the view through standard `style` (`PixelRatio.getPixelSizeForLayoutSize`) — Fabric routes `style` width/height through `ViewProps` without a custom codegen surface.
- **Event payload shape.** The Android `onPassportRead` payload is `{ data: string }` from `mrzInfo.toString()`, and the MRZ parsing then re-parses the same string on the JS side. Keep the Android codegen event type as `{ data: string }` exactly. The iOS side historically emits a wider `{ data: string | { documentNumber, ... } }` union; preserve that on the iOS `requireNativeComponent` typing only, so JS parsing remains untouched. Do not unify the two payload shapes in this PR.
