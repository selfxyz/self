# native-sdk-android

The Android native core of the Self SDK, in plain Kotlin. It hosts one WebView that runs the Self web app and answers the web app's bridge messages with device features.

**Status: bridge types, envelope codec, router and fixture runner.** The module holds the types of the bridge contract, the codec that reads and writes its messages, the JavaScript escaping, the router that answers each request, and a test runner for the shared fixtures. No handler or WebView host exists yet.

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
| kotlinx-coroutines    | 1.9.0   | The handlers. The router uses a lock and `BridgeClock`, not coroutines.   |
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
- The codec does not check that `id` is a UUID, and does not check that native serves the `version`, the `domain` or the `method`. The router does the last three.
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

## Router

Source: BC 5.1, 6, 7. Decision ids: BC-Q8 (cancel is a message type), BC-Q9 (`nfc.cancelScan` and `camera.stopCamera` stay beside it), BC-Q11 (the timeout values), BC-Q36 (requests end when the page navigates). All are "Draft stands" and are built as drafted. `packages/native-sdk-ios` has the same code in Swift, with the same rules and the same test cases.

| File               | Holds                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `BridgeRouter.kt`  | `BridgeRouter`, the `BridgeCall` a handler gets, `BridgeMethodHandler`, and `BridgeMethodRules`.      |
| `BridgeFailure.kt` | The exception a handler fails with, `forReason`, and the mapping of any other exception.              |
| `BridgeClock.kt`   | The time source: `now` for timestamps, `schedule` for timers. `SystemBridgeClock` in production code. |

A handler is registered per domain with one function per method. The router checks a request in this order and answers the first problem without calling the handler:

| Check                                                                             | Answer                                        |
| --------------------------------------------------------------------------------- | --------------------------------------------- |
| `version` is not 2, and the method is not `lifecycle.dismiss` (BC 5.1)            | `UNSUPPORTED_VERSION`, `details.supported`    |
| A pending request has the same `id` (BC 6.4)                                      | `INVALID_PARAMS`, `field: "id"`               |
| No domain of that name, or one registered as unavailable                          | `UNSUPPORTED`, `unknown_domain` or its reason |
| No method of that name in the domain                                              | `UNSUPPORTED`, `unknown_method`               |
| `params.timeoutMs` of a native-owned method is not a whole number of 0 or more    | `INVALID_PARAMS`, `field: "timeoutMs"`        |
| `nfc.scanPassport` or `camera.scanMRZ` while one runs in the same domain (BC 6.4) | `BUSY`                                        |

An invalid request (the codec's `InvalidRequest`) gets `UNSUPPORTED_VERSION` when its `version` is readable and not 2, and `INVALID_PARAMS` with the field otherwise.

Rules after the handler starts:

- Exactly one response. `succeed` and `fail` return false once the request is answered, and send nothing. An event after the response, or while the request ends, is not sent.
- Native-owned timeouts (BC 6.2): `nfc.scanPassport` uses `params.timeoutMs`, default 120000. `camera.scanMRZ` uses `params.timeoutMs`, default 0. 0 means no timer. Every other method gets no native timer. When the timer ends, the request ends with `TIMEOUT` and `details.origin: "native"`.
- A cancel (BC 6.3) of a pending request ends it with `CANCELLED` and `details.origin: "native"`. A cancel of an unknown or finished request, and a second cancel, are ignored.
- Ending a request: the router runs the handler's stop action (`onStop`), then answers with the code when the handler answers or after 2000 ms, whichever is first. The handler's own outcome is dropped. A request with no stop action is answered at once. A stop action set after the request ended runs at once.
- `lifecycle.dismiss` ends every other pending request with `CANCELLED` before its handler runs.
- `cancelActiveScan(domain)` ends the scan of one domain, for the `nfc.cancelScan` and `camera.stopCamera` handlers. `cancelAll()` ends every pending request, for a host that closes the flow.
- `pageChanged()` (BC-Q36) runs each stop action and sends nothing more for the old page's requests.
- Error mapping (BC 7.2): `fail` with a `BridgeFailure` sends its error. Any other exception, also one thrown by the handler, is `INTERNAL_ERROR`, and the message names the exception class only. A `BridgeFailure` with a reason its code does not list cannot be made. A result that cannot be written as JSON is `INTERNAL_ERROR`.
- Each response and event carries major 2. `emit` is called under the router's lock, so it must not block.

What the router does not do yet: answer `lifecycle.getConfig` (step 10), send no event before the handshake (BC 5.5), check the page origin (the WebView host, step 16).

## Fixture runner

The runner is test code, in `src/test/kotlin/xyz/self/sdk/core/bridge/fixtures/`. The fixture format is in the README of `packages/bridge-schema`.

| Part                   | Does                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `FixtureLoader`        | Reads the fixture copies by the rules of the TypeScript loader.                                            |
| `FixturePlaceholders`  | Replaces an id label with a UUID and `"timestamp": 0` with a time.                                         |
| `FixtureSubject`       | The code under test: message bodies in, JSON texts out.                                                    |
| `FixtureRunner`        | Feeds each `send`, `native` and `advance` step to the subject and compares each `expect`.                  |
| `FixtureMatcher`       | Compares an emitted message with an `expect`. Its rules are in the README of `packages/bridge-schema`.     |
| `RouterFixtureSubject` | The router with fake handlers set up from `given`, and `ManualClock`. Defers a method with no handler yet. |
| `ManualClock`          | The fake clock. Timers fire only in `advance`, in time order.                                              |

A fixture ends as `Passed`, `Failed` or `Deferred`. `Deferred` means the subject could not run a step yet. It is not a pass.

`RouterFixtureSubject` sets up the router from the fixture's `given`:

- The domains and methods are those of the capability setup, read from its `handshake/<setup>` fixture. An unavailable domain is registered with its reason.
- A method in `given.provider` is a fake: it emits each `progress` entry as the domain's first event, then fails with the `fail` cause, or never finishes and stops when the router asks. The causes are in the README of `packages/bridge-schema`.
- `nfc.cancelScan` and `camera.stopCamera` call `cancelActiveScan` and succeed.
- Any other method defers the fixture, because its handler comes in a later step. A `native` step defers too.

`RouterFixtureTest` runs the groups `envelope`, `envelope-invalid`, `cancel`, `timeout`, `errors` and `version`. Each fixture passes, except 8 that stop at a step that needs a later handler: `lifecycle.ready`, `lifecycle.dismiss`, `lifecycle.getConfig` (step 10) and `nfc.getStatus`. The test lists each of them with the step and the reason. `EnvelopeFixtureTest` also checks that each `send` reads as the message it holds, and that the codec writes a message that matches each `expect`.

## Build, test and lint

```sh
./gradlew ktlintCheck
./gradlew testReleaseUnitTest
./gradlew assembleRelease
./gradlew ktlintFormat   # fix the format of hand-written files
```

CI runs the first three commands in `.github/workflows/native-sdk-ci.yml`.

The Gradle wrapper was generated with `gradle wrapper`. The settings, build file and placeholder sources were written by hand.
