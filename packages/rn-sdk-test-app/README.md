# RN SDK Test App

Minimal React Native host app for manual, real-device validation of `@selfxyz/rn-sdk`.

## Purpose

This harness validates:

- WebView asset loading (`self-wallet/index.html`) on Android and iOS
- Bridge round-trip (lifecycle, biometrics, keychain, camera, NFC)
- NFC passport scan including APDU allowlist path

## Dependency Wiring

- Uses local workspace SDK: `"@selfxyz/rn-sdk": "workspace:*"`
- Peer/native deps installed: `react-native-webview`, `react-native-nfc-manager`, `react-native-biometrics`, `react-native-keychain`, `react-native-fs`

## Camera / MRZ in this Harness

- If no native `SelfMRZScannerModule`/`MRZScannerModule` is linked, `App.tsx` attempts to install a fallback scanner module that returns deterministic MRZ data.
- This keeps the camera bridge path testable for integration validation, but it is not a real camera scan.
- To validate real MRZ scanning on-device, replace the fallback with a native scanner module.

## iOS Debug Networking

- `Info.plist` keeps ATS strict for non-debug builds.
- `Info-Debug.plist` enables arbitrary loads for debug testing (for non-HTTPS staging/dev endpoints).

## Run

```bash
yarn install
yarn workspace @selfxyz/rn-sdk-test-app android
yarn workspace @selfxyz/rn-sdk-test-app ios
```

On macOS, `yarn install` automatically runs Bundler + CocoaPods for this workspace.
Set `SKIP_RN_SDK_TEST_APP_PODS=1` to skip that step.

## UI

Single screen with one button: **Launch Verification**.
