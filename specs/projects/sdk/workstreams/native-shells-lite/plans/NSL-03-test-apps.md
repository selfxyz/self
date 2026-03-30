## Test Apps (Adapt from kmp-sdk-test-app)

> Last updated: 2026-03-21
> Status: In Progress (code complete, needs build verification)

- Workstream: native-shells-lite
- Backlog IDs: NSL-03
- Owner: TBD
- Branch: feat/webview-sdk
- PR: TBD

### Why

- Need minimal native apps to exercise the SDK end-to-end on real devices.
- `packages/kmp-sdk-test-app/` already has Android (Jetpack Compose) and iOS (SwiftUI) targets with launch button and result callbacks. Adapt rather than rebuild.

### Scope

- New package: `packages/sdk-test-app/` (fresh, minimal test apps)
- Android: Jetpack Compose app, uses `SelfSdk.launch()` from `native-shell-android` via Gradle composite build
- iOS: SwiftUI app, uses `SelfSdk.createViewController()` from `native-shell-ios` via local SPM dependency, generated with xcodegen

### Out of Scope

- Native shell implementation (NSL-01, NSL-02)
- KYC provider integration
- Automated E2E tests (manual testing only for now)
- NFC, camera, MRZ, biometrics

### Files Created

- `packages/sdk-test-app/package.json` — workspace package with build scripts
- `packages/sdk-test-app/android/settings.gradle.kts` — includes `native-shell-android` as composite build
- `packages/sdk-test-app/android/build.gradle.kts` — root Gradle config
- `packages/sdk-test-app/android/gradle.properties` — JVM and Android config
- `packages/sdk-test-app/android/gradle/wrapper/gradle-wrapper.properties` — Gradle 8.5
- `packages/sdk-test-app/android/app/build.gradle.kts` — app module with Compose + native-shell-android dependency
- `packages/sdk-test-app/android/app/src/main/AndroidManifest.xml` — single activity, INTERNET permission
- `packages/sdk-test-app/android/app/src/main/kotlin/xyz/self/testapp/MainActivity.kt` — Compose UI with config fields, launch button, result display
- `packages/sdk-test-app/android/app/src/main/res/values/strings.xml` — app name
- `packages/sdk-test-app/android/app/src/main/res/values/themes.xml` — Material3 theme
- `packages/sdk-test-app/ios/project.yml` — xcodegen spec with SelfNativeShell local SPM dependency
- `packages/sdk-test-app/ios/SelfTestApp/SelfTestAppApp.swift` — SwiftUI app entry
- `packages/sdk-test-app/ios/SelfTestApp/ContentView.swift` — SwiftUI UI with config fields, launch button, result display
- `packages/sdk-test-app/ios/SelfTestApp/Assets.xcassets/Contents.json` — asset catalog

### Files Not Modified

- `packages/kmp-sdk-test-app/` — kept as reference
- `packages/native-shell-android/` — upstream dependency
- `packages/native-shell-ios/` — upstream dependency

### Preconditions

- NSL-01 (Android shell) complete — `SelfSdk.launch()` API available
- NSL-02 (iOS shell) complete — `SelfSdk.createViewController()` API available

### Validation

```bash
# Android (requires Gradle wrapper — copy from native-shell-android or kmp-sdk-test-app)
cd packages/sdk-test-app/android && ./gradlew :app:assembleDebug

# iOS (requires xcodegen)
cd packages/sdk-test-app/ios && xcodegen generate && xcodebuild -project SelfTestApp.xcodeproj -scheme SelfTestApp -sdk iphonesimulator build
```

### Definition of Done

- [ ] Android test app builds and launches SelfVerificationActivity
- [ ] iOS test app builds and presents SelfSdk ViewController
- [ ] Both apps display verification result on completion
- [ ] No references to KMP SDK remain
- [x] Backlog row updated
- [x] Plan status updated

### Status Log

- 2026-03-20: Plan created.
- 2026-03-21: Code complete. Android Compose app + iOS SwiftUI app created. Needs Gradle wrapper and build verification.
