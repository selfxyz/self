## Delegate Keychain to SDK Consumers

> Last updated: 2026-03-31
> Status: Done

- Workstream: native-shells-lite
- Backlog IDs: NSL-04
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

- SDK consumers (host apps) cannot control how or where secrets are stored. The native shells hardcode `EncryptedSharedPreferences` (Android) and Keychain Services (iOS) in `SecureStorageHandler`.
- Some consumers need custom keychain configurations, different encryption schemes, or integration with their existing secure storage infrastructure.
- You are defining a `SecureStorageProvider` protocol/interface that consumers must implement and pass via config. The native shell's `SecureStorageHandler` becomes a thin bridge delegate instead of owning the implementation.

### Scope

- `secureStorage` domain only (get/set/remove)
- Android native shell: `packages/native-shell-android/`
- iOS native shell: `packages/native-shell-ios/`
- Test apps: `packages/sdk-test-app/`

### Out of Scope

- `crypto` domain — stays native-managed
- `lifecycle` domain — unchanged
- `packages/webview-bridge/` — bridge protocol unchanged (secureStorage domain stays the same)
- `packages/webview-app/` — WebView code unchanged (still calls bridge the same way)
- `packages/mobile-sdk-alpha/` — SDK core unchanged
- `app/` — RN app unaffected
- `packages/kmp-sdk/` — KMP SDK unchanged (already has its own provider pattern)

### Implementation Steps

#### 1. Define `SecureStorageProvider` interface

**Android** — New file: `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SecureStorageProvider.kt`

```kotlin
interface SecureStorageProvider {
    fun get(key: String): String?
    fun set(key: String, value: String)
    fun remove(key: String)
}
```

**iOS** — New file: `packages/native-shell-ios/Sources/SelfNativeShell/API/SecureStorageProvider.swift`

```swift
public protocol SecureStorageProvider: AnyObject {
    func get(key: String) -> String?
    func set(key: String, value: String) throws
    func remove(key: String) throws
}
```

Reference: KMP SDK already has this pattern at `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/SecureStorageProvider.kt:7-18` (but with an extra `clear()` you are omitting).

#### 2. Add provider to SDK config

**Android** — New file: `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SelfSdkLaunchConfig.kt`

Android launches the SDK via Intent, which cannot carry interface references. You will introduce `SelfSdkLaunchConfig` that wraps the serializable `SelfSdkConfig` + non-serializable `SecureStorageProvider`. The serializable fields go through the Intent; the provider is stored in a companion object.

```kotlin
data class SelfSdkLaunchConfig(
    val config: SelfSdkConfig,
    val secureStorageProvider: SecureStorageProvider,
)
```

- `SelfSdkConfig` stays unchanged (serializable for Intent transport)
- `SelfSdk.launch()` signature changes to accept `SelfSdkLaunchConfig`
- Provider stored in companion object, config fields go through Intent extras

**iOS** — `packages/native-shell-ios/Sources/SelfNativeShell/API/SelfSdkConfig.swift`

- Add `public let secureStorageProvider: SecureStorageProvider` to `SelfSdkConfig`
- No serialization constraint on iOS

#### 3. Modify `SecureStorageHandler` to delegate

**Android** — `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/handlers/SecureStorageHandler.kt`

- Remove `EncryptedSharedPreferences` / `MasterKey` setup from `init`
- Constructor takes `SecureStorageProvider` instead of `Context`
- `get()` → `provider.get(key)`
- `set()` → `provider.set(key, value)`
- `remove()` → `provider.remove(key)`

**iOS** — `packages/native-shell-ios/Sources/SelfNativeShell/Handlers/SecureStorageHandler.swift`

- Remove direct Keychain (`Security` framework) calls
- Constructor takes `SecureStorageProvider`
- All methods delegate to provider

#### 4. Update SDK initialization

**Android** — `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/webview/SelfVerificationActivity.kt:45`

- Change: `router.register(SecureStorageHandler(this))` → `router.register(SecureStorageHandler(SelfSdk.secureStorageProvider!!))`
- Add validation: fail fast if provider is null

**Android** — `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SelfSdk.kt`

- Store provider in companion object alongside callback (line 17 pattern)
- Validate provider is set in `launch()` before starting Activity
- Update `launch()` signature:

```kotlin
fun launch(activity: Activity, launchConfig: SelfSdkLaunchConfig, requestCode: Int) {
    this.secureStorageProvider = launchConfig.secureStorageProvider
    // pass launchConfig.config fields via Intent extras (existing pattern)
}
```

**iOS** — `packages/native-shell-ios/Sources/SelfNativeShell/API/SelfSdk.swift:57`

- Change: `router.register(handler: SecureStorageHandler())` → `router.register(handler: SecureStorageHandler(provider: config.secureStorageProvider))`

#### 5. Remove built-in keychain dependencies

**Android:**

- Remove `androidx.security:security-crypto` dependency if no longer used elsewhere
- Remove `EncryptedSharedPreferences` and `MasterKey` imports from `SecureStorageHandler`

**iOS:**

- Remove `Security` framework import from `SecureStorageHandler`
- Remove `SecItemAdd`, `SecItemCopyMatching`, `SecItemDelete` calls

#### 6. Update sdk-test-app (consumer reference implementation)

The test app (`packages/sdk-test-app/`) is a minimal Jetpack Compose (Android) / SwiftUI (iOS) harness. It currently calls `SelfSdk.launch(this, config)` without providing any keychain. After this change, it must provide a `SecureStorageProvider`.

The test app will include a **reference implementation** of `SecureStorageProvider` that uses the same secure storage APIs the native shells currently use (effectively moving the implementation from the shell to the consumer).

**Android** — New file: `packages/sdk-test-app/android/app/src/main/kotlin/xyz/self/testapp/EncryptedPrefsStorageProvider.kt`

- Implements `SecureStorageProvider` using `EncryptedSharedPreferences` (same as current `SecureStorageHandler`)
- Used as reference for SDK consumers

**Android** — Update: `packages/sdk-test-app/android/app/src/main/kotlin/xyz/self/testapp/MainActivity.kt`

```kotlin
SelfSdk.launch(
    activity = this,
    launchConfig = SelfSdkLaunchConfig(
        config = config,
        secureStorageProvider = EncryptedPrefsStorageProvider(this),
    ),
    requestCode = REQUEST_CODE,
)
```

**iOS** — New file: `packages/sdk-test-app/ios/SelfTestApp/KeychainStorageProvider.swift`

- Implements `SecureStorageProvider` using iOS Keychain (same as current `SecureStorageHandler`)
- Used as reference for SDK consumers

**iOS** — Update: `packages/sdk-test-app/ios/SelfTestApp/ContentView.swift`

- Pass `secureStorageProvider: KeychainStorageProvider()` in `SelfSdkConfig`

**Android build.gradle** — `packages/sdk-test-app/android/app/build.gradle.kts`

- Add `androidx.security:security-crypto` dependency (moved from native shell)

### Files Created

| File                                                                                                  | Purpose                                         |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SecureStorageProvider.kt`             | Interface definition                            |
| `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SelfSdkLaunchConfig.kt`               | Wraps SelfSdkConfig + SecureStorageProvider     |
| `packages/native-shell-ios/Sources/SelfNativeShell/API/SecureStorageProvider.swift`                   | Protocol definition                             |
| `packages/sdk-test-app/android/app/src/main/kotlin/xyz/self/testapp/EncryptedPrefsStorageProvider.kt` | Reference impl using EncryptedSharedPreferences |
| `packages/sdk-test-app/ios/SelfTestApp/KeychainStorageProvider.swift`                                 | Reference impl using iOS Keychain               |

### Files Modified

| File                                                                                             | Change                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/api/SelfSdk.kt`                      | Change `launch()` to accept `SelfSdkLaunchConfig`       |
| `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/handlers/SecureStorageHandler.kt`    | Delegate to provider, remove EncryptedSharedPreferences |
| `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/webview/SelfVerificationActivity.kt` | Pass provider to handler                                |
| `packages/native-shell-ios/Sources/SelfNativeShell/API/SelfSdkConfig.swift`                      | Add `secureStorageProvider` property                    |
| `packages/native-shell-ios/Sources/SelfNativeShell/API/SelfSdk.swift`                            | Pass provider to handler                                |
| `packages/native-shell-ios/Sources/SelfNativeShell/Handlers/SecureStorageHandler.swift`          | Delegate to provider, remove Keychain calls             |
| `packages/sdk-test-app/android/app/src/main/kotlin/xyz/self/testapp/MainActivity.kt`             | Use SelfSdkLaunchConfig with provider                   |
| `packages/sdk-test-app/android/app/build.gradle.kts`                                             | Add security-crypto dependency                          |
| `packages/sdk-test-app/ios/SelfTestApp/ContentView.swift`                                        | Pass provider in SelfSdkConfig                          |

### Files NOT Modified

- `packages/webview-bridge/` — Bridge protocol unchanged
- `packages/webview-app/` — WebView code unchanged
- `packages/mobile-sdk-alpha/` — SDK core unchanged
- `app/` — RN app unaffected
- `packages/kmp-sdk/` — KMP SDK unchanged
- Crypto domain handlers — Stay native-managed

### Preconditions

- NSL-01 (Android shell) complete
- NSL-02 (iOS shell) complete
- NSL-03 (Test apps) complete

### Validation

```bash
# Android native shell
cd packages/native-shell-android && ./gradlew assembleDebug

# iOS native shell
cd packages/native-shell-ios && swift build

# Android test app
cd packages/sdk-test-app/android && ./gradlew :app:assembleDebug

# iOS test app
cd packages/sdk-test-app/ios && xcodegen generate && xcodebuild -project SelfTestApp.xcodeproj -scheme SelfTestApp -sdk iphonesimulator build

# Negative test: temporarily remove provider from test app launch call → verify compile error (provider is required)

# E2E: complete a verification flow in test app, confirm documents persist across sessions (proving keychain write/read works through provider)
```

### Definition of Done

- [ ] `SecureStorageProvider` interface exists on both platforms
- [ ] `SecureStorageHandler` delegates to provider on both platforms
- [ ] Built-in keychain dependencies removed from native shells
- [ ] `SelfSdk.launch()` requires provider via `SelfSdkLaunchConfig` (Android) / `SelfSdkConfig` (iOS)
- [ ] Test app includes reference implementations and builds on both platforms
- [ ] Compile error if consumer omits provider (fail closed)
- [ ] E2E verification flow works through the delegated provider
- [ ] Backlog row updated
- [ ] Plan status updated

### Estimated PR Size

~500–700 LOC changed. Within the 1k–3k target.

### Status Log

- 2026-03-31: Plan created.
- 2026-03-31: Implementation complete. All files created/modified per spec.
