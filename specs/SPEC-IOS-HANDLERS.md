# Person 2 (continued): iOS Native Handlers — Swift Wrapper Pattern

## Overview

This spec covers completing iOS handler support for the KMP SDK. The original approach (Kotlin/Native cinterop with Apple frameworks) is **abandoned** due to Xcode SDK compatibility issues that blocked compilation. Instead, we use the **Swift wrapper pattern** already proven in the test app.

**Only 3 native handlers are needed for iOS** (down from 9 in the original spec):

| Handler | Why Native? |
|---------|-------------|
| **NFC** | Hardware — browser cannot access NFC chip |
| **Biometrics** | OS prompt — Face ID / Touch ID requires native LAContext |
| **Lifecycle** | ViewController management — dismiss/result delivery needs native VC reference |

**Camera/MRZ**: Phase 2 optional — not needed for initial launch.

The other 5 handlers from the original spec are **no longer built for iOS**:

| Dropped Handler | Reason |
|----------------|--------|
| SecureStorage | Keychain is native-managed by the host app (e.g. MiniPay manages its own keychain) |
| Crypto | Web Crypto API inside the WebView handles hashing/signing |
| Documents | IndexedDB inside the WebView handles document storage |
| Haptic | Not critical — skipped entirely |
| Analytics | Fire-and-forget — console/fetch inside the WebView suffices |

> **Reference**: See the Native Handler Matrix in [SPECS.md](./SPECS.md) for the full rationale. The key insight is: only bridge to native what the browser literally cannot do. Everything else runs inside the WebView using standard web APIs.

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

Move factory interfaces **into the SDK** (`kmp-sdk/shared/src/iosMain/`), not the test app. Only 3 handler providers are needed (NFC, Biometric, WebView), plus the Lifecycle handler which is self-contained in Kotlin. The SDK's iOS handlers call the registered factories instead of throwing `NotImplementedError`. A new Swift companion package (`SelfSdkSwift/`) provides default implementations for the 3 providers.

### Key Design Principles

- **cinterop stays disabled** — `build.gradle.kts` lines 32–62 remain commented out
- **No new Kotlin/Native framework dependencies** — all Apple framework calls happen in Swift
- **Callback-based APIs** — Swift closures bridge to Kotlin `suspend` functions via `suspendCancellableCoroutine`
- **Main thread safety** — Swift callbacks dispatch to main queue before calling Kotlin
- **ARC lifecycle management** — Swift factory impls retain helpers during async operations (prevents premature deallocation)
- **WebView handles the rest** — Documents (IndexedDB), Crypto (Web Crypto API), Analytics (fetch), Haptic (skipped) all run inside the WebView with no native handler

---

## Directory Structure

```
packages/kmp-sdk/
  shared/src/iosMain/kotlin/xyz/self/sdk/
    providers/                              # NEW — Factory interfaces (only 3 + WebView)
      NfcProvider.kt                        # NFC passport scanning
      BiometricProvider.kt                  # Face ID / Touch ID
      WebViewProvider.kt                    # WKWebView hosting
      SdkProviderRegistry.kt               # Central registry (3 providers)
    handlers/                               # REWRITE — Only 3 handlers
      NfcBridgeHandler.kt                   # NFC scan via provider
      BiometricBridgeHandler.kt             # Biometrics via provider
      LifecycleBridgeHandler.kt             # Lifecycle (self-contained, no provider)
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
      WebViewProviderImpl.swift             # WKWebView wrapper
    Helpers/
      NfcPassportHelper.swift               # MOVE from test app (274 lines)
```

---

## Chunk 3A: Factory Infrastructure

**Goal**: Define the 3 provider interfaces in the SDK and create the Swift companion package skeleton.

### Step 1: Provider Interfaces (Kotlin `iosMain`)

#### `SdkProviderRegistry.kt`

Central registry that all providers register into. Only 3 providers are required — the WebView engine handles everything else via web-native fallbacks.

```kotlin
package xyz.self.sdk.providers

/**
 * Central registry for iOS native provider implementations.
 * Swift companion package calls SdkProviderRegistry.configure() at app startup.
 *
 * Only 3 providers are needed:
 * - NFC: hardware access (NFCPassportReader)
 * - Biometric: OS-level prompt (LAContext)
 * - WebView: WKWebView hosting and JS bridge
 *
 * Documents, Crypto, Analytics, Haptic are handled by web fallbacks
 * inside the WebView (IndexedDB, Web Crypto API, fetch).
 * Keychain access is native-managed by the host app directly.
 */
object SdkProviderRegistry {
    var nfc: NfcProvider? = null
    var biometric: BiometricProvider? = null
    var webView: WebViewProvider? = null

    /**
     * Returns true if all required providers are registered.
     * Lifecycle handler is self-contained (no external provider needed).
     */
    fun isConfigured(): Boolean = nfc != null && biometric != null && webView != null
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
    ///
    /// Only 3 providers are registered:
    /// - NFC (hardware access)
    /// - Biometric (OS prompt)
    /// - WebView (WKWebView hosting)
    ///
    /// Documents, Crypto, Analytics, and Haptic are handled by web
    /// fallbacks inside the WebView — no native providers needed.
    public static func configure() {
        let registry = SdkProviderRegistry.shared
        registry.nfc = NfcProviderImpl()
        registry.biometric = BiometricProviderImpl()
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

## Chunk 3B: Biometric Handler

**Goal**: Implement the simplest handler end-to-end (Kotlin handler + Swift provider). Good starting point to validate the full pattern.

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

### Validation

- Biometric: Physical device test — Face ID / Touch ID prompt appears, success callback fires
- Biometric: Simulator test — `isAvailable()` returns false gracefully
- `./gradlew :shared:compileKotlinIosArm64` passes

---

## Chunk 3C: Lifecycle Handler

**Goal**: Implement the Lifecycle handler with callback/dismiss wiring. This handler is self-contained in Kotlin (no Swift provider needed) — it uses the `SelfSdkCallback` reference and dismiss action set by `SelfSdk.ios.kt`.

### Lifecycle Handler (Kotlin side)

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

**Design**: The lifecycle handler needs a reference to the `SelfSdkCallback` that was passed to `SelfSdk.launch()`. The `SelfSdk.ios.kt` sets `pendingCallback` and `dismissAction` before launching the WebView.

### Validation

- Lifecycle: `setResult` with success=true invokes `SelfSdkCallback.onSuccess`
- Lifecycle: `setResult` with success=false invokes `SelfSdkCallback.onFailure`
- Lifecycle: `dismiss` invokes `SelfSdkCallback.onCancelled` and dismisses view controller
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

Only 3 handlers are registered. Documents, Crypto, Analytics, and Haptic are all handled by web fallbacks inside the WebView — no native handler registration needed.

```kotlin
actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
    check(SdkProviderRegistry.isConfigured()) {
        "iOS requires Swift providers. Call SelfSdkSwift.configure() at app startup."
    }

    val router = MessageRouter(
        sendToWebView = { js -> webViewHost?.evaluateJs(js) }
    )

    // Register only 3 handlers — everything else handled by WebView web fallbacks
    val lifecycleHandler = LifecycleBridgeHandler().apply {
        pendingCallback = callback
        dismissAction = {
            // Dismiss the presented view controller
            val vc = SdkProviderRegistry.webView?.getViewController()
            vc?.dismiss(animated = true, completion = null)
        }
    }

    router.register(BiometricBridgeHandler())
    router.register(lifecycleHandler)
    router.register(NfcBridgeHandler(router))
    // Documents  → IndexedDB in WebView
    // Crypto     → Web Crypto API in WebView
    // Analytics  → console/fetch in WebView
    // Haptic     → skipped (not critical)
    // Keychain   → native-managed by host app (e.g. MiniPay)

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
- `SelfSdk.launch()` without `SelfSdkSwift.configure()` throws clear error message
- `SelfSdkCallback.onSuccess` fires when verification completes

---

## Chunk 3E: NFC Handler

**Goal**: Connect existing `NfcPassportHelper.swift` to the SDK's factory pattern. This is the most complex handler due to async progress callbacks and the NFCPassportReader dependency.

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

The test app's `NfcScanFactoryImpl.swift` becomes unnecessary — delete it. The test app's `NfcPassportHelper.swift` is now in the Swift companion package.

### Validation

- NFC: Full passport scan on physical device (uses same NfcPassportHelper code, just moved)
- NFC: Progress callbacks fire in correct order (states 0–7)
- NFC: Cancel during scan doesn't crash
- Test app: Replace factory registrations with `SelfSdkSwift.configure()`, verify same behavior
- Full end-to-end: `SelfSdk.launch()` → WebView → NFC scan → result callback

---

## Chunk 3F (Optional, Phase 2): Camera MRZ Handler

**Not needed for initial launch.** Camera/MRZ scanning can be added later if needed. The WebView UI currently supports manual MRZ entry as a fallback.

If added in Phase 2, the pattern follows the same Swift wrapper approach:
- Move `MrzCameraHelper.swift` from test app into `SelfSdkSwift/Helpers/`
- Create `CameraMrzProvider.kt` interface and `CameraMrzBridgeHandler.kt`
- Create `CameraMrzProviderImpl.swift` wrapping the helper
- Register in `SdkProviderRegistry` (add optional `cameraMrz` field)

---

## Key Reference Files

| File | Role |
|------|------|
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/` | 3 handlers to implement (NFC, Biometric, Lifecycle) |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/webview/IosWebViewHost.kt` | WebView stub (rewrite) |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/api/SelfSdk.ios.kt` | Launch flow (update) |
| `packages/kmp-sdk/shared/build.gradle.kts` | cinterop disabled (keep disabled) |
| `packages/kmp-test-app/iosApp/iosApp/NfcPassportHelper.swift` | Move to Swift companion package |
| `packages/kmp-test-app/iosApp/iosApp/NfcScanFactoryImpl.swift` | Reference pattern, then delete |
| `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/` | Android handlers (reference for method contracts) |

---

## Testing

### Per-Chunk Test Requirements

**Chunk 3A (Factory Infrastructure)**:
- `./gradlew :shared:compileKotlinIosArm64` passes with all 3 provider interfaces
- Swift companion package builds: `cd packages/self-sdk-swift && swift build`
- Provider interfaces are visible from Swift via XCFramework exports (manual check)

**Chunk 3B (Biometric Handler)**:
- Biometric: Physical device test — Face ID / Touch ID prompt appears, success callback fires
- Biometric: Simulator test — `isAvailable()` returns false gracefully

**Chunk 3C (Lifecycle Handler)**:
- Lifecycle: `setResult` with success=true invokes `SelfSdkCallback.onSuccess`
- Lifecycle: `setResult` with success=false invokes `SelfSdkCallback.onFailure`
- Lifecycle: `dismiss` invokes `SelfSdkCallback.onCancelled` and dismisses view controller

**Chunk 3D (WebView Host + Launch)**:
- `SelfSdk.launch()` without `SelfSdkSwift.configure()` throws clear error message
- `SelfSdk.launch()` after `configure()` presents WebView modally
- WebView loads index.html (debug mode: localhost, release: bundled)
- Bridge messages flow: WebView sends request → handler processes → response returned to WebView
- `SelfSdkCallback.onSuccess` fires when verification completes

**Chunk 3E (NFC Handler)**:
- NFC: Physical device — full passport scan matches test app behavior (same JSON output)
- NFC: Progress callbacks fire in correct order (states 0–7)
- NFC: Cancel during scan doesn't crash
- Integration: `SelfSdkSwift.configure()` in test app replaces manual factory registrations with identical behavior

**Chunk 3F (Camera MRZ — Phase 2)**:
- Deferred. Not required for initial launch.

### Bridge Handler Parity Tests

For each of the 3 handlers, verify method parity with Android:
- Same methods supported (same `method` strings accepted)
- Same parameter names and types expected
- Same response JSON structure returned
- Same error codes for same failure conditions

Write a shared test matrix in `commonTest` that defines the expected contract per domain (NFC, Biometrics, Lifecycle), then verify both platforms conform.

> **Note on Analytics**: Analytics events are fire-and-forget. In the WebView, they go through `console.log` or `fetch` — no native handler needed. If the host app wants analytics, it can intercept `console` output from the WKWebView.

---

## Dependencies

- **SPEC-KMP-SDK.md** chunks 2A–2C: Required (Android complete, bridge protocol defined)
- **SPEC-MINIPAY-SAMPLE.md**: Depends on this spec for iOS SDK functionality
