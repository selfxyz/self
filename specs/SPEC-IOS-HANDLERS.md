# Person 2 (continued): iOS Native Handlers — Swift Wrapper Pattern

## Overview

This spec covers completing iOS handler support for the KMP SDK. The original approach (Kotlin/Native cinterop with Apple frameworks) is **abandoned** due to Xcode SDK compatibility issues that blocked compilation. Instead, we use the **Swift wrapper pattern** already proven in the test app.

**Approach**: Define Kotlin provider/factory interfaces in `iosMain`. Provide a Swift companion package (`SelfSdkSwift/`) with default implementations that host apps include alongside the XCFramework. Host apps register Swift implementations at startup, and the SDK calls them through the factory interfaces.

**Prerequisite**: [SPEC-KMP-SDK.md](./SPEC-KMP-SDK.md) chunks 2A–2C (complete).

---

## Architecture: Swift Wrapper Pattern

### How It Works Today (Test App)

The test app already demonstrates this pattern for NFC and Camera:

1. **Kotlin side** (`iosMain`): Factory singleton with a nullable provider interface
   ```kotlin
   // In kmp-test-app/composeApp/src/iosMain/
   interface NfcScanViewFactory {
       fun scanPassport(passportNumber: String, dateOfBirth: String, dateOfExpiry: String,
           onProgress: (Any) -> Unit, onComplete: (Any) -> Unit, onError: (String) -> Unit)
   }
   object NfcScanFactory {
       var instance: NfcScanViewFactory? = null
   }
   ```

2. **Swift side** (`iosApp/`): Implementation registered at app startup
   ```swift
   // NfcScanFactoryImpl.swift
   class NfcScanFactoryImpl: NSObject, NfcScanViewFactory {
       static func register() {
           NfcScanFactory.shared.instance = NfcScanFactoryImpl()
       }
       func scanPassport(...) { /* calls NfcPassportHelper */ }
   }

   // iOSApp.swift
   @main struct iOSApp: App {
       init() {
           NfcScanFactoryImpl.register()
           MrzCameraFactoryImpl.register()
       }
   }
   ```

### What Changes

Move factory interfaces **into the SDK** (`kmp-sdk/shared/src/iosMain/`), not the test app. The SDK's iOS handlers call the registered factories instead of throwing `NotImplementedError`. A new Swift companion package (`SelfSdkSwift/`) provides default implementations.

### Key Design Principles

- **cinterop stays disabled** — `build.gradle.kts` lines 32–62 remain commented out
- **No new Kotlin/Native framework dependencies** — all Apple framework calls happen in Swift
- **Callback-based APIs** — Swift closures bridge to Kotlin `suspend` functions via `suspendCancellableCoroutine`
- **Main thread safety** — Swift callbacks dispatch to main queue before calling Kotlin
- **ARC lifecycle management** — Swift factory impls retain helpers during async operations (prevents premature deallocation)

---

## Directory Structure

```
packages/kmp-sdk/
  shared/src/iosMain/kotlin/xyz/self/sdk/
    providers/                              # NEW — Factory interfaces for all handlers
      NfcProvider.kt                        # NFC passport scanning
      BiometricProvider.kt                  # Face ID / Touch ID
      SecureStorageProvider.kt              # Keychain access
      CryptoProvider.kt                     # Key generation, signing
      CameraMrzProvider.kt                  # MRZ camera scanning
      HapticProvider.kt                     # Vibration feedback
      DocumentsProvider.kt                  # Encrypted document storage
      WebViewProvider.kt                    # WKWebView hosting
      SdkProviderRegistry.kt               # Central registry for all providers
    handlers/                               # REWRITE — Use providers instead of stubs
      NfcBridgeHandler.kt
      BiometricBridgeHandler.kt
      SecureStorageBridgeHandler.kt
      CryptoBridgeHandler.kt
      CameraMrzBridgeHandler.kt
      HapticBridgeHandler.kt
      AnalyticsBridgeHandler.kt             # Stays as fire-and-forget (no provider needed)
      LifecycleBridgeHandler.kt
      DocumentsBridgeHandler.kt
    webview/
      IosWebViewHost.kt                     # REWRITE — Uses WebViewProvider
    api/
      SelfSdk.ios.kt                        # UPDATE — Uses SdkProviderRegistry

packages/self-sdk-swift/                    # NEW — Swift companion package
  Package.swift                             # SPM package definition
  Sources/SelfSdkSwift/
    SelfSdkSwift.swift                      # Public setup API: SelfSdkSwift.configure()
    Providers/
      NfcProviderImpl.swift                 # Wraps NfcPassportHelper
      BiometricProviderImpl.swift           # LAContext wrapper
      SecureStorageProviderImpl.swift        # Keychain wrapper
      CryptoProviderImpl.swift              # SecKey wrapper
      CameraMrzProviderImpl.swift           # Wraps MrzCameraHelper
      HapticProviderImpl.swift              # UIImpactFeedbackGenerator
      DocumentsProviderImpl.swift           # Encrypted file storage
      WebViewProviderImpl.swift             # WKWebView wrapper
    Helpers/
      NfcPassportHelper.swift               # MOVE from test app (274 lines)
      MrzCameraHelper.swift                 # MOVE from test app (322 lines)
```

---

## Chunk 3A: Factory Infrastructure

**Goal**: Define all provider interfaces in the SDK and create the Swift companion package skeleton.

### Step 1: Provider Interfaces (Kotlin `iosMain`)

#### `SdkProviderRegistry.kt`

Central registry that all providers register into. The SDK checks this before attempting operations.

```kotlin
package xyz.self.sdk.providers

/**
 * Central registry for iOS native provider implementations.
 * Swift companion package calls SdkProviderRegistry.configure() at app startup.
 */
object SdkProviderRegistry {
    var nfc: NfcProvider? = null
    var biometric: BiometricProvider? = null
    var secureStorage: SecureStorageProvider? = null
    var crypto: CryptoProvider? = null
    var cameraMrz: CameraMrzProvider? = null
    var haptic: HapticProvider? = null
    var documents: DocumentsProvider? = null
    var webView: WebViewProvider? = null

    /**
     * Returns true if all required providers are registered.
     * Analytics and Lifecycle don't need external providers.
     */
    fun isConfigured(): Boolean = nfc != null && biometric != null &&
        secureStorage != null && crypto != null && cameraMrz != null &&
        documents != null && webView != null
}
```

#### `NfcProvider.kt`

```kotlin
package xyz.self.sdk.providers

/**
 * Provider interface for iOS NFC passport scanning.
 * Swift implementation wraps NFCPassportReader library.
 */
interface NfcProvider {
    /**
     * Check if NFC passport reading is available on this device.
     */
    fun isAvailable(): Boolean

    /**
     * Scan a passport via NFC.
     * @param passportNumber 9-character passport number (padded with '<')
     * @param dateOfBirth YYMMDD format
     * @param dateOfExpiry YYMMDD format
     * @param onProgress Called with (stateIndex: Int, percent: Int, message: String)
     * @param onComplete Called with (success: Boolean, jsonResult: String)
     *   jsonResult contains PassportScanResult-compatible JSON on success, error message on failure.
     */
    fun scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: (stateIndex: Int, percent: Int, message: String) -> Unit,
        onComplete: (success: Boolean, jsonResult: String) -> Unit,
    )

    /**
     * Cancel any in-progress scan.
     */
    fun cancelScan()
}
```

#### `BiometricProvider.kt`

```kotlin
package xyz.self.sdk.providers

interface BiometricProvider {
    fun isAvailable(): Boolean
    fun getBiometryType(): String  // "faceId", "touchId", or "none"
    fun authenticate(
        reason: String,
        onResult: (success: Boolean, error: String?) -> Unit,
    )
}
```

#### `SecureStorageProvider.kt`

```kotlin
package xyz.self.sdk.providers

interface SecureStorageProvider {
    fun get(key: String): String?
    fun set(key: String, value: String)
    fun remove(key: String)
}
```

#### `CryptoProvider.kt`

```kotlin
package xyz.self.sdk.providers

interface CryptoProvider {
    fun generateKey(keyRef: String)
    fun getPublicKey(keyRef: String): String?  // Base64-encoded public key
    fun sign(keyRef: String, data: String): String?  // Base64-encoded signature
    fun deleteKey(keyRef: String)
}
```

#### `CameraMrzProvider.kt`

```kotlin
package xyz.self.sdk.providers

import platform.UIKit.UIView

interface CameraMrzProvider {
    fun isAvailable(): Boolean
    fun createCameraView(
        onMrzDetected: (jsonResult: String) -> Unit,
        onProgress: (stateIndex: Int) -> Unit,
        onError: (error: String) -> Unit,
    ): UIView
    fun stopCamera()
}
```

#### `HapticProvider.kt`

```kotlin
package xyz.self.sdk.providers

interface HapticProvider {
    fun impact(style: String)  // "light", "medium", "heavy"
    fun notification(type: String)  // "success", "warning", "error"
    fun selection()
}
```

#### `DocumentsProvider.kt`

```kotlin
package xyz.self.sdk.providers

interface DocumentsProvider {
    fun get(key: String): String?
    fun set(key: String, value: String)
    fun remove(key: String)
    fun list(): List<String>
}
```

#### `WebViewProvider.kt`

```kotlin
package xyz.self.sdk.providers

import platform.UIKit.UIView
import platform.UIKit.UIViewController

interface WebViewProvider {
    /**
     * Create a WKWebView configured for the SDK bridge.
     * @param onMessageReceived Called when WebView sends a bridge message (raw JSON string)
     * @param isDebugMode If true, load from localhost dev server
     * @return The WKWebView as UIView
     */
    fun createWebView(
        onMessageReceived: (String) -> Unit,
        isDebugMode: Boolean,
    ): UIView

    /**
     * Evaluate JavaScript in the WebView.
     */
    fun evaluateJs(js: String)

    /**
     * Get a UIViewController that wraps the WebView for modal presentation.
     */
    fun getViewController(): UIViewController
}
```

### Step 2: Swift Companion Package Skeleton

#### `packages/self-sdk-swift/Package.swift`

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SelfSdkSwift",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "SelfSdkSwift", targets: ["SelfSdkSwift"]),
    ],
    dependencies: [
        .package(url: "https://github.com/AcroMace/NFCPassportReader", branch: "main"),
    ],
    targets: [
        .target(
            name: "SelfSdkSwift",
            dependencies: ["NFCPassportReader"],
            path: "Sources/SelfSdkSwift"
        ),
    ]
)
```

#### `SelfSdkSwift.swift` — Public Setup API

```swift
import Foundation
import SelfSdk  // KMP XCFramework

public class SelfSdkSwift {
    /// Call this at app startup to register all default Swift provider implementations.
    /// After calling this, SelfSdk.launch() will work on iOS.
    public static func configure() {
        let registry = SdkProviderRegistry.shared
        registry.nfc = NfcProviderImpl()
        registry.biometric = BiometricProviderImpl()
        registry.secureStorage = SecureStorageProviderImpl()
        registry.crypto = CryptoProviderImpl()
        registry.cameraMrz = CameraMrzProviderImpl()
        registry.haptic = HapticProviderImpl()
        registry.documents = DocumentsProviderImpl()
        registry.webView = WebViewProviderImpl()
    }
}
```

### Step 3: Update `SelfSdk.ios.kt`

Update the `launch()` method to check `SdkProviderRegistry.isConfigured()` and throw a clear error if not:

```kotlin
actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
    check(SdkProviderRegistry.isConfigured()) {
        "SelfSdk iOS requires Swift providers. Call SelfSdkSwift.configure() at app startup. " +
        "See: https://docs.self.xyz/sdk/ios-setup"
    }
    // ... proceed with WebView launch using registered providers
}
```

### Validation

- `./gradlew :shared:compileKotlinIosArm64` compiles (no cinterop needed for interfaces)
- Swift companion package skeleton builds with `swift build`
- Provider interfaces are visible from Swift via XCFramework exports

---

## Chunk 3B: Biometric, SecureStorage, Haptic Handlers

**Goal**: Implement the 3 simplest handlers end-to-end (Kotlin handler + Swift provider).

### Biometric Handler (Kotlin side)

Rewrite `iosMain/handlers/BiometricBridgeHandler.kt` to delegate to provider:

```kotlin
class BiometricBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.biometric
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Biometric provider not registered")

        return when (method) {
            "authenticate" -> authenticate(provider, params)
            "isAvailable" -> JsonPrimitive(provider.isAvailable())
            "getBiometryType" -> JsonPrimitive(provider.getBiometryType())
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown biometrics method: $method")
        }
    }

    private suspend fun authenticate(provider: BiometricProvider, params: Map<String, JsonElement>): JsonElement {
        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate"
        return suspendCancellableCoroutine { cont ->
            provider.authenticate(reason) { success, error ->
                if (success) {
                    cont.resume(JsonPrimitive(true))
                } else {
                    cont.resumeWithException(
                        BridgeHandlerException("BIOMETRIC_ERROR", error ?: "Authentication failed")
                    )
                }
            }
        }
    }
}
```

### Biometric Provider (Swift side)

```swift
// Sources/SelfSdkSwift/Providers/BiometricProviderImpl.swift
import LocalAuthentication
import SelfSdk

class BiometricProviderImpl: NSObject, BiometricProvider {
    func isAvailable() -> Bool {
        let context = LAContext()
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    func getBiometryType() -> String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "faceId"
        case .touchID: return "touchId"
        default: return "none"
        }
    }

    func authenticate(reason: String, onResult: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                onResult(success, error?.localizedDescription)
            }
        }
    }
}
```

### SecureStorage Handler (Kotlin side)

```kotlin
class SecureStorageBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.secureStorage
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not registered")

        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        return when (method) {
            "get" -> {
                val value = provider.get(key)
                if (value != null) JsonPrimitive(value) else JsonNull
            }
            "set" -> {
                val value = params["value"]?.jsonPrimitive?.content
                    ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")
                provider.set(key, value)
                null
            }
            "remove" -> {
                provider.remove(key)
                null
            }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown secureStorage method: $method")
        }
    }
}
```

### SecureStorage Provider (Swift side)

```swift
// Sources/SelfSdkSwift/Providers/SecureStorageProviderImpl.swift
import Security
import SelfSdk

class SecureStorageProviderImpl: NSObject, SecureStorageProvider {
    private let service = "xyz.self.sdk"

    func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func set(key: String, value: String) {
        // Delete existing first (upsert pattern)
        remove(key: key)
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    func remove(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

### Haptic Handler (Kotlin side)

```kotlin
class HapticBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.HAPTIC

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.haptic
        // Haptic is optional — silently no-op if not registered
        provider ?: return null

        when (method) {
            "impact" -> {
                val style = params["style"]?.jsonPrimitive?.content ?: "medium"
                provider.impact(style)
            }
            "notification" -> {
                val type = params["type"]?.jsonPrimitive?.content ?: "success"
                provider.notification(type)
            }
            "selection" -> provider.selection()
        }
        return null
    }
}
```

### Haptic Provider (Swift side)

```swift
// Sources/SelfSdkSwift/Providers/HapticProviderImpl.swift
import UIKit
import SelfSdk

class HapticProviderImpl: NSObject, HapticProvider {
    func impact(style: String) {
        let uiStyle: UIImpactFeedbackGenerator.FeedbackStyle = switch style {
        case "light": .light
        case "heavy": .heavy
        default: .medium
        }
        UIImpactFeedbackGenerator(style: uiStyle).impactOccurred()
    }

    func notification(type: String) {
        let uiType: UINotificationFeedbackGenerator.FeedbackType = switch type {
        case "warning": .warning
        case "error": .error
        default: .success
        }
        UINotificationFeedbackGenerator().notificationOccurred(uiType)
    }

    func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
}
```

### Validation

- Biometric: Test on physical device — authenticate with Face ID/Touch ID
- SecureStorage: Write → read → delete roundtrip
- Haptic: Trigger each feedback type, confirm device vibrates
- All 3 handlers compile with `./gradlew :shared:compileKotlinIosArm64`

---

## Chunk 3C: Crypto, Documents, Analytics, Lifecycle Handlers

**Goal**: Implement remaining non-hardware handlers.

### Crypto Handler

The Kotlin handler delegates signing, key generation, and public key retrieval to `CryptoProvider`. The Swift implementation uses Security framework's `SecKey` APIs.

**Kotlin handler** (`CryptoBridgeHandler.kt`): Routes `sign`, `generateKey`, `getPublicKey`, `deleteKey` to provider.

**Swift provider** (`CryptoProviderImpl.swift`):
- `generateKey`: `SecKeyCreateRandomKey` with `kSecAttrKeyTypeECSECPrimeRandom`, 256-bit, stored in Keychain with `keyRef` as label
- `getPublicKey`: `SecKeyCopyPublicKey` → `SecKeyCopyExternalRepresentation` → Base64
- `sign`: `SecKeyCreateSignature` with `kSecKeyAlgorithmECDSASignatureMessageX962SHA256` → Base64
- `deleteKey`: `SecItemDelete` with key reference query

### Documents Handler

**Kotlin handler** (`DocumentsBridgeHandler.kt`): Routes `get`, `set`, `remove`, `list` to provider.

**Swift provider** (`DocumentsProviderImpl.swift`):
- Uses `FileManager` with encrypted container directory at `Application Support/xyz.self.sdk/documents/`
- Each document stored as a file with the key as filename
- File protection: `.completeUntilFirstUserAuthentication`
- `list()`: Returns directory listing of document keys

### Analytics Handler

**No changes needed.** Stays as fire-and-forget — accepts all events, returns `null`. Optionally logs via `NSLog` for debug builds.

### Lifecycle Handler

**Kotlin handler** (`LifecycleBridgeHandler.kt`):
- `ready`: No-op, returns `null`
- `dismiss`: Calls `SdkProviderRegistry.webView?.getViewController()?.dismiss(animated: true, completion: nil)` — requires reference to the presenting view controller
- `setResult`: Parses success/failure, invokes the pending `SelfSdkCallback`, then dismisses

**Design**: The lifecycle handler needs a reference to the `SelfSdkCallback` that was passed to `SelfSdk.launch()`. Add a `pendingCallback` property to the handler that `SelfSdk.ios.kt` sets before launching the WebView.

```kotlin
class LifecycleBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE
    var pendingCallback: SelfSdkCallback? = null
    var dismissAction: (() -> Unit)? = null

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "ready" -> null
            "dismiss" -> {
                dismissAction?.invoke()
                pendingCallback?.onCancelled()
                null
            }
            "setResult" -> {
                val success = params["success"]?.jsonPrimitive?.boolean ?: false
                if (success) {
                    val data = params["data"]
                    pendingCallback?.onSuccess(parseVerificationResult(data))
                } else {
                    val code = params["errorCode"]?.jsonPrimitive?.content ?: "UNKNOWN"
                    val message = params["errorMessage"]?.jsonPrimitive?.content ?: "Unknown error"
                    pendingCallback?.onFailure(SelfSdkError(code, message))
                }
                dismissAction?.invoke()
                null
            }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown lifecycle method: $method")
        }
    }
}
```

### Validation

- Crypto: Generate key → get public key → sign data → verify signature roundtrip
- Documents: Store → retrieve → list → remove roundtrip
- Lifecycle: `setResult` delivers to callback, `dismiss` triggers `onCancelled`
- `./gradlew :shared:compileKotlinIosArm64` passes

---

## Chunk 3D: iOS WebView Host + `SelfSdk.launch()`

**Goal**: Get the full WebView-based verification flow working on iOS via Swift wrapper.

### WebView Host (Kotlin side)

Rewrite `IosWebViewHost.kt` to delegate to `WebViewProvider`:

```kotlin
class IosWebViewHost(
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    private val provider: WebViewProvider
        get() = SdkProviderRegistry.webView
            ?: throw IllegalStateException("WebView provider not registered")

    fun createWebView(): Any {
        return provider.createWebView(
            onMessageReceived = { json -> router.onMessageReceived(json) },
            isDebugMode = isDebugMode,
        )
    }

    fun evaluateJs(js: String) {
        provider.evaluateJs(js)
    }

    fun getViewController(): Any {
        return provider.getViewController()
    }
}
```

### WebView Provider (Swift side)

```swift
// Sources/SelfSdkSwift/Providers/WebViewProviderImpl.swift
import WebKit
import UIKit
import SelfSdk

class WebViewProviderImpl: NSObject, WebViewProvider, WKScriptMessageHandler {
    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String) -> Void)?

    func createWebView(onMessageReceived: @escaping (String) -> Void, isDebugMode: Bool) -> UIView {
        self.onMessageReceived = onMessageReceived

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "SelfNativeIOS")

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.scrollView.isScrollEnabled = true
        self.webView = wv

        if isDebugMode {
            wv.load(URLRequest(url: URL(string: "http://localhost:5173")!))
        } else {
            // Load bundled HTML from framework resources
            if let bundleUrl = Bundle.main.url(forResource: "self-wallet/index", withExtension: "html") {
                wv.loadFileURL(bundleUrl, allowingReadAccessTo: bundleUrl.deletingLastPathComponent())
            }
        }

        return wv
    }

    func evaluateJs(js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func getViewController() -> UIViewController {
        if let existing = viewController { return existing }
        let vc = UIViewController()
        if let wv = webView {
            vc.view = wv
        }
        self.viewController = vc
        return vc
    }

    // WKScriptMessageHandler
    func userContentController(_ controller: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard let body = message.body as? String else { return }
        onMessageReceived?(body)
    }
}
```

### `SelfSdk.ios.kt` — Launch Flow

```kotlin
actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
    check(SdkProviderRegistry.isConfigured()) {
        "iOS requires Swift providers. Call SelfSdkSwift.configure() at app startup."
    }

    val router = MessageRouter(
        sendToWebView = { js -> webViewHost?.evaluateJs(js) }
    )

    // Register all handlers
    val lifecycleHandler = LifecycleBridgeHandler().apply {
        pendingCallback = callback
        dismissAction = {
            // Dismiss the presented view controller
            val vc = SdkProviderRegistry.webView?.getViewController()
            vc?.dismiss(animated = true, completion = null)
        }
    }

    router.register(BiometricBridgeHandler())
    router.register(SecureStorageBridgeHandler())
    router.register(CryptoBridgeHandler())
    router.register(HapticBridgeHandler())
    router.register(AnalyticsBridgeHandler())
    router.register(lifecycleHandler)
    router.register(DocumentsBridgeHandler())
    router.register(CameraMrzBridgeHandler())
    router.register(NfcBridgeHandler(router))

    // Create WebView
    webViewHost = IosWebViewHost(router, config.debug)
    webViewHost?.createWebView()

    // Present modally
    val sdkViewController = webViewHost?.getViewController() as UIViewController
    sdkViewController.modalPresentationStyle = UIModalPresentationFullScreen
    // Find the topmost view controller and present
    findTopViewController()?.present(sdkViewController, animated = true, completion = null)
}

private fun findTopViewController(): UIViewController? {
    var vc = UIApplication.sharedApplication.keyWindow?.rootViewController
    while (vc?.presentedViewController != null) {
        vc = vc?.presentedViewController
    }
    return vc
}
```

### Validation

- Full verification flow: `SelfSdk.launch()` → WebView loads → bridge messages flow → result delivered via callback
- Test in test app: Replace Swift workarounds with `SelfSdkSwift.configure()` call
- WebView loads both in debug mode (localhost) and release mode (bundled assets)

---

## Chunk 3E: Wire Up NFC + Camera

**Goal**: Connect existing `NfcPassportHelper.swift` and `MrzCameraHelper.swift` to the SDK's factory pattern.

### NFC Provider (Swift side)

Move `NfcPassportHelper.swift` from `packages/kmp-test-app/iosApp/iosApp/` into `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/`. The provider impl wraps it:

```swift
// Sources/SelfSdkSwift/Providers/NfcProviderImpl.swift
import SelfSdk

class NfcProviderImpl: NSObject, NfcProvider {
    private var nfcHelper: NfcPassportHelper?

    func isAvailable() -> Bool {
        return NfcPassportHelper.isNfcAvailable()
    }

    func scanPassport(passportNumber: String, dateOfBirth: String, dateOfExpiry: String,
                      onProgress: @escaping (Int32, Int32, String) -> Void,
                      onComplete: @escaping (Bool, String) -> Void) {
        let helper = NfcPassportHelper()
        self.nfcHelper = helper  // Retain during scan

        helper.scanPassport(
            passportNumber: passportNumber,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry,
            progress: { stateIndex, percent, message in
                DispatchQueue.main.async {
                    onProgress(Int32(stateIndex), Int32(percent), message)
                }
            },
            completion: { [weak self] success, jsonResult in
                DispatchQueue.main.async {
                    onComplete(success, jsonResult)
                    self?.nfcHelper = nil  // Release
                }
            }
        )
    }

    func cancelScan() {
        nfcHelper = nil  // Releasing triggers cleanup
    }
}
```

### NFC Handler (Kotlin side)

```kotlin
class NfcBridgeHandler(private val router: MessageRouter) : BridgeHandler {
    override val domain = BridgeDomain.NFC

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.nfc
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "NFC provider not registered")

        return when (method) {
            "scan" -> scan(provider, params)
            "cancelScan" -> { provider.cancelScan(); null }
            "isSupported" -> JsonPrimitive(provider.isAvailable())
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown NFC method: $method")
        }
    }

    private suspend fun scan(provider: NfcProvider, params: Map<String, JsonElement>): JsonElement {
        val passportNumber = params["passportNumber"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "passportNumber required")
        val dateOfBirth = params["dateOfBirth"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "dateOfBirth required")
        val dateOfExpiry = params["dateOfExpiry"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "dateOfExpiry required")

        return suspendCancellableCoroutine { cont ->
            provider.scanPassport(
                passportNumber = passportNumber,
                dateOfBirth = dateOfBirth,
                dateOfExpiry = dateOfExpiry,
                onProgress = { stateIndex, percent, message ->
                    // Push progress events to WebView
                    router.pushEvent(
                        BridgeDomain.NFC, "scanProgress",
                        buildJsonObject {
                            put("stateIndex", stateIndex)
                            put("percent", percent)
                            put("message", message)
                        }
                    )
                },
                onComplete = { success, jsonResult ->
                    if (success) {
                        cont.resume(Json.parseToJsonElement(jsonResult))
                    } else {
                        cont.resumeWithException(
                            BridgeHandlerException("NFC_SCAN_FAILED", jsonResult)
                        )
                    }
                }
            )
        }
    }
}
```

### Camera MRZ Provider (Swift side)

Move `MrzCameraHelper.swift` into `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/`. Wrap it:

```swift
// Sources/SelfSdkSwift/Providers/CameraMrzProviderImpl.swift
import UIKit
import SelfSdk

class CameraMrzProviderImpl: NSObject, CameraMrzProvider {
    private var cameraHelper: MrzCameraHelper?

    func isAvailable() -> Bool {
        return true  // Camera availability checked at runtime by AVCaptureDevice
    }

    func createCameraView(onMrzDetected: @escaping (String) -> Void,
                           onProgress: @escaping (Int32) -> Void,
                           onError: @escaping (String) -> Void) -> UIView {
        let helper = MrzCameraHelper()
        self.cameraHelper = helper

        let view = helper.createCameraPreviewView(frame: .zero)

        helper.scanMrzWithCallbacks(
            progress: { stateIndex in
                DispatchQueue.main.async { onProgress(Int32(stateIndex)) }
            },
            completion: { success, jsonResult in
                DispatchQueue.main.async {
                    if success {
                        onMrzDetected(jsonResult)
                    } else {
                        onError(jsonResult)
                    }
                }
            }
        )
        helper.startCamera()
        return view
    }

    func stopCamera() {
        cameraHelper?.stopCamera()
        cameraHelper = nil
    }
}
```

### Camera Handler (Kotlin side)

```kotlin
class CameraMrzBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.cameraMrz
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Camera MRZ provider not registered")

        return when (method) {
            "isAvailable" -> JsonPrimitive(provider.isAvailable())
            "scanMRZ" -> scanMrz(provider)
            "stopCamera" -> { provider.stopCamera(); null }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown camera method: $method")
        }
    }

    private suspend fun scanMrz(provider: CameraMrzProvider): JsonElement {
        return suspendCancellableCoroutine { cont ->
            provider.createCameraView(
                onMrzDetected = { jsonResult ->
                    cont.resume(Json.parseToJsonElement(jsonResult))
                },
                onProgress = { _ -> /* Progress updates for UI */ },
                onError = { error ->
                    cont.resumeWithException(
                        BridgeHandlerException("MRZ_SCAN_FAILED", error)
                    )
                }
            )
        }
    }
}
```

### Migration from Test App

After this chunk, update the test app to use `SelfSdkSwift.configure()` instead of the manual factory registrations:

```swift
// BEFORE (test app iOSApp.swift):
init() {
    MrzCameraFactoryImpl.register()
    NfcScanFactoryImpl.register()
}

// AFTER:
init() {
    SelfSdkSwift.configure()
}
```

The test app's `NfcScanFactoryImpl.swift` and `MrzCameraFactoryImpl.swift` become unnecessary — delete them. The test app's `NfcPassportHelper.swift` and `MrzCameraHelper.swift` are now in the Swift companion package.

### Validation

- NFC: Full passport scan on physical device (uses same NfcPassportHelper code, just moved)
- Camera: MRZ detection works through SDK handler → provider → MrzCameraHelper
- Test app: Replace factory registrations with `SelfSdkSwift.configure()`, verify same behavior
- Full end-to-end: `SelfSdk.launch()` → WebView → NFC scan → result callback

---

## Key Reference Files

| File | Role |
|------|------|
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/` | All 9 stub handlers (rewrite) |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/webview/IosWebViewHost.kt` | WebView stub (rewrite) |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/api/SelfSdk.ios.kt` | Launch flow (update) |
| `packages/kmp-sdk/shared/build.gradle.kts` | cinterop disabled (keep disabled) |
| `packages/kmp-test-app/iosApp/iosApp/NfcPassportHelper.swift` | Move to Swift companion package |
| `packages/kmp-test-app/iosApp/iosApp/MrzCameraHelper.swift` | Move to Swift companion package |
| `packages/kmp-test-app/iosApp/iosApp/NfcScanFactoryImpl.swift` | Reference pattern, then delete |
| `packages/kmp-test-app/iosApp/iosApp/MrzCameraFactoryImpl.swift` | Reference pattern, then delete |
| `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/` | Android handlers (reference for method contracts) |

---

## Testing

### Per-Chunk Test Requirements

**Chunk 3A (Factory Infrastructure)**:
- `./gradlew :shared:compileKotlinIosArm64` passes with all provider interfaces
- Swift companion package builds: `cd packages/self-sdk-swift && swift build`
- Provider interfaces are visible from Swift via XCFramework exports (manual check)

**Chunk 3B (Biometric, SecureStorage, Haptic)**:
- Biometric: Physical device test — Face ID / Touch ID prompt appears, success callback fires
- Biometric: Simulator test — `isAvailable()` returns false gracefully
- SecureStorage: Roundtrip test — `set("key", "value")` → `get("key")` returns `"value"` → `remove("key")` → `get("key")` returns null
- SecureStorage: Persistence test — write, kill app, relaunch, read back
- SecureStorage: Overwrite test — `set("key", "a")` → `set("key", "b")` → `get("key")` returns `"b"`
- Haptic: Manual test — each feedback type triggers device vibration

**Chunk 3C (Crypto, Documents, Analytics, Lifecycle)**:
- Crypto: `generateKey("testRef")` → `getPublicKey("testRef")` returns non-null base64 → `sign("testRef", data)` returns non-null signature → `deleteKey("testRef")` → `getPublicKey("testRef")` returns null
- Crypto: Generated key persists in Keychain across app restarts
- Documents: Same CRUD roundtrip as SecureStorage
- Documents: `list()` returns all stored document keys
- Lifecycle: `setResult` with success=true invokes `SelfSdkCallback.onSuccess`
- Lifecycle: `dismiss` invokes `SelfSdkCallback.onCancelled` and dismisses view controller

**Chunk 3D (WebView Host + Launch)**:
- `SelfSdk.launch()` without `SelfSdkSwift.configure()` throws clear error message
- `SelfSdk.launch()` after `configure()` presents WebView modally
- WebView loads index.html (debug mode: localhost, release: bundled)
- Bridge messages flow: WebView sends request → handler processes → response returned to WebView
- `SelfSdkCallback.onSuccess` fires when verification completes

**Chunk 3E (NFC + Camera)**:
- NFC: Physical device — full passport scan matches test app behavior (same JSON output)
- NFC: Progress callbacks fire in correct order (states 0–7)
- NFC: Cancel during scan doesn't crash
- Camera MRZ: Detects MRZ lines from passport page (states progress from 0 → 3)
- Camera MRZ: Parsed MRZ data contains valid documentNumber, dateOfBirth, dateOfExpiry
- Integration: `SelfSdkSwift.configure()` in test app replaces manual factory registrations with identical behavior

### Bridge Handler Parity Tests

For each of the 9 handlers, verify method parity with Android:
- Same methods supported (same `method` strings accepted)
- Same parameter names and types expected
- Same response JSON structure returned
- Same error codes for same failure conditions

Write a shared test matrix in `commonTest` that defines the expected contract per domain, then verify both platforms conform.

---

## Dependencies

- **SPEC-KMP-SDK.md** chunks 2A–2C: Required (Android complete, bridge protocol defined)
- **SPEC-PROVING-CLIENT.md**: Independent (proving client lives in `commonMain`, not iOS-specific)
- **SPEC-MINIPAY-SAMPLE.md**: Depends on this spec for iOS SDK functionality
