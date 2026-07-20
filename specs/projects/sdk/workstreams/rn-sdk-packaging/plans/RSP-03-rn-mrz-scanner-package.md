# RSP-03 — `@selfxyz/rn-mrz-scanner` Optional Package

> Last updated: 2026-07-20
> Status: Ready

- Workstream: rn-sdk-packaging
- Backlog IDs: RSP-03
- Owner: SDK / Platform
- Depends on: RSP-01

## Why

- MRZ camera scanning must be an optional native module a consumer installs only for document
  capture; a KYC/disclose-only consumer should not carry ML Kit / CameraX.
- `CameraHandler` already looks up `SelfMRZScannerModule` (`packages/rn-sdk/src/handlers/CameraHandler.ts:24-26`)
  and expects `startScanning(): Promise<{ documentNumber, dateOfBirth, dateOfExpiry, documentType?, countryCode? }>`.
  This package provides that module by wrapping maintained native code.

## Scope

- New package `packages/rn-mrz-scanner` (`@selfxyz/rn-mrz-scanner`), a standard autolinked RN library:
  - **Android**: depends on AAR `xyz.self.sdk:ocr` (thin/unbundled ML Kit text-recognition). A ~150-line
    RN NativeModule (`getName()` = `SelfMRZScannerModule`) presents the scanner and adapts the
    `CameraMrzProvider` result to `{ documentNumber, dateOfBirth, dateOfExpiry, ... }`. Handle the
    first-run model download + failure path; surface `CAMERA_PERMISSION_DENIED`, `CAMERA_INIT_FAILED`,
    `MRZ_SCAN_CANCELLED` codes that `CameraHandler` already maps.
  - **iOS**: reuse the shared Vision engine (`MrzScanEngine.swift`/`MrzOcrCorrection.swift`) — the same
    source in `app/ios/` and mirrored in `self-sdk-native/self-sdk-swift/Sources/SelfSdkOcr/`. Expose the
    same `SelfMRZScannerModule` (promise-returning `startScanning`). **Resolve canonical iOS source
    ownership** (see Open Question) to avoid a third copy.
  - Autolink via `react-native.config.cjs` + podspec.
- Add to `@selfxyz/rn-sdk` `peerDependencies` with `peerDependenciesMeta: { "@selfxyz/rn-mrz-scanner": { optional: true } }`.
- Pin an explicit published AAR version; add the Maven repo injection (template:
  `self-sdk-native/rn-sdk-test-app/android/build.gradle:35-58`).

## Out of Scope

- NFC package (RSP-04). Capabilities advertising (RSP-01, consumed here).
- Changing `CameraHandler`'s result contract.

## Files to Modify / Create

- `packages/rn-mrz-scanner/` — `package.json`, `android/` (build.gradle + module + package), `ios/` (podspec + Swift module), `react-native.config.cjs`, `src/index.ts` types.
- `packages/rn-sdk/package.json` — add optional peer entry.
- Maven repo injection in the package's `android/build.gradle`.

## Files Not to Modify

- `packages/rn-sdk/src/handlers/CameraHandler.ts` — already resolves `SelfMRZScannerModule`; no change.
- `self-sdk-native/**` — consume published `xyz.self.sdk:ocr` as-is.

## Preconditions

- `xyz.self.sdk:ocr` is published and resolvable (GitHub Packages `self-sdk-dist` or mavenLocal).
- RSP-01 landed so the web app can advertise/consume `mrzCamera` capability.

## Open Question (resolve during implementation)

- **Canonical iOS MRZ source.** The Vision engine exists in three places (`app/ios/`, `self-sdk-swift/SelfSdkOcr`,
  `mobile-sdk-alpha/ios`). Decide whether this package depends on the `SelfSdkOcr` Swift product or vendors
  the engine, so there is one owner long-term. Prefer depending on `SelfSdkOcr` to match the Android AAR reuse model.

## Input / Output

**Input:**

```text
webview-app calls camera.scanMRZ over the bridge; CameraHandler invokes SelfMRZScannerModule.startScanning().
```

**Output:**

```text
Native scanner returns { documentNumber, dateOfBirth, dateOfExpiry } (+ optional type/country). With the
package uninstalled, camera.isAvailable is false and scanMRZ rejects NOT_AVAILABLE (unchanged).
```

## Validation

```bash
# Build the package and a device test app with it installed.
cd packages/rn-mrz-scanner && (android build + pod install)
```

- On-device: MRZ scan of a sample passport returns the three fields; `camera.isAvailable` is true.
- Uninstall test: without the package, `camera.isAvailable` false and capture flow hidden (RSP-01).
- First-run: ML Kit model downloads; offline-before-download surfaces a clear error, not a hang.

## Definition of Done

- [ ] `@selfxyz/rn-mrz-scanner` builds on both platforms and autolinks.
- [ ] Registers `SelfMRZScannerModule` satisfying `CameraHandler` (`startScanning` → three MRZ fields).
- [ ] Optional peer of `@selfxyz/rn-sdk`; KYC-only install does not pull it.
- [ ] iOS canonical-source ownership decided and documented.
- [ ] AAR version pinned; Maven repo injection present.
- [ ] On-device MRZ scan validated; first-run download path handled.
- [ ] SPEC.md backlog status updated.

## Status Log

- 2026-07-20: Spec drafted.
