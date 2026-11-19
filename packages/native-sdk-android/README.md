# native-sdk-android

The Android native core of the Self SDK, in plain Kotlin. It hosts one WebView that runs the Self web app and answers the web app's bridge messages with device features.

**Status: bridge types and build setup.** The module holds the types of the bridge contract, their tests, and the libraries and lint setup that the next steps use. No feature code exists yet.

## Rules for this directory

- New Android native code for the SDK goes here.
- The existing implementations are reference only. Read them to learn behaviour, or copy a reviewed piece file by file. Do not move or edit them: `packages/native-shell-android`, `packages/kmp-sdk`, `packages/rn-sdk`, `packages/mobile-sdk-alpha`, `app/android`.
- Passport NFC and MRZ source does not go in this repository. It is consumed as a published binary.
- Native code does hardware and OS access only. Screens and flow logic live in the web app.
- `src/main/kotlin/xyz/self/sdk/core/bridge/generated/` is written by `packages/bridge-schema`. Do not edit a file there and do not add one. Change the schema, then run `pnpm --filter @selfxyz/bridge-schema generate`.
- ktlint does not check that directory (`.editorconfig`). The drift check of `packages/bridge-schema` owns the format of those files.
- The bridge types are `internal`. They are not part of the host API.
- The group `xyz.self.sdk` and the namespace `xyz.self.sdk.core` are placeholders until the public host API is settled.

## Requirements

- minSdk 24, compileSdk 35, JDK 17.
- The Android SDK with platform 35, and its path in `local.properties` or `ANDROID_HOME`.

## Build setup

The Android Gradle plugin, Kotlin, the two kotlinx libraries and the ktlint plugin have the versions of `packages/kmp-sdk/gradle/libs.versions.toml`. The spec's Passport Module page cites that file for `compileSdk 35` and coroutines 1.9.0. Robolectric is not in that file.

| Part                  | Version | Use                                                                       |
| --------------------- | ------- | ------------------------------------------------------------------------- |
| Android Gradle plugin | 8.12.0  | `compileSdk 35` needs a newer plugin than 8.2.2.                          |
| Kotlin                | 2.1.0   | The two kotlinx libraries below need Kotlin 2.                            |
| kotlinx-serialization | 1.7.3   | JSON for the envelope codec (step 8).                                     |
| kotlinx-coroutines    | 1.9.0   | The router and the handlers. `kotlinx-coroutines-test` in tests.          |
| ktlint Gradle plugin  | 12.1.2  | ktlint 1.5.0 with the plugin's `android` flag, as `native-shell-android`. |
| Robolectric           | 4.14.1  | Unit tests that need Android classes. No device.                          |

- The ktlint rules are the ones `native-shell-android` gets from the same setup: trailing commas, one parameter per line. `.editorconfig` sets no `ktlint_code_style`. Setting `android_studio` there gives other rules (no trailing comma, 100 columns).
- A test that needs an Android class has `@RunWith(RobolectricTestRunner::class)`. A test without it runs on the plain JVM.
- Robolectric runs API 35 (`src/test/resources/robolectric.properties`). Its first run downloads the Android jar for that API.
- `ToolchainTest` proves that Robolectric, the serialization plugin and the coroutine test scheduler work. It tests no SDK behaviour. Remove a case when a real test covers the same library.

## Build, test and lint

```sh
./gradlew ktlintCheck
./gradlew testReleaseUnitTest
./gradlew assembleRelease
./gradlew ktlintFormat   # fix the format of hand-written files
```

CI runs the first three commands in `.github/workflows/native-sdk-ci.yml`.

The Gradle wrapper was generated with `gradle wrapper`. The settings, build file and placeholder sources were written by hand.
