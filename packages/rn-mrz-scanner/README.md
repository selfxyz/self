# @selfxyz/rn-mrz-scanner

Optional MRZ (Machine Readable Zone) camera-scanner native module for
[`@selfxyz/rn-sdk`](../rn-sdk). It registers the native module `SelfMRZScannerModule`, which
`@selfxyz/rn-sdk`'s `CameraHandler` resolves to satisfy the `camera.scanMRZ` bridge method.

Install this package **only** when your app needs document capture. A KYC / disclose-only
consumer omits it: `camera.isAvailable` stays `false` and the capture flow stays hidden — no ML
Kit / CameraX / Vision code is pulled in.

## Install

```bash
pnpm add @selfxyz/rn-mrz-scanner
```

It is an **optional peer** of `@selfxyz/rn-sdk` (`peerDependenciesMeta.optional`), so `pnpm`
never installs it for a KYC-only build. The module autolinks via `react-native.config.cjs` +
`selfxyz-rn-mrz-scanner.podspec`. No manual registration is required (`SelfMrzScannerPackage` on
Android; the pod on iOS).

### Android — Self SDK Maven repository (required)

The Android side depends on the AAR `xyz.self.sdk:ocr`, published to the private
`self-sdk-dist` GitHub Packages repo (or `mavenLocal` for SDK development). A **library
module's own repositories are not consulted for the consuming app's classpath**, so you must add
these repositories to your app's root `android/build.gradle` (template mirrored from
`self-sdk-native/rn-sdk-test-app/android/build.gradle`):

```groovy
allprojects {
  repositories {
    mavenLocal {
      content { includeGroupByRegex("xyz\\.self\\.sdk(\\..*)?") }
    }
  }
  if (System.getenv("SELF_SDK_GITHUB_TOKEN")) {
    repositories {
      maven {
        url uri("https://maven.pkg.github.com/selfxyz/self-sdk-dist")
        credentials {
          username = System.getenv("SELF_SDK_GITHUB_USER") ?: "self-sdk"
          password = System.getenv("SELF_SDK_GITHUB_TOKEN")
        }
        content { includeGroupByRegex("xyz\\.self\\.sdk(\\..*)?") }
      }
    }
  }
}
```

Add the `CAMERA` permission to your app's `AndroidManifest.xml` and provide a usage rationale.
The bundled ML Kit text-recognition model ships inside the AAR (no runtime download).

### iOS — SelfSdkOcr framework (required)

The iOS side depends on the maintained Vision engine `SelfSdkOcr`
(`self-sdk-native/self-sdk-swift`) and its module dependency `SelfSdkProviders`. RSP-03 resolves
the "three copies of the engine" open question by **depending on `SelfSdkOcr` rather than
vendoring a copy** — there is one long-term owner (`self-sdk-swift`). These are distributed as
binary xcframeworks via `self-sdk-dist` (see the `SelfSdkModule/Passport` subspec in the
`@selfxyz/react-native-sdk` wrapper). Ensure both pods resolve in your `Podfile` before
`pod install`. When absent, the module compiles as an unavailable stub (`#if canImport`) and
`camera.isAvailable` is `false`.

Add `NSCameraUsageDescription` to your `Info.plist`.

## Contract

`SelfMRZScannerModule.startScanning()` resolves:

```ts
interface MrzScanResult {
  documentNumber: string;
  dateOfBirth: string;   // ICAO 9303 YYMMDD
  dateOfExpiry: string;  // ICAO 9303 YYMMDD
  documentType?: string;
  countryCode?: string;
}
```

Rejections carry a `code` that `CameraHandler` maps: `CAMERA_PERMISSION_DENIED`,
`CAMERA_INIT_FAILED`, `MRZ_SCAN_CANCELLED`.

The exported JS helpers (`getMrzScannerModule`, `isMrzScannerAvailable`) are safe to import even
when the native module is unlinked — nothing touches `NativeModules` at import time.

## Platform notes

- **Android** presents a full-screen CameraX preview over the current Activity with a Cancel
  affordance (`MRZ_SCAN_CANCELLED`).
- **iOS** uses the headless `CameraMrzProviderImpl.scanMrz` (Vision processes frames without a
  standalone preview). In the shipped product the live preview is driven through the KMP bridge's
  `CameraPreviewMrzProvider`; this fallback module has no preview UI, so `MRZ_SCAN_CANCELLED` is
  not emitted on iOS.
