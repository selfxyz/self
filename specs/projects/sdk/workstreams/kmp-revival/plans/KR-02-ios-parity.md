## Scope KMP iOS to 3-Domain Native Shell Parity

> Last updated: 2026-04-01
> Status: Ready

- Workstream: kmp-revival
- Backlog IDs: KR-02
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

After KR-01, provider interfaces and `SdkProviderRegistry` live in `commonMain`, and `CryptoBridgeHandler` is shared. The iOS target benefits from these moves automatically, but still needs work: the WebView provider doesn't pass query params, handler registration is still wide (all 9 handlers), `isConfigured()` no longer requires all 8 providers (fixed in KR-01), and the iOS `SecureStorageBridgeHandler` has the same bare-value `get()` response bug as Android had.

You are scoping KMP iOS to 3-domain parity with native-shell-ios.

### Scope

- `packages/kmp-sdk/` (iOS target: `iosMain`)
- `packages/self-sdk-swift/` (Swift provider implementations — query param support)
- 3 bridge domains: `secureStorage`, `crypto`, `lifecycle`
- Query param support for WebView URL loading

### Out of Scope

- Android target (done in KR-01)
- `packages/native-shell-ios/` — do not modify
- `packages/webview-bridge/` — bridge protocol unchanged
- `packages/webview-app/` — WebView code unchanged
- NFC, Camera, Biometric provider code in self-sdk-swift — retain but do not require registration

### Implementation Steps

#### 1. Fix SecureStorageBridgeHandler get() response shape (iOS)

**File:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/SecureStorageBridgeHandler.kt`

**Current (line 44):** Returns `if (value != null) JsonPrimitive(value) else JsonNull` — bare primitive, same bug as Android had pre-KR-01.

**Required:** The TypeScript adapter at `webview-bridge/src/adapters/storage.ts:16` does `result?.value ?? null` — expects `{ value: string | null }`.

**Change:**

```kotlin
// Before (line 44)
return if (value != null) JsonPrimitive(value) else JsonNull

// After
return buildJsonObject {
    put("value", if (value != null) JsonPrimitive(value) else JsonNull)
}
```

Add import: `import kotlinx.serialization.json.buildJsonObject`

**Note:** After KR-01, the Android handler was fully rewritten to delegate via provider. The iOS handler already delegates via `SdkProviderRegistry.secureStorage` — only the response shape needs fixing.

**Alternative:** If both handlers are identical after this fix (same provider delegation, same response shape), consider moving `SecureStorageBridgeHandler` to `commonMain` to eliminate duplication. Check whether the iOS handler's `clear()` method is needed (Android handler has it, native-shell-android does not).

#### 2. Add query param support to WebViewProviderImpl

**File:** `packages/self-sdk-swift/Sources/SelfSdkSwift/WebViewProviderImpl.swift`

**Current:** `createWebView(onMessageReceived:isDebugMode:)` loads `Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "self-sdk-web")` without appending query params.

**Required:** native-shell-ios passes verification config as query params via `URLComponents`:

```swift
var components = URLComponents(url: fileURL, resolvingAgainstBaseURL: false)
components?.query = queryParams
```

**Change the method signature:**

```swift
// Before
@objc(createWebViewOnMessageReceived:isDebugMode:)
public func createWebView(onMessageReceived: @escaping (String) -> Void,
                         isDebugMode: Bool) -> UIView

// After
@objc(createWebViewOnMessageReceived:isDebugMode:queryParams:)
public func createWebView(onMessageReceived: @escaping (String) -> Void,
                         isDebugMode: Bool,
                         queryParams: String? = nil) -> UIView
```

**Update the URL loading logic** to append query params when provided:

```swift
if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "self-sdk-web") {
    var targetURL = htmlURL
    if let params = queryParams, !params.isEmpty {
        var components = URLComponents(url: htmlURL, resolvingAgainstBaseURL: false)
        components?.query = params
        targetURL = components?.url ?? htmlURL
    }
    wv.loadFileURL(targetURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
}
```

Apply the same pattern to the debug URL (`http://localhost:5173`).

#### 3. Update WebViewProvider interface and IosWebViewHost

**File:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/webview/IosWebViewHost.kt`

**Current (lines 18-29):** `createWebView()` calls `provider.createWebView(onMessageReceived, isDebugMode)` with no query params.

**Update `WebViewProvider` interface** (in `iosMain/kotlin/xyz/self/sdk/providers/WebViewProvider.kt` or wherever it's defined) to add the query param:

```kotlin
interface WebViewProvider {
    fun createWebView(
        onMessageReceived: (String) -> Unit,
        isDebugMode: Boolean,
        queryParams: String? = null,
    ): UIView
}
```

**Update `IosWebViewHost`** to forward query params from the `VerificationRequest`:

```kotlin
fun createWebView(queryParams: String? = null): UIView {
    val provider = SdkProviderRegistry.webView
        ?: throw IllegalStateException("WebView provider not configured")
    return provider.createWebView(
        onMessageReceived = { message -> router.onMessageReceived(message) },
        isDebugMode = isDebugMode,
        queryParams = queryParams,
    )
}
```

#### 4. Scope handler registration to 3 domains

**File:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/api/SelfSdk.ios.kt`

**Current (lines 145-158) registers 9 handlers:**

```kotlin
router.register(BiometricBridgeHandler())
router.register(SecureStorageBridgeHandler())
router.register(CryptoBridgeHandler())
router.register(HapticBridgeHandler())
router.register(AnalyticsBridgeHandler())
router.register(lifecycleHandler)
router.register(DocumentsBridgeHandler())
router.register(CameraMrzBridgeHandler())
router.register(NfcBridgeHandler(router))
```

**Change to 3 handlers:**

```kotlin
router.register(SecureStorageBridgeHandler())
router.register(CryptoBridgeHandler())  // now from commonMain after KR-01
router.register(lifecycleHandler)
```

Remove unused handler imports.

#### 5. Handle missing optional providers gracefully

After KR-01, `SdkProviderRegistry.isConfigured()` only requires `secureStorage` and `crypto`. But the remaining iOS handler files (Biometric, Haptic, etc.) still reference their providers. Since we're not registering those handlers, this is safe — but verify:

- The remaining handler files in `iosMain/handlers/` (BiometricBridgeHandler, HapticBridgeHandler, AnalyticsBridgeHandler, DocumentsBridgeHandler, CameraMrzBridgeHandler, NfcBridgeHandler) should still compile even though their providers may be nil. Since they're not registered, they won't be invoked.
- If any of them are referenced at import time and cause initialization issues, add `@Suppress("unused")` or ensure they're only instantiated in the registration block.

#### 6. Build query params from VerificationRequest

**File:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/api/SelfSdk.ios.kt`

The launch flow receives a `VerificationRequest`. Build query params from it and pass to `IosWebViewHost.createWebView(queryParams)`.

Reference the native-shell-ios `SelfSdkConfig.toQueryParams()` pattern for the field list. The KMP already has structured types, so use those rather than raw string extras.

### Files Modified

| File                                                            | Change                                                |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `shared/src/iosMain/.../handlers/SecureStorageBridgeHandler.kt` | Fix `get()` response shape to `{ value: ... }`        |
| `packages/self-sdk-swift/.../WebViewProviderImpl.swift`         | Add `queryParams` parameter, append to URL            |
| `shared/src/iosMain/.../webview/IosWebViewHost.kt`              | Forward query params to provider                      |
| `shared/src/iosMain/.../providers/WebViewProvider.kt`           | Add `queryParams` to interface                        |
| `shared/src/iosMain/.../api/SelfSdk.ios.kt`                     | Register only 3 handlers, build and pass query params |

### Files NOT Modified

- `packages/native-shell-ios/` — sibling, serves different consumers
- `packages/webview-bridge/` — bridge protocol unchanged
- `packages/webview-app/` — WebView code unchanged
- Self-sdk-swift crypto/secureStorage providers — already match native-shell-ios functionality
- `commonMain` files — already updated in KR-01

### Preconditions

- KR-01 complete (provider interfaces, SdkProviderRegistry, CryptoBridgeHandler in commonMain, MessageRouter version check)
- `packages/webview-app/` builds and `dist/` output exists

### Validation

```bash
# Build KMP iOS framework
cd packages/kmp-sdk && ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64

# Build XCFramework
cd packages/kmp-sdk && ./gradlew createXCFramework

# Build self-sdk-swift
cd packages/self-sdk-swift && swift build

# Run KMP common tests (includes shared handler tests)
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Verify SecureStorage response shape
# Add unit test: iOS SecureStorageBridgeHandler.get() returns JsonObject with "value" key
```

### Definition of Done

- [ ] iOS `SecureStorageBridgeHandler.get()` returns `{ value: string | null }` matching TypeScript adapter
- [ ] `WebViewProviderImpl.createWebView()` accepts and appends query params
- [ ] `IosWebViewHost` forwards query params from verification request
- [ ] `WebViewProvider` interface includes `queryParams` parameter
- [ ] Only 3 handlers registered on iOS (SecureStorage, Crypto, Lifecycle)
- [ ] SDK does not crash if optional providers (NFC, Camera, etc.) are not registered
- [ ] Query params built from VerificationRequest and passed to WebView
- [ ] XCFramework builds cleanly
- [ ] self-sdk-swift builds cleanly
- [ ] All jvmTest tests pass

### Estimated PR Size

~200–300 LOC changed. Within the 1k–3k target.

### Status Log

- 2026-03-31: Plan created.
- 2026-04-01: Updated to reflect KR-01 provider delegation changes. CryptoBridgeHandler now comes from commonMain. SdkProviderRegistry isConfigured() already fixed. SecureStorage response shape bug confirmed on iOS. Added query param building from VerificationRequest.
