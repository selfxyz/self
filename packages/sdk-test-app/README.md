# SDK Test App

Minimal test apps for exercising the Self SDK native shells (Android + iOS) end-to-end.

## Architecture

```
Host test app → Native shell (keychain/crypto/lifecycle) → WebView (webview-app bundle) → Sumsub KYC
```

The test app launches the native shell, which hosts a WebView running the bundled `webview-app`. The WebView handles the full verification flow (Sumsub KYC → Self proof pipeline) and returns a terminal result to the test app via the bridge.

## Structure

```
sdk-test-app/
├── android/          # Android test app (Jetpack Compose)
│   ├── app/          # App module — MainActivity with config UI + result display
│   └── settings.gradle.kts  # Includes native-shell-android via composite build
├── ios/              # iOS test app (SwiftUI)
│   ├── project.yml   # xcodegen spec — references native-shell-ios via local SPM
│   └── SelfTestApp/  # App source — ContentView with config UI + result display
└── package.json      # Yarn scripts for building
```

## Prerequisites

- **Node.js 22+** and **Yarn 4** (for building the WebView bundle)
- **Android SDK 34** with an emulator or physical device
- **Xcode 15+** for iOS
- **xcodegen** for iOS project generation (`brew install xcodegen`)

## Quick Start

### 1. Build the WebView bundle

This builds `webview-app` and copies the output into both native shell asset directories. **Required before any native build.**

```bash
# From repo root
./scripts/build-webview-bundle.sh
```

If dependencies aren't built yet:

```bash
yarn workspace @selfxyz/mobile-sdk-alpha build
yarn workspace @selfxyz/webview-bridge build
./scripts/build-webview-bundle.sh
```

### 2. Run on Android

```bash
# Build and install on connected device/emulator
cd packages/sdk-test-app/android
./gradlew :app:installDebug

# Or launch directly after install
adb shell am start -n xyz.self.testapp/.MainActivity
```

Or from repo root:

```bash
yarn workspace @selfxyz/sdk-test-app android:install
```

### 3. Run on iOS

```bash
# Generate Xcode project (one-time, or after project.yml changes)
cd packages/sdk-test-app/ios
xcodegen generate

# Open in Xcode
open SelfTestApp.xcodeproj
```

Then build and run from Xcode on a simulator or device.

## Debug Mode

Toggle "Debug mode" in the test app to load the WebView from a local Vite dev server instead of the bundled assets. This enables hot reload during WebView development.

```bash
# Start the dev server (in a separate terminal)
yarn workspace @selfxyz/webview-app dev
```

Then enable "Debug mode" in the test app before tapping "Launch Verification". The WebView will connect to:
- Android: `http://127.0.0.1:5173`
- iOS: `http://localhost:5173`

**Note:** On Android emulator, `127.0.0.1` maps to the emulator's localhost which is forwarded to the host. On a physical device, you may need `adb reverse tcp:5173 tcp:5173`.

## Configuration

The test app has three config fields:

| Field | Default | Description |
|-------|---------|-------------|
| TEE URL | `https://tee.staging.self.xyz` | Trusted execution environment endpoint |
| Verification ID | `test-verification-123` | Session correlation ID (use a real one for end-to-end testing) |
| User ID | `test-user-456` | User correlation key |

For end-to-end testing with Sumsub, you need real `verificationId` and `teeUrl` values from the Self backend.

## How It Works

### Android

1. `MainActivity` calls `SelfSdk.launch(activity, config)` which starts `SelfVerificationActivity`
2. The activity hosts a WebView that loads the bundled `webview-app`
3. WebView communicates with native code via the bridge (`SelfNativeAndroid` JS interface)
4. On completion, the activity finishes with a result intent
5. `SelfSdk.handleResult()` invokes the callback with success/failure/cancelled

### iOS

1. `ContentView` calls `SelfSdk.createViewController(config:callback:)` and presents it as a sheet
2. The view controller hosts a WKWebView that loads the bundled `webview-app`
3. WebView communicates with native code via the bridge (`SelfNativeIOS` message handler)
4. On completion, the `SelfSdkCallback` protocol methods are invoked
5. The view controller is dismissed

## Full Build Pipeline

To build everything from scratch:

```bash
# From repo root

# 1. Install dependencies
yarn install

# 2. Build SDK dependencies
yarn workspace @selfxyz/mobile-sdk-alpha build
yarn workspace @selfxyz/webview-bridge build

# 3. Build and bundle WebView into native shells
./scripts/build-webview-bundle.sh

# 4a. Android: build and install
cd packages/sdk-test-app/android && ./gradlew :app:installDebug

# 4b. iOS: generate project and open in Xcode
cd packages/sdk-test-app/ios && xcodegen generate && open SelfTestApp.xcodeproj
```

Or use the root convenience scripts:

```bash
yarn build:sdk-bundle    # Steps 2-3
yarn build:sdk-android   # Steps 2-3 + Android release build
```
