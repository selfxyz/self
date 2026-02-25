# Native Platforms

## Overview

iOS (Swift) and Android (Java/Kotlin) native code supports features that require direct hardware or OS access. Managed via React Native bridges and the WebView bridge protocol.

## iOS

- **Language**: Swift
- **Build**: Xcode + CocoaPods
- **Location**: `app/ios/`
- **Deployment**: Fastlane (`app/fastlane/`)

### Native Modules

| Module | File | Purpose |
|--------|------|---------|
| MRZ Scanner | `MRZScanner.swift` | Machine Readable Zone detection |
| Live MRZ View | `LiveMRZScannerView.swift` | Real-time camera MRZ UI |
| Camera View | `CameraView.swift` | Camera integration |
| Logger Bridge | `NativeLoggerBridge.swift` | Structured logging from JS |

### Custom Frameworks

| Framework | Purpose |
|-----------|---------|
| `NFCPassportReader.xcframework` | NFC chip reading (ICAO standard) |
| `OpenSSL.xcframework` | Cryptographic operations |

### iOS Config

- Firebase: `GoogleService-Info.plist`
- Entitlements: NFC tag reading, keychain access, associated domains
- CocoaPods: Managed via `Podfile`

## Android

- **Language**: Java/Kotlin
- **Build**: Gradle
- **Location**: `app/android/`
- **Min SDK**: Check `build.gradle`

### Key Config

- Gradle properties for large heap, Hermes engine
- Dev keystore for debug builds
- NFC permissions in AndroidManifest
- ProGuard rules for release builds

## Version Management

- `yarn sync-versions` — syncs iOS and Android version numbers
- App version tracked in both `Info.plist` (iOS) and `build.gradle` (Android)

## Migration Direction

New native features should target the **KMP (Kotlin Multiplatform)** architecture:
- `packages/kmp-sdk/` — shared native code compiled for both platforms
- WebView bridge handles JS ↔ native communication
- Avoids duplicating native code across iOS and Android

## DOs

- DO build new native features in the KMP layer, not as platform-specific React Native modules
- DO use Fastlane for iOS deployment automation
- DO use `yarn sync-versions` before releases to keep platform versions aligned
- DO test NFC features on physical devices (simulators don't support NFC)
- DO use the native logger bridge for structured logging from native code

## DON'Ts

- DON'T add new React Native native modules — use the WebView bridge pattern
- DON'T modify iOS entitlements without understanding the signing implications
- DON'T commit dev keystores or signing credentials to the repository
- DON'T bypass CocoaPods for iOS dependency management
- DON'T test NFC in simulators — it requires real hardware
