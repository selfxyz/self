# Ship AAR + XCFramework to MiniPay

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-shells
- Backlog IDs: NS-08
- Owner: Native Shells
- Depends on: NS-03
- Branch: TBD
- PR: TBD

## Goal

Make KMP SDK artifacts consumable by MiniPay. Android via Maven repository, iOS via SPM with hosted XCFramework.

## Scope

### Android

1. Add `publishing { repositories { maven { ... } } }` block to `shared/build.gradle.kts` targeting GitHub Packages (or whichever Maven repo MiniPay can resolve).
2. Validate: run `./gradlew :shared:publish`, then resolve `xyz.self.sdk:shared-android:0.1.0` from a clean consumer Gradle project.

### iOS

1. Switch `createXCFramework` task from debug to release variants (~3 lines in `build.gradle.kts`).
2. Build, zip, compute checksum, upload to GitHub Release.
3. Update `Package.swift` binary target from local path to release URL + checksum.
4. Tag release. Validate: add SPM dependency from a clean Xcode project.

## Files to Modify

- `packages/kmp-sdk/shared/build.gradle.kts` — add publishing repository block
- `packages/kmp-sdk/shared/build.gradle.kts` — switch `createXCFramework` to release variants
- `packages/kmp-sdk/Package.swift` — remote binary target URL

## Out of Scope

- Maven Central (GPG signing, full POM metadata). GitHub Packages or equivalent is sufficient.
- CocoaPods. SPM is sufficient for MiniPay.
- CI automation for publishing. Manual release is fine for now.

## Validation

```bash
# Android
cd packages/kmp-sdk && ./gradlew :shared:publish
# Then from a separate consumer project: resolve xyz.self.sdk:shared-android:<version>

# iOS
cd packages/kmp-sdk && ./gradlew createXCFramework
# Then from a clean Xcode project: add SPM dependency and build
```

## Definition of Done

- [ ] MiniPay can resolve the Android AAR from a Maven repository
- [ ] MiniPay can add the iOS XCFramework via SPM from a hosted URL
- [ ] Consumer resolution validated end-to-end on both platforms
