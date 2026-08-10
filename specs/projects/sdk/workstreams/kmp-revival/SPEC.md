# KMP Revival — Implementation Spec

> Last updated: 2026-04-01
> Owner: SDK / Platform
> Parent: `../../OVERVIEW.md`
> Status: Active

## Purpose

- You are reviving the KMP SDK (`packages/kmp-sdk/`) to provide a native shell option for consumers who already use Kotlin Multiplatform in their apps.
- Native-shells-lite (`packages/native-shell-android/`, `packages/native-shell-ios/`) remains the option for consumers using plain Kotlin (Android) or plain Swift (iOS).
- Both deliver the same 3-domain scope and satisfy the same bridge contract. The difference is the integration surface: KMP `expect`/`actual` with provider registry vs. standalone platform libraries.
- NSL-04 (delegate keychain to consumers) is already solved in KMP iOS via `SdkProviderRegistry`. KR-01 extends this to Android by moving provider interfaces to `commonMain` and shipping default Android implementations (`EncryptedSharedPreferencesProvider`, `AndroidKeystoreCryptoProvider`) that consumers can use out of the box or replace.
- Done when the KMP SDK builds, handles the 3 required bridge domains, produces publishable artifacts (AAR + XCFramework), and a test app exercises the full WebView flow.

## Why Offer a KMP Option

| Dimension        | KMP SDK                                                       | Native Shells Lite                            |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Target consumer  | Apps using Kotlin Multiplatform                               | Pure Kotlin (Android) / pure Swift (iOS) apps |
| Provider pattern | Built-in via `SdkProviderRegistry` (both platforms)           | NSL-04 adds it (~500-700 LOC)                 |
| Test coverage    | ~10 test files                                                | Zero tests (pending)                          |
| Publishing setup | `maven-publish` configured                                    | None yet                                      |
| Result types     | Strongly-typed `VerificationResult` + `SelfSdkError`          | Raw JSON string                               |
| Config model     | Separated `SelfSdkConfig` + `VerificationRequest`             | Flat config with 15+ params                   |
| Extra handlers   | NFC, camera, biometrics available (not registered by default) | 3 domains only                                |

Both options are valid. KMP has more infrastructure already built; native-shells-lite is simpler for non-KMP consumers.

## Scope

- Scope KMP to the same 3 bridge domains as native-shells-lite: `secureStorage`, `crypto`, `lifecycle`
- Unify provider delegation across both platforms: move `SecureStorageProvider` and `CryptoProvider` interfaces to `commonMain`, add `SdkProviderRegistry` to `commonMain`, ship default Android implementations
- Strip NFC, camera, biometric handler registration and their dependencies (not needed for current delivery; retain code for future)
- Close the small gaps where native shells have features KMP lacks (WebChromeClient, query params, response shapes, protocol version validation)
- Validate build artifacts and test app

## Out of Scope

- NFC, camera, biometrics, haptic, analytics, documents, navigation handler registration (retain code but do not register)
- Changes to native-shells-lite (`packages/native-shell-android/`, `packages/native-shell-ios/`)
- WebView app changes (`packages/webview-app/`)
- Bridge protocol changes (`packages/webview-bridge/`)
- RN app changes (`app/`)
- `mobile-sdk-alpha` changes

## Invariants

- Bridge protocol v1 is the only coupling between native and WebView.
- Keychain/keystore is always native-managed. No web fallbacks for secure storage.
- Both platforms delegate secureStorage and crypto to consumer-provided providers via `SdkProviderRegistry`. Android ships default implementations; consumers can replace them.
- Response JSON shapes must match what `webview-bridge/src/adapters/crypto.ts` and `storage.ts` expect.
- No regressions to existing KMP test suite (`./gradlew :shared:jvmTest`).

## Dependencies

| Depends On                 | Type                       | Status | Notes                                      |
| -------------------------- | -------------------------- | ------ | ------------------------------------------ |
| `packages/webview-bridge/` | Upstream (bridge protocol) | Done   | Defines message shapes and transport names |
| `packages/webview-app/`    | Upstream (WebView bundle)  | Active | KMP loads this bundle                      |
| Build pipeline (BP-01)     | Downstream                 | Done   | Copies webview-app dist into native assets |

## Backlog

| ID    | Title                                                         | Status | Priority | Depends On   | Plan                                                                         | Est. LOC |
| ----- | ------------------------------------------------------------- | ------ | -------- | ------------ | ---------------------------------------------------------------------------- | -------- |
| KR-01 | Scope KMP Android to 3-domain parity with provider delegation | Ready  | High     | -            | [plans/KR-01-android-parity.md](./plans/KR-01-android-parity.md)             | ~600-900 |
| KR-02 | Scope KMP iOS to 3-domain native shell parity                 | Ready  | High     | -            | [plans/KR-02-ios-parity.md](./plans/KR-02-ios-parity.md)                     | ~200-300 |
| KR-03 | Validate build artifacts and test app                         | Ready  | Medium   | KR-01, KR-02 | [plans/KR-03-validate-and-publish.md](./plans/KR-03-validate-and-publish.md) | ~200     |
| KR-04 | Scope pass — KMP as the app's own WebView host framework      | Ready  | Medium   | -            | [plans/KR-04-app-host-scope-pass.md](./plans/KR-04-app-host-scope-pass.md)   | ~50 doc  |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Completion Checklist

- [ ] Provider interfaces (`SecureStorageProvider`, `CryptoProvider`) live in `commonMain`
- [ ] `SdkProviderRegistry` lives in `commonMain` with platform-scoped defaults
- [ ] Android ships default providers (`EncryptedSharedPreferencesProvider`, `AndroidKeystoreCryptoProvider`)
- [ ] KMP Android builds with 3-domain scope
- [ ] KMP iOS builds with 3-domain scope
- [ ] All existing KMP tests pass
- [ ] Test app exercises full WebView flow on both platforms
- [ ] AAR + XCFramework artifacts produce clean builds
- [ ] OVERVIEW.md module table updated (KMP: Active alongside native-shells-lite)

## Reference Implementations

| What                               | Source                                                                    | Notes                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Bridge protocol (message shapes)   | `packages/webview-bridge/src/types.ts`                                    | Canonical — native must match                                                                            |
| Storage adapter expectations       | `packages/webview-bridge/src/adapters/storage.ts:15-18`                   | `get()` returns `{ value: string \| null }`                                                              |
| Crypto adapter expectations        | `packages/webview-bridge/src/adapters/crypto.ts`                          | Defines request params and response shapes                                                               |
| CryptoHandler (Android ref)        | `packages/native-shell-android/.../handlers/CryptoHandler.kt`             | Reference for default `AndroidKeystoreCryptoProvider` — uses AndroidKeyStore, secp256r1, SHA256withECDSA |
| SecureStorageHandler (Android ref) | `packages/native-shell-android/.../handlers/SecureStorageHandler.kt`      | Reference for provider-delegated handler — wraps `get()` in `{ value: ... }`                             |
| WebChromeClient                    | `packages/native-shell-android/.../webview/AndroidWebViewHost.kt:109-173` | Port permission + file upload handling                                                                   |
| iOS provider registry              | `packages/kmp-sdk/.../iosMain/.../providers/SdkProviderRegistry.kt`       | Current iOS-only registry — move to commonMain                                                           |
| iOS CryptoBridgeHandler            | `packages/kmp-sdk/.../iosMain/.../handlers/CryptoBridgeHandler.kt`        | Provider-delegated crypto — reuse pattern for both platforms                                             |

## Bridge Domain Contract

Only 3 domains are registered by the scoped KMP:

### `secureStorage`

| Method   | Params                           | Response                    |
| -------- | -------------------------------- | --------------------------- |
| `get`    | `{ key: string }`                | `{ value: string \| null }` |
| `set`    | `{ key: string, value: string }` | `null`                      |
| `remove` | `{ key: string }`                | `null`                      |

### `crypto`

| Method         | Params                                              | Response                            |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| `generateKey`  | `{ keyRef: string }`                                | `{ keyRef: string, success: true }` |
| `getPublicKey` | `{ keyRef: string }`                                | `{ publicKey: string }` (base64)    |
| `sign`         | `{ data: string, keyRef: string }` (data is base64) | `{ signature: string }` (base64)    |

### `lifecycle`

| Method      | Params                                                | Response                                  |
| ----------- | ----------------------------------------------------- | ----------------------------------------- |
| `ready`     | `{}`                                                  | `null` (no-op)                            |
| `dismiss`   | `{ reason?: string }`                                 | `null` (finishes Activity / dismisses VC) |
| `setResult` | `{ success: bool, userId?, verificationId?, error? }` | `null` (forwards to host, then finishes)  |

Any other domain request returns a `DOMAIN_NOT_FOUND` error response.

## Related Specs

| Spec                                                             | Relationship                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| [SDK Overview](../../OVERVIEW.md)                                | Parent architecture                                            |
| [Native Shells Lite](../native-shells-lite/SPEC.md)              | Sibling — serves non-KMP consumers                             |
| [Paused Native Shells (KMP)](../../paused/native-shells/SPEC.md) | Historical KMP work — validated foundation                     |
| [Build Pipeline](../build-pipeline/SPEC.md)                      | Downstream — bundles webview-app into native assets            |
| [SDK Distribution — SD-06](../sdk-distribution/SPEC.md)          | Downstream — remote publishing after KR-03 validates artifacts |
