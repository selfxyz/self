# Person 2: KMP SDK / Native Handlers — Implementation Spec

## Current Status

| Chunk | Description | Status |
|-------|-------------|--------|
| 2A | KMP Setup + Bridge Protocol | ✅ Complete |
| 2B | Android WebView Host | ✅ Complete |
| 2C | Android Native Handlers | ✅ Complete (5 of 9 needed — Documents, Crypto, Analytics, Haptic to be DELETED) |
| 2D | iOS WebView Host + cinterop | ⚠️ Partial (cinterop blocked by Xcode SDK compatibility issues, stubs in place) |
| 2E | iOS Native Handlers | ❌ Not Done (only 3 needed: NFC, Biometrics, Lifecycle) |
| 2F | SDK Public API + Test App | ⚠️ Partial (Android works end-to-end, iOS uses Swift workarounds via factory pattern in test app) |

> **Note:** Remaining iOS handler work has moved to [SPEC-IOS-HANDLERS.md](./SPEC-IOS-HANDLERS.md) — uses a Swift wrapper pattern instead of cinterop. A MiniPay sample app demonstrating the integration flow is in [SPEC-MINIPAY-SAMPLE.md](./SPEC-MINIPAY-SAMPLE.md).

---

## Web Fallback Migration

Four Android handlers are being **deleted** because the WebView can handle their functionality using standard web APIs. This reduces native code, eliminates iOS porting work, and keeps behavior consistent across platforms.

| Deleted Handler | LOC Removed | Web Fallback | Notes |
|----------------|------------|--------------|-------|
| **DocumentsBridgeHandler** | 146 LOC | IndexedDB | WebView stores documents in IndexedDB; no native file I/O needed |
| **CryptoBridgeHandler** | 177 LOC | Web Crypto API | Hashing and key derivation run in Web Crypto; signing keys live in SecureStorage (native keychain), accessed via biometrics bridge |
| **AnalyticsBridgeHandler** | 94 LOC | `console` / `fetch` | Analytics events logged via console or sent via fetch from the WebView; fire-and-forget |
| **HapticBridgeHandler** | 94 LOC | Skipped | Haptic feedback is not critical to verification flow; WebView skips it |

**Total savings:** 511 LOC deleted from Android, 6 fewer iOS handlers to build. See the Native Handler Matrix in [SPECS.md](./SPECS.md) for the full architecture rationale.

> **Keychain note:** SecureStorage stays native because host apps (like MiniPay) control keychain access policy. The WebView must not have direct keychain access.

---

## Overview

You are building the **native side** of the Self Mobile SDK. This means:

1. **`packages/kmp-sdk/`** — Kotlin Multiplatform module with `shared/` source sets
2. **`packages/kmp-test-app/`** — Test app for both Android and iOS

The KMP SDK:
- Hosts a WebView containing Person 1's Vite bundle
- Routes bridge messages from the WebView to native handlers
- Provides `SelfSdk.launch()` as the public API for host apps (MiniPay, etc.)
- Outputs: AAR (Android) + XCFramework/SPM (iOS)

---

## What to Delete First

Delete `packages/kmp-shell/` entirely before starting. It was an experiment — the bridge protocol and handler pattern are sound, but the module structure needs to be rebuilt as a proper KMP SDK with Android target (not just JVM + iOS).

Also delete these Android handlers (web fallbacks replace them):
- `androidMain/handlers/DocumentsBridgeHandler.kt`
- `androidMain/handlers/CryptoBridgeHandler.kt`
- `androidMain/handlers/HapticBridgeHandler.kt`
- `androidMain/handlers/AnalyticsBridgeHandler.kt`

---

## Directory Structure

```
packages/kmp-sdk/
  shared/
    src/
      commonMain/kotlin/xyz/self/sdk/
        bridge/
          BridgeMessage.kt          # @Serializable protocol types
          BridgeHandler.kt          # Handler interface + BridgeHandlerException
          MessageRouter.kt          # Routes messages to handlers, sends responses
        models/
          PassportScanResult.kt     # Common NFC result model
          NfcScanProgress.kt        # Progress events
          NfcScanParams.kt          # Scan parameters
          MrzKeyUtils.kt            # MRZ key derivation (pure Kotlin)
        api/
          SelfSdk.kt                # expect class — public API
          SelfSdkConfig.kt          # Configuration data class
          VerificationRequest.kt    # Request model
          SelfSdkCallback.kt        # Result callback interface
        webview/
          WebViewHost.kt            # expect class — WebView hosting

      commonTest/kotlin/xyz/self/sdk/
        bridge/
          MessageRouterTest.kt
        models/
          MrzKeyUtilsTest.kt

      androidMain/kotlin/xyz/self/sdk/
        api/
          SelfSdk.android.kt       # actual class — Android implementation
        webview/
          AndroidWebViewHost.kt    # Android WebView + JS injection
          SelfVerificationActivity.kt  # Activity wrapping the WebView
        handlers/
          NfcBridgeHandler.kt          # JMRTD passport reader
          BiometricBridgeHandler.kt    # BiometricPrompt
          SecureStorageBridgeHandler.kt # EncryptedSharedPreferences (keychain — native managed)
          CameraMrzBridgeHandler.kt    # ML Kit Text Recognition
          LifecycleBridgeHandler.kt    # WebView ↔ host communication + relay listener

      iosMain/kotlin/xyz/self/sdk/
        api/
          SelfSdk.ios.kt           # actual class — iOS implementation
        webview/
          IosWebViewHost.kt        # WKWebView + JS injection
        handlers/
          NfcBridgeHandler.kt          # CoreNFC via cinterop / Swift wrapper
          BiometricBridgeHandler.kt    # LAContext via cinterop
          LifecycleBridgeHandler.kt    # WebView ↔ host communication + relay listener

    nativeInterop/
      cinterop/
        CoreNFC.def
        LocalAuthentication.def

  build.gradle.kts              # KMP plugin, Android + iOS targets

packages/kmp-test-app/
  shared/                       # Shared KMP app code
  androidApp/                   # Android test app (Compose)
  iosApp/                       # iOS test app (SwiftUI)
  build.gradle.kts
```

---

## Gradle Configuration

### `packages/kmp-sdk/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)  // NEW: Android library target
    id("maven-publish")                 // For AAR publishing
}

kotlin {
    jvm()  // For unit tests on JVM

    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "17"
            }
        }
        publishLibraryVariants("release")
    }

    iosArm64()
    iosSimulatorArm64()

    // iOS framework for SPM distribution
    listOf(iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "SelfSdk"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.kotlinx.coroutines.test)
        }
        val androidMain by getting {
            dependencies {
                // WebView
                implementation("androidx.webkit:webkit:1.12.1")
                // NFC / Passport
                implementation("org.jmrtd:jmrtd:0.8.1")
                implementation("net.sf.scuba:scuba-sc-android:0.0.18")
                implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
                implementation("commons-io:commons-io:2.14.0")
                // Biometrics
                implementation("androidx.biometric:biometric:1.2.0-alpha05")
                // Encrypted storage (keychain)
                implementation("androidx.security:security-crypto:1.1.0-alpha06")
                // Camera / MRZ
                implementation("com.google.mlkit:text-recognition:16.0.0")
                // Activity / Lifecycle
                implementation("androidx.appcompat:appcompat:1.7.0")
                implementation("androidx.activity:activity-ktx:1.9.3")
                implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
            }
        }
    }
}

android {
    namespace = "xyz.self.sdk"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Bundle WebView assets
    sourceSets["main"].assets.srcDirs("src/main/assets")
}
```

---

## Bridge Protocol (Kotlin Side)

The bridge protocol is the shared contract with Person 1. The Kotlin implementation mirrors the TypeScript types exactly.

### BridgeMessage.kt

```kotlin
package xyz.self.sdk.bridge

import kotlinx.serialization.*
import kotlinx.serialization.json.JsonElement

const val BRIDGE_PROTOCOL_VERSION = 1

@Serializable
enum class BridgeDomain {
    @SerialName("nfc") NFC,
    @SerialName("biometrics") BIOMETRICS,
    @SerialName("secureStorage") SECURE_STORAGE,
    @SerialName("camera") CAMERA,
    @SerialName("crypto") CRYPTO,
    @SerialName("haptic") HAPTIC,
    @SerialName("analytics") ANALYTICS,
    @SerialName("lifecycle") LIFECYCLE,
    @SerialName("documents") DOCUMENTS,
    @SerialName("navigation") NAVIGATION,
}

@Serializable
data class BridgeError(
    val code: String,
    val message: String,
    val details: Map<String, JsonElement>? = null,
)

@Serializable
data class BridgeRequest(
    val type: String = "request",
    val version: Int,
    val id: String,
    val domain: BridgeDomain,
    val method: String,
    val params: Map<String, JsonElement>,
    val timestamp: Long,
)

@Serializable
data class BridgeResponse(
    val type: String = "response",
    val version: Int = BRIDGE_PROTOCOL_VERSION,
    val id: String,
    val domain: BridgeDomain,
    val requestId: String,
    val success: Boolean,
    val data: JsonElement? = null,
    val error: BridgeError? = null,
    val timestamp: Long = currentTimeMillis(),
)

@Serializable
data class BridgeEvent(
    val type: String = "event",
    val version: Int = BRIDGE_PROTOCOL_VERSION,
    val id: String,
    val domain: BridgeDomain,
    val event: String,
    val data: JsonElement,
    val timestamp: Long = currentTimeMillis(),
)

// Platform expect/actual for time and UUID
internal expect fun currentTimeMillis(): Long
internal expect fun generateUuid(): String
```

**Platform actuals:**
- **JVM/Android:** `System.currentTimeMillis()`, `java.util.UUID.randomUUID().toString()`
- **iOS:** `NSDate().timeIntervalSince1970 * 1000`, `NSUUID().UUIDString`

### BridgeHandler.kt

```kotlin
interface BridgeHandler {
    val domain: BridgeDomain
    suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement?
}

class BridgeHandlerException(
    val code: String,
    override val message: String,
    val details: Map<String, JsonElement>? = null,
) : Exception(message)
```

### MessageRouter.kt

Routes incoming messages from WebView to handlers, runs them on a coroutine scope, sends responses back via a `sendToWebView` callback.

Key behavior:
- `register(handler)`: Register a `BridgeHandler` for a domain
- `onMessageReceived(rawJson)`: Parse request, find handler, dispatch on coroutine scope
- `pushEvent(domain, event, data)`: Send unsolicited events to WebView
- Response delivery: `window.SelfNativeBridge._handleResponse('...')`
- Event delivery: `window.SelfNativeBridge._handleEvent('...')`

**JS escaping** for safe embedding:
```kotlin
fun escapeForJs(json: String): String {
    val escaped = json
        .replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    return "'$escaped'"
}
```

---

## Android Implementation

### AndroidWebViewHost.kt

Manages an Android `WebView` instance:

```kotlin
class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
) {
    private lateinit var webView: WebView

    fun createWebView(): WebView {
        webView = WebView(context).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false  // Security
                allowContentAccess = false
                mediaPlaybackRequiresUserGesture = false
            }

            // JS interface: WebView → Native
            addJavascriptInterface(BridgeJsInterface(), "SelfNativeAndroid")

            // Load bundled assets or dev server
            if (BuildConfig.DEBUG) {
                loadUrl("http://10.0.2.2:5173")
            } else {
                loadUrl("file:///android_asset/self-wallet/index.html")
            }
        }
        return webView
    }

    // Send response/event to WebView
    fun evaluateJs(js: String) {
        webView.evaluateJavascript(js, null)
    }

    inner class BridgeJsInterface {
        @JavascriptInterface
        fun postMessage(json: String) {
            router.onMessageReceived(json)
        }
    }
}
```

### SelfVerificationActivity.kt

An Activity that hosts the WebView. Host apps launch this via `SelfSdk.launch()`:

```kotlin
class SelfVerificationActivity : AppCompatActivity() {
    private lateinit var webViewHost: AndroidWebViewHost
    private lateinit var router: MessageRouter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Create router with callback to send JS to WebView
        router = MessageRouter(
            sendToWebView = { js -> runOnUiThread { webViewHost.evaluateJs(js) } }
        )

        // Register native handlers (5 total — web fallbacks handle the rest)
        router.register(NfcBridgeHandler(this, router))
        router.register(BiometricBridgeHandler(this))
        router.register(SecureStorageBridgeHandler(this))  // Keychain — native managed
        router.register(CameraMrzBridgeHandler(this))
        router.register(LifecycleBridgeHandler(this))
        // REMOVED: CryptoBridgeHandler — Web Crypto handles hashing; signing keys accessed via SecureStorage
        // REMOVED: HapticBridgeHandler — WebView skips haptic feedback (not critical)
        // REMOVED: AnalyticsBridgeHandler — WebView uses console/fetch for analytics
        // REMOVED: DocumentsBridgeHandler — WebView uses IndexedDB for document storage

        // Create and show WebView
        webViewHost = AndroidWebViewHost(this, router)
        setContentView(webViewHost.createWebView())
    }
}
```

### NfcBridgeHandler.kt (Android)

**This is the most complex handler.** Port from `app/android/react-native-passport-reader/android/src/main/java/io/tradle/nfc/RNPassportReaderModule.kt`.

Key changes from the RN module:
1. Remove all React Native dependencies (`ReactApplicationContext`, `Promise`, `WritableMap`, `ReadableMap`, `DeviceEventManagerModule`)
2. Replace `AsyncTask` with Kotlin coroutines (`suspend fun`)
3. Use `NfcAdapter.enableReaderMode()` instead of `enableForegroundDispatch()` (better for SDK embedding — doesn't require the host's Activity to handle intents)
4. Send progress updates via `router.pushEvent()` instead of React Native event emitter
5. Return structured `PassportScanResult` instead of React Native `WritableMap`

```kotlin
class NfcBridgeHandler(
    private val activity: Activity,
    private val router: MessageRouter,
) : BridgeHandler {

    override val domain = BridgeDomain.NFC

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "scan" -> scan(params)
            "cancelScan" -> cancelScan()
            "isSupported" -> isSupported()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown NFC method: $method")
        }
    }

    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        val scanParams = Json.decodeFromJsonElement<NfcScanParams>(JsonObject(params))

        // Derive BAC key from MRZ data
        val mrzKey = MrzKeyUtils.computeMrzInfo(
            scanParams.passportNumber,
            scanParams.dateOfBirth,
            scanParams.dateOfExpiry,
        )

        // Wait for NFC tag using enableReaderMode (coroutine-friendly)
        val tag = awaitNfcTag()

        // Open IsoDep connection
        val isoDep = IsoDep.get(tag)
        isoDep.timeout = 20_000

        try {
            val cardService = CardService.getInstance(isoDep)
            cardService.open()

            val service = PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH * 2,
                PassportService.DEFAULT_MAX_BLOCKSIZE * 2,
                false, false,
            )
            service.open()

            // PACE attempt
            pushProgress("pace", 10, "Attempting PACE authentication...")
            var paceSucceeded = tryPACE(service, scanParams)

            // BAC fallback
            if (!paceSucceeded) {
                pushProgress("bac", 20, "Attempting BAC authentication...")
                val bacKey = BACKey(scanParams.passportNumber, scanParams.dateOfBirth, scanParams.dateOfExpiry)
                tryBAC(service, bacKey)
            }

            // Read data groups
            pushProgress("reading_dg1", 40, "Reading DG1...")
            val dg1File = DG1File(service.getInputStream(PassportService.EF_DG1))

            pushProgress("reading_sod", 60, "Reading SOD...")
            val sodFile = SODFile(service.getInputStream(PassportService.EF_SOD))

            // Chip authentication
            pushProgress("chip_auth", 80, "Chip authentication...")
            doChipAuth(service)

            pushProgress("complete", 100, "Scan complete")

            // Build result matching PassportScanResult
            return buildPassportResult(dg1File, sodFile)

        } finally {
            isoDep.close()
        }
    }
}
```

**NFC flow (from RNPassportReaderModule, simplified):**

1. Get `NfcAdapter`, check `isEnabled`
2. Wait for tag via `enableReaderMode` (or `enableForegroundDispatch`)
3. Get `IsoDep` from tag, set timeout to 20s
4. Create `CardService`, open it
5. Create `PassportService`, open it
6. **PACE attempt**: Read `EF_CARD_ACCESS` -> extract `PACEInfo` -> `service.doPACE()`
7. **BAC fallback** (if PACE fails): `service.sendSelectApplet(false)` -> `service.doBAC(bacKey)` with up to 3 retries
8. **Select applet** after auth: `service.sendSelectApplet(true)`
9. **Read DG1**: `DG1File(service.getInputStream(PassportService.EF_DG1))`
10. **Read SOD**: `SODFile(service.getInputStream(PassportService.EF_SOD))`
11. **Chip Authentication**: Read DG14 -> extract `ChipAuthenticationPublicKeyInfo` -> `service.doEACCA()`
12. **Build result**: Extract MRZ, certificates, hashes, signatures from parsed files

**Dependencies:**
- `org.jmrtd:jmrtd:0.8.1`
- `net.sf.scuba:scuba-sc-android:0.0.18`
- `org.bouncycastle:bcprov-jdk18on:1.78.1`
- `commons-io:commons-io:2.14.0`

### BiometricBridgeHandler.kt (Android)

```kotlin
class BiometricBridgeHandler(private val activity: FragmentActivity) : BridgeHandler {
    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "authenticate" -> authenticate(params)
            "isAvailable" -> isAvailable()
            "getBiometryType" -> getBiometryType()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown biometrics method: $method")
        }
    }

    private suspend fun authenticate(params: Map<String, JsonElement>): JsonElement {
        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate"
        return suspendCancellableCoroutine { cont ->
            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Self Verification")
                .setSubtitle(reason)
                .setNegativeButtonText("Cancel")
                .build()

            val prompt = BiometricPrompt(activity, /* executor */, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    cont.resume(JsonPrimitive(true))
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    cont.resumeWithException(BridgeHandlerException("BIOMETRIC_ERROR", errString.toString()))
                }
                override fun onAuthenticationFailed() {
                    cont.resumeWithException(BridgeHandlerException("BIOMETRIC_FAILED", "Authentication failed"))
                }
            })
            prompt.authenticate(promptInfo)
        }
    }
}
```

### SecureStorageBridgeHandler.kt (Android)

Uses `EncryptedSharedPreferences` backed by Android Keystore. This handler stays native because host apps (like MiniPay) control keychain access policy — the WebView must not have direct keychain access.

```kotlin
class SecureStorageBridgeHandler(context: Context) : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    private val prefs = EncryptedSharedPreferences.create(
        "self_sdk_secure_prefs",
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        return when (method) {
            "get" -> {
                val value = prefs.getString(key, null)
                if (value != null) JsonPrimitive(value) else JsonNull
            }
            "set" -> {
                val value = params["value"]?.jsonPrimitive?.content
                    ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")
                prefs.edit().putString(key, value).apply()
                null
            }
            "remove" -> {
                prefs.edit().remove(key).apply()
                null
            }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown secureStorage method: $method")
        }
    }
}
```

### CameraMrzBridgeHandler.kt (Android)

Uses ML Kit `TextRecognition` to detect MRZ text from camera preview. This handler stays native because camera access requires hardware APIs unavailable to the WebView.

```kotlin
class CameraMrzBridgeHandler(private val activity: Activity) : BridgeHandler {
    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "scanMrz" -> scanMrz(params)
            "isAvailable" -> JsonPrimitive(true)
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown camera method: $method")
        }
    }

    // Opens camera, uses ML Kit Text Recognition to find MRZ lines,
    // returns parsed MRZ data (document number, date of birth, date of expiry)
}
```

### LifecycleBridgeHandler.kt (Android)

Handles WebView-to-host communication: ready signals, dismissal, result delivery, and optional relay listener registration.

```kotlin
class LifecycleBridgeHandler(private val activity: Activity) : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "ready" -> null  // No-op, WebView is ready
            "dismiss" -> {
                activity.finish()
                null
            }
            "setResult" -> {
                // Set Activity result and finish — delivers proof/error back to host app
                val resultJson = Json.encodeToString(params)
                val intent = Intent().putExtra("self_sdk_result", resultJson)
                activity.setResult(Activity.RESULT_OK, intent)
                activity.finish()
                null
            }
            "startRelayListener" -> {
                // Optional: start listening on a relay for incoming verification requests
                // Used when the host app wants to receive push-based verification triggers
                null
            }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown lifecycle method: $method")
        }
    }
}
```

---

## iOS Implementation

### Kotlin/Native cinterop

iOS handlers are written in Kotlin using `cinterop` to call Apple frameworks. Only 2 `.def` files are needed for the 3 iOS handlers (Lifecycle needs no cinterop).

#### CoreNFC.def

```
language = Objective-C
headers =
modules = CoreNFC
linkerOpts = -framework CoreNFC
```

#### LocalAuthentication.def

```
language = Objective-C
modules = LocalAuthentication
linkerOpts = -framework LocalAuthentication
```

Add to `build.gradle.kts`:
```kotlin
iosArm64 {
    compilations["main"].cinterops {
        create("CoreNFC")
        create("LocalAuthentication")
    }
}
iosSimulatorArm64 {
    compilations["main"].cinterops {
        create("CoreNFC") // Note: NFC won't work on simulator, but it needs to compile
        create("LocalAuthentication")
    }
}
```

### IosWebViewHost.kt

```kotlin
import platform.WebKit.*
import platform.Foundation.*

actual class IosWebViewHost {
    private lateinit var webView: WKWebView

    fun createWebView(): WKWebView {
        val config = WKWebViewConfiguration()

        // Register message handler: WebView → Native
        val handler = BridgeMessageHandler(router)
        config.userContentController.addScriptMessageHandler(handler, "SelfNativeIOS")

        webView = WKWebView(frame = CGRectZero, configuration = config)

        // Load bundled HTML from framework resources
        val bundleUrl = NSBundle.mainBundle.URLForResource("self-wallet/index", withExtension = "html")
        if (bundleUrl != null) {
            webView.loadFileURL(bundleUrl, allowingReadAccessToURL = bundleUrl.URLByDeletingLastPathComponent!!)
        }

        return webView
    }

    fun evaluateJs(js: String) {
        webView.evaluateJavaScript(js, completionHandler = null)
    }
}

class BridgeMessageHandler(private val router: MessageRouter) : NSObject(), WKScriptMessageHandlerProtocol {
    override fun userContentController(
        userContentController: WKUserContentController,
        didReceiveScriptMessage: WKScriptMessage,
    ) {
        val body = didReceiveScriptMessage.body as? String ?: return
        router.onMessageReceived(body)
    }
}
```

### NfcBridgeHandler.kt (iOS)

**Important:** iOS NFC passport reading is significantly more complex than Android because:
1. CoreNFC is Objective-C/Swift and the Kotlin/Native interop can be tricky
2. The existing `app/ios/PassportReader.swift` uses the third-party `NFCPassportReader` Swift library (CocoaPod)
3. Pure Kotlin/Native CoreNFC interop for passport reading (PACE, BAC, data group parsing) is very hard

**Recommended approach:** Create a thin Objective-C/Swift wrapper exposed via `@objc` that Kotlin can call through cinterop. The wrapper does the heavy lifting (calling `NFCPassportReader` library), and the Kotlin handler just bridges the JSON params.

```kotlin
// iOS NFC handler — calls into Swift helper via cinterop
class NfcBridgeHandler(private val router: MessageRouter) : BridgeHandler {
    override val domain = BridgeDomain.NFC

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "scan" -> scan(params)
            "cancelScan" -> null  // NFCPassportReader handles its own UI/cancel
            "isSupported" -> JsonPrimitive(NFCReaderSession.readingAvailable)
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown NFC method: $method")
        }
    }

    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        // Parse params, call into NFCPassportReaderWrapper (ObjC-exposed Swift)
        // The wrapper returns a JSON string with passport data
        // Parse and return as JsonElement
    }
}
```

**Reference:** The iOS flow from `app/ios/PassportReader.swift`:
1. Compute MRZ key (pad, checksum — same as Kotlin `MrzKeyUtils`)
2. Call `passportReader.readPassport(password: mrzKey, type: .mrz, tags: [.COM, .DG1, .SOD])`
3. Extract fields from passport object (documentType, MRZ, certificates, etc.)
4. Extract SOD data: `sod.getEncapsulatedContent()`, `sod.getSignedAttributes()`, `sod.getSignature()`
5. Return structured result

### BiometricBridgeHandler.kt (iOS)

```kotlin
import platform.LocalAuthentication.*

class BiometricBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "authenticate" -> authenticate(params)
            "isAvailable" -> isAvailable()
            "getBiometryType" -> getBiometryType()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown method: $method")
        }
    }

    private suspend fun authenticate(params: Map<String, JsonElement>): JsonElement {
        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate"
        val context = LAContext()

        return suspendCancellableCoroutine { cont ->
            context.evaluatePolicy(
                LAPolicy.LAPolicyDeviceOwnerAuthenticationWithBiometrics,
                localizedReason = reason,
            ) { success, error ->
                if (success) {
                    cont.resume(JsonPrimitive(true))
                } else {
                    cont.resumeWithException(
                        BridgeHandlerException("BIOMETRIC_ERROR", error?.localizedDescription ?: "Unknown error")
                    )
                }
            }
        }
    }

    private fun isAvailable(): JsonElement {
        val context = LAContext()
        val canEvaluate = context.canEvaluatePolicy(LAPolicy.LAPolicyDeviceOwnerAuthenticationWithBiometrics, error = null)
        return JsonPrimitive(canEvaluate)
    }

    private fun getBiometryType(): JsonElement {
        val context = LAContext()
        context.canEvaluatePolicy(LAPolicy.LAPolicyDeviceOwnerAuthenticationWithBiometrics, error = null)
        return when (context.biometryType) {
            LABiometryType.LABiometryTypeFaceID -> JsonPrimitive("faceId")
            LABiometryType.LABiometryTypeTouchID -> JsonPrimitive("touchId")
            else -> JsonPrimitive("none")
        }
    }
}
```

### LifecycleBridgeHandler.kt (iOS)

```kotlin
class LifecycleBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "ready" -> null
            "dismiss" -> {
                // Dismiss the presented UIViewController
                null
            }
            "setResult" -> {
                // Deliver verification result back to host app via callback
                null
            }
            "startRelayListener" -> {
                // Optional: start listening on a relay for incoming verification requests
                null
            }
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown lifecycle method: $method")
        }
    }
}
```

> **Note:** iOS does not need SecureStorageBridgeHandler as a separate handler — keychain access is managed by the Kotlin SecureStorageBridgeHandler in `commonMain` or handled through the same Android handler pattern compiled for iOS. The keychain stays native-managed. CameraMrzBridgeHandler is optional for iOS Phase 2 — if needed, it would use the Vision framework.

---

## Public API

### SelfSdk.kt (commonMain — expect)

```kotlin
expect class SelfSdk {
    companion object {
        fun configure(config: SelfSdkConfig): SelfSdk
    }

    fun launch(request: VerificationRequest, callback: SelfSdkCallback)
}
```

### SelfSdkConfig.kt

```kotlin
data class SelfSdkConfig(
    val endpoint: String = "https://api.self.xyz",
    val debug: Boolean = false,
)
```

### VerificationRequest.kt

```kotlin
data class VerificationRequest(
    val userId: String? = null,
    val scope: String? = null,
    val disclosures: List<String> = emptyList(),
)
```

### SelfSdkCallback.kt

```kotlin
interface SelfSdkCallback {
    fun onSuccess(result: VerificationResult)
    fun onFailure(error: SelfSdkError)
    fun onCancelled()
}

data class VerificationResult(
    val success: Boolean,
    val userId: String?,
    val verificationId: String?,
    val proof: String?,
    val claims: Map<String, String>?,
)

data class SelfSdkError(
    val code: String,
    val message: String,
)
```

### SelfSdk.android.kt (actual)

```kotlin
actual class SelfSdk private constructor(private val config: SelfSdkConfig) {
    actual companion object {
        actual fun configure(config: SelfSdkConfig): SelfSdk = SelfSdk(config)
    }

    actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
        // Start SelfVerificationActivity
        // Pass request via Intent extras
        // Register ActivityResult callback to receive result
        // Call callback.onSuccess/onFailure/onCancelled based on result
    }
}
```

### SelfSdk.ios.kt (actual)

```kotlin
actual class SelfSdk private constructor(private val config: SelfSdkConfig) {
    actual companion object {
        actual fun configure(config: SelfSdkConfig): SelfSdk = SelfSdk(config)
    }

    actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
        // Create UIViewController with WKWebView
        // Present it modally from the current UIViewController
        // Register lifecycle handler to receive setResult and deliver via callback
    }
}
```

---

## Common Models (from prototype — keep as-is)

### MrzKeyUtils.kt

Pure Kotlin, already correct in the prototype. ICAO 9303 check digit computation with `[7, 3, 1]` weighting.

### PassportScanResult.kt / NfcScanProgress.kt / NfcScanParams.kt

`@Serializable` data classes matching the TypeScript types in the bridge protocol spec. Already correct in the prototype.

---

## Asset Bundling

### How WebView HTML gets into the SDK

**Android:** Gradle task copies Vite output (`dist/`) into `src/main/assets/self-wallet/`:

```kotlin
// In build.gradle.kts
tasks.register<Copy>("copyWebViewAssets") {
    from("../../packages/webview-app/dist")
    into("src/main/assets/self-wallet")
}
tasks.named("preBuild") { dependsOn("copyWebViewAssets") }
```

**iOS:** XCFramework/SPM includes the bundle as a resource bundle.

**Dev mode:** Load from `http://10.0.2.2:5173` (Android emulator) or `http://localhost:5173` (iOS simulator) instead of bundled assets.

---

## Chunking Guide (Claude Code Sessions)

### Chunk 2A: KMP Project Setup + Bridge Protocol (start here)

**Goal:** Create `packages/kmp-sdk/` with Gradle KMP config, bridge protocol, common models.

**Steps:**
1. Delete `packages/kmp-shell/`
2. Create `packages/kmp-sdk/` directory structure
3. Create `build.gradle.kts` with KMP plugin, Android + iOS targets
4. Create `settings.gradle.kts`, `gradle.properties`, `libs.versions.toml`
5. Implement `commonMain/bridge/` — BridgeMessage, BridgeHandler, MessageRouter
6. Implement `commonMain/models/` — MrzKeyUtils, PassportScanResult, NfcScanParams, NfcScanProgress
7. Implement platform actuals (jvmMain, iosMain) for `currentTimeMillis()` and `generateUuid()`
8. Write unit tests in `commonTest/`
9. Validate: `./gradlew :shared:compileKotlinJvm && ./gradlew :shared:jvmTest`

### Chunk 2B: Android WebView Host

**Goal:** Android WebView hosting, JS injection, dev mode, asset bundling.

**Steps:**
1. Implement `androidMain/webview/AndroidWebViewHost.kt`
2. Implement `androidMain/webview/SelfVerificationActivity.kt`
3. Configure WebView security settings
4. Set up dev mode URL loading (`http://10.0.2.2:5173`)
5. Create Gradle task for copying Vite `dist/` into assets
6. Validate: `./gradlew :shared:compileDebugKotlinAndroid`

### Chunk 2C: Android Native Handlers (5 handlers)

**Goal:** The 5 native Android bridge handlers. Web fallbacks handle the rest.

**Steps (in priority order):**
1. `NfcBridgeHandler` — port from `RNPassportReaderModule.kt` (biggest effort)
2. `BiometricBridgeHandler` — BiometricPrompt wrapper
3. `SecureStorageBridgeHandler` — EncryptedSharedPreferences (keychain — native managed)
4. `CameraMrzBridgeHandler` — ML Kit text recognition
5. `LifecycleBridgeHandler` — Activity result delivery + relay listener
6. **DELETE** `CryptoBridgeHandler`, `DocumentsBridgeHandler`, `HapticBridgeHandler`, `AnalyticsBridgeHandler` (WebView handles via web fallbacks)
7. Validate: compile + unit tests

### Chunk 2D: iOS WebView Host + cinterop

**Goal:** iOS WebView hosting, cinterop definitions.

**Steps:**
1. Create `.def` files for CoreNFC and LocalAuthentication (only 2 needed)
2. Implement `iosMain/webview/IosWebViewHost.kt`
3. Configure WKWebView with WKScriptMessageHandler
4. Validate: `./gradlew :shared:compileKotlinIosArm64`

### Chunk 2E: iOS Native Handlers (3 handlers)

**Goal:** Only 3 iOS bridge handlers. Camera is optional Phase 2.

**Steps:**
1. `BiometricBridgeHandler` — LAContext (simplest, good to start)
2. `LifecycleBridgeHandler` — ViewController dismissal + relay listener
3. `NfcBridgeHandler` — CoreNFC via Swift wrapper (most complex)
4. Validate: compile for iOS targets

> **Phase 2 (optional):** `CameraMrzBridgeHandler` — Vision framework for MRZ scanning on iOS. Only needed if the WebView camera adapter proves insufficient.

### Chunk 2F: SDK Public API + Test App

**Goal:** Public API + test app on both platforms.

**Steps:**
1. Implement `commonMain/api/SelfSdk.kt` (expect) + actuals
2. Create `packages/kmp-test-app/` with Compose Multiplatform
3. Android test app: "Launch Verification" button -> `SelfSdk.launch()`
4. iOS test app: same button via SwiftUI wrapping KMP framework
5. Test on emulator/simulator
6. Configure `maven-publish` for AAR output
7. Configure XCFramework output + SPM `Package.swift`
8. Validate: test app builds and launches on both platforms

---

## Key Reference Files

| File | What to Look At |
|------|----------------|
| `app/android/.../RNPassportReaderModule.kt` | Android NFC implementation to port (PACE, BAC, DG reading, chip auth, passive auth) |
| `app/android/.../PassportNFC.kt` | Additional NFC utilities (if exists) |
| `app/ios/PassportReader.swift` | iOS NFC flow reference (MRZ key, readPassport call, SOD extraction) |
| `packages/kmp-shell/shared/` | Previous KMP prototype (bridge protocol, handler pattern, MRZ utils — all reusable) |
| `packages/webview-bridge/src/types.ts` | Bridge protocol TypeScript types (must match Kotlin exactly) |
| `packages/mobile-sdk-alpha/src/types/public.ts` | Adapter interfaces (what the WebView expects the bridge to implement) |
| `specs/SPECS.md` | Architecture overview with native handler matrix and web fallback rationale |
