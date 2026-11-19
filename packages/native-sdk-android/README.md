# native-sdk-android

The Android native core of the Self SDK, in plain Kotlin. It hosts one WebView that runs the Self web app and answers the web app's bridge messages with device features.

**Status: bridge types, envelope codec and fixture runner skeleton.** The module holds the types of the bridge contract, the codec that reads and writes its messages, the JavaScript escaping, and a test runner for the shared fixtures. No router, handler or WebView host exists yet.

## Rules for this directory

- New Android native code for the SDK goes here.
- The existing implementations are reference only. Read them to learn behaviour, or copy a reviewed piece file by file. Do not move or edit them: `packages/native-shell-android`, `packages/kmp-sdk`, `packages/rn-sdk`, `packages/mobile-sdk-alpha`, `app/android`.
- Passport NFC and MRZ source does not go in this repository. It is consumed as a published binary.
- Native code does hardware and OS access only. Screens and flow logic live in the web app.
- `src/main/kotlin/xyz/self/sdk/core/bridge/generated/` is written by `packages/bridge-schema`. Do not edit a file there and do not add one. Change the schema, then run `pnpm --filter @selfxyz/bridge-schema generate`.
- ktlint does not check that directory (`.editorconfig`). The drift check of `packages/bridge-schema` owns the format of those files.
- The bridge types are `internal`. They are not part of the host API.
- `src/test/resources/bridge-fixtures/` is a copy of `packages/bridge-schema/fixtures/`, written by the same command. Do not edit a file there and do not add one.
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
| kotlinx-serialization | 1.7.3   | Not used yet. The envelope codec has its own JSON reader (see below).     |
| kotlinx-coroutines    | 1.9.0   | The router and the handlers. `kotlinx-coroutines-test` in tests.          |
| ktlint Gradle plugin  | 12.1.2  | ktlint 1.5.0 with the plugin's `android` flag, as `native-shell-android`. |
| Robolectric           | 4.14.1  | Unit tests that need Android classes. No device.                          |

- The ktlint rules are the ones `native-shell-android` gets from the same setup: trailing commas, one parameter per line. `.editorconfig` sets no `ktlint_code_style`. Setting `android_studio` there gives other rules (no trailing comma, 100 columns).
- A test that needs an Android class has `@RunWith(RobolectricTestRunner::class)`. A test without it runs on the plain JVM.
- Robolectric runs API 35 (`src/test/resources/robolectric.properties`). Its first run downloads the Android jar for that API.
- `ToolchainTest` proves that Robolectric, the serialization plugin and the coroutine test scheduler work. It tests no SDK behaviour. Remove a case when a real test covers the same library.

## Bridge codec

Source: Bridge Contract (BC) sections 3.2, 4.1 and 4.6. Decision id: BC-Q40. `packages/native-sdk-ios` has the same code in Swift, with the same rules and the same test cases.

| File               | Holds                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `JsonValue.kt`     | The untyped JSON value of `params` and `data`.                                                                |
| `JsonText.kt`      | Reads and writes `JsonValue` as JSON text.                                                                    |
| `EnvelopeCodec.kt` | `decode` reads a message body from the web. `encode` writes a response or an event.                           |
| `BridgeScript.kt`  | The JavaScript that delivers a message: `_handleResponse('...')` or `_handleEvent('...')`, with the escaping. |

What `EnvelopeCodec.decode` gives for a body (BC 4.6):

| Body                                                                         | Result                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Not JSON, or JSON that is not an object                                      | `Dropped`                                                          |
| No `id`, or an `id` that is not a non-empty string                           | `Dropped`                                                          |
| A `type` other than `request` or `cancel`                                    | `Dropped`                                                          |
| A request with a required field that is missing, `null` or of the wrong type | `InvalidRequest`, with the field. `toError()` is `INVALID_PARAMS`. |
| A cancel with a required field that is missing, `null` or of the wrong type  | `Dropped`. A cancel has no response.                               |
| A request or a cancel with every required field                              | `Request` or `Cancel`                                              |

- An unknown field is ignored. `null` is the same as absent.
- `InvalidRequest` names the first field at fault in the order `version`, `domain`, `method`, `params`, `timestamp`. It also holds the `version`, `domain` and `method` that could be read.
- `version` must be a whole number. `domain` and `method` must be non-empty strings. `params` must be an object. `timestamp` must be a number.
- The codec does not check that `id` is a UUID, and does not check that native serves the `version`, the `domain` or the `method`. The router does the last three (step 9).
- A cancel `reason` outside the list reads as absent, because the reason is for logs only.
- `encode` leaves out an optional field that has no value: `data` that is `null`, `error`, `details` with no key, `requestId` of an event. It throws for a response whose `success` and `error` disagree, and for a number that is not finite.

`JsonText` rules. They make one body give the same value on Android and iOS:

- A number is a double, as in `JSON.parse` on the web side. A whole number up to 2^53 in size is written with no fraction and no exponent. A larger whole number loses precision, as it does in the web app.
- A number too large for a double is a parse error.
- A key that appears twice keeps its last value, as in `JSON.parse`.
- A `\u` escape of half a surrogate pair reads as U+FFFD.
- Nesting deeper than 128 levels is a parse error.
- Object keys are written in sorted order.

`BridgeScript.escape` replaces, in one pass: `\` with `\\`, `'` with `\'`, a newline with `\n`, a carriage return with `\r`, U+2028 with the six characters `\u2028`, U+2029 with `\u2029`. The Swift tests evaluate the same vectors in JavaScriptCore.

## Fixture runner

The runner is test code, in `src/test/kotlin/xyz/self/sdk/core/bridge/fixtures/`. The fixture format is in the README of `packages/bridge-schema`.

| Part                  | Does                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `FixtureLoader`       | Reads the fixture copies by the rules of the TypeScript loader.                                              |
| `FixturePlaceholders` | Replaces an id label with a UUID and `"timestamp": 0` with a time.                                           |
| `FixtureSubject`      | The code under test: message bodies in, JSON texts out. The router implements it in step 9.                  |
| `FixtureRunner`       | Feeds each `send`, `native` and `advance` step to the subject and compares each `expect`.                    |
| `FixtureMatcher`      | Compares an emitted message with an `expect`. Its rules are in the README of `packages/bridge-schema`.       |
| `CodecFixtureSubject` | The subject until the router exists. It answers what the codec alone can answer and defers every other step. |

A fixture ends as `Passed`, `Failed` or `Deferred`. `Deferred` means the subject could not run a step yet. It is not a pass.

`EnvelopeFixtureTest` lists each fixture of the groups `envelope` and `envelope-invalid` as one of two kinds, and fails for a fixture that is in neither list:

- Codec-complete, 9 fixtures of `envelope-invalid`: run to the end against `CodecFixtureSubject`.
- Needs the router, 3 fixtures of `envelope-invalid` and all 13 of `envelope`: deferred at the first step. For these the test checks only that each `send` reads as the message it holds, and that the codec writes a message that matches each `expect`.

## Build, test and lint

```sh
./gradlew ktlintCheck
./gradlew testReleaseUnitTest
./gradlew assembleRelease
./gradlew ktlintFormat   # fix the format of hand-written files
```

CI runs the first three commands in `.github/workflows/native-sdk-ci.yml`.

The Gradle wrapper was generated with `gradle wrapper`. The settings, build file and placeholder sources were written by hand.
