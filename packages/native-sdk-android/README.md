# native-sdk-android

The Android native core of the Self SDK, in plain Kotlin. It hosts one WebView that runs the Self web app and answers the web app's bridge messages with device features.

**Status: empty skeleton.** The module builds and has one placeholder test. No feature code exists yet.

## Rules for this directory

- New Android native code for the SDK goes here.
- The existing implementations are reference only. Read them to learn behaviour, or copy a reviewed piece file by file. Do not move or edit them: `packages/native-shell-android`, `packages/kmp-sdk`, `packages/rn-sdk`, `packages/mobile-sdk-alpha`, `app/android`.
- Passport NFC and MRZ source does not go in this repository. It is consumed as a published binary.
- Native code does hardware and OS access only. Screens and flow logic live in the web app.
- The group `xyz.self.sdk` and the namespace `xyz.self.sdk.core` are placeholders until the public host API is settled.

## Requirements

- minSdk 24, JDK 17.
- The Android SDK, with its path in `local.properties` or `ANDROID_HOME`.

## Build and test

```sh
./gradlew assembleRelease
./gradlew testReleaseUnitTest
```

The Gradle wrapper was generated with `gradle wrapper`. The settings, build file and placeholder sources were written by hand, with plugin versions matching `packages/native-shell-android`.
