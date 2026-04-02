## Scope KMP Android to 3-Domain Parity with Provider Delegation

> Last updated: 2026-04-01
> Status: Ready

- Workstream: kmp-revival
- Backlog IDs: KR-01
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The KMP SDK Android target registers 5 handlers (NFC, Camera, Biometric, SecureStorage, Lifecycle) but is missing the `crypto` handler that native-shells-lite provides. The Android SecureStorage handler hardcodes `EncryptedSharedPreferences` instead of delegating to a consumer-provided provider (the iOS target already delegates via `SdkProviderRegistry`). There are also gaps in WebView capabilities (no WebChromeClient, no query params), an incorrect SecureStorage response shape, and no bridge protocol version validation.

You are closing these gaps by:

1. Moving provider interfaces to `commonMain` so both platforms share the same contract
2. Making Android handlers delegate to providers (matching iOS pattern)
3. Shipping default Android provider implementations consumers can use or replace
4. Bringing WebView host to parity with native-shell-android

### Scope

- `packages/kmp-sdk/` only (primarily Android target + commonMain provider interfaces)
- 3 bridge domains: `secureStorage`, `crypto`, `lifecycle`
- Provider delegation: move interfaces to commonMain, add default Android implementations
- WebView host upgrades (WebChromeClient, query params)
- Bridge alignment (response shapes, protocol version)
- Android SDK slimming needed to make the 3-domain scope real: stop registering unused handlers, remove out-of-scope Android permissions, and drop no-longer-needed Android dependencies from the published artifact

### Out of Scope

- iOS target handler changes (see KR-02) — but iOS will benefit from the commonMain interface move
- `packages/native-shell-android/` — do not modify
- `packages/webview-bridge/` — bridge protocol unchanged
- `packages/webview-app/` — WebView code unchanged
- NFC, Camera, Biometric handler code — retain files but do not register
- Publishing (see KR-03)

### Implementation Steps

#### 1. Move provider interfaces to commonMain

Currently `SecureStorageProvider` and `CryptoProvider` live in `iosMain/kotlin/xyz/self/sdk/providers/`. Move them to `commonMain` so both platforms share the same contract.

**Move:**

- `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/SecureStorageProvider.kt` → `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/providers/SecureStorageProvider.kt`
- `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/CryptoProvider.kt` → `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/providers/CryptoProvider.kt`

The interfaces remain identical — same package (`xyz.self.sdk.providers`), same methods. The iOS handlers that reference them will compile without changes since `commonMain` is visible to `iosMain`.

**Current `SecureStorageProvider` interface (iosMain):**

```kotlin
interface SecureStorageProvider {
    fun get(key: String): String?
    fun set(key: String, value: String)
    fun remove(key: String)
    fun clear()
}
```

**Current `CryptoProvider` interface (iosMain):**

```kotlin
interface CryptoProvider {
    fun generateKey(keyRef: String)
    fun getPublicKey(keyRef: String): String?
    fun sign(keyRef: String, data: String): String?
    fun deleteKey(keyRef: String)
}
```

No changes to the interfaces themselves — just the source set location.

#### 2. Move SdkProviderRegistry to commonMain

**Current file:** `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/SdkProviderRegistry.kt`

**Current state:** iOS-only, requires all 8 providers (biometric, secureStorage, haptic, crypto, documents, nfc, cameraMrz, webView) to be non-null for `isConfigured()` to return true.

**Move to:** `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/providers/SdkProviderRegistry.kt`

**Rewrite for 3-domain scope:**

```kotlin
package xyz.self.sdk.providers

object SdkProviderRegistry {
    var secureStorage: SecureStorageProvider? = null
    var crypto: CryptoProvider? = null

    // Optional providers — retained for future handler registration
    var biometric: BiometricProvider? = null
    var haptic: HapticProvider? = null
    var documents: DocumentsProvider? = null
    var nfc: NfcProvider? = null
    var cameraMrz: CameraMrzProvider? = null
    var webView: WebViewProvider? = null

    /**
     * Returns true if the required 3-domain providers are configured.
     * Only secureStorage and crypto are required. WebView provider is
     * platform-specific (Android uses Activity-hosted WebView, iOS delegates).
     */
    fun isConfigured(): Boolean =
        secureStorage != null && crypto != null

    fun reset() {
        secureStorage = null
        crypto = null
        biometric = null
        haptic = null
        documents = null
        nfc = null
        cameraMrz = null
        webView = null
    }
}
```

**Key changes:**

- `isConfigured()` now checks only the 2 required providers (secureStorage, crypto) instead of all 8
- Added `reset()` for clean teardown between sessions
- Optional providers retained for future use but not required
- `webView` is kept optional — Android hosts WebView via Activity, iOS delegates to consumer

**Note:** The other provider interfaces (`BiometricProvider`, `HapticProvider`, etc.) that live in `iosMain` should remain there for now. Only move what's needed for the 3-domain scope. If they cause compile errors after moving `SdkProviderRegistry`, create empty `expect`/`actual` stubs or use nullable types (they're already nullable).

#### 3. Create default Android provider implementations

**New file:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/providers/EncryptedSharedPreferencesProvider.kt`

Extract the storage logic from the current `SecureStorageBridgeHandler` into a standalone provider:

```kotlin
package xyz.self.sdk.providers

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Default Android SecureStorageProvider using EncryptedSharedPreferences
 * backed by Android Keystore. Consumers can replace this with their own
 * implementation via SdkProviderRegistry.secureStorage.
 */
class EncryptedSharedPreferencesProvider(context: Context) : SecureStorageProvider {
    private val prefs: SharedPreferences

    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        prefs = EncryptedSharedPreferences.create(
            context,
            "self_sdk_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override fun get(key: String): String? = prefs.getString(key, null)
    override fun set(key: String, value: String) { prefs.edit().putString(key, value).apply() }
    override fun remove(key: String) { prefs.edit().remove(key).apply() }
    override fun clear() { prefs.edit().clear().apply() }
}
```

**New file:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/providers/AndroidKeystoreCryptoProvider.kt`

Extract crypto logic from `native-shell-android/.../handlers/CryptoHandler.kt`:

```kotlin
package xyz.self.sdk.providers

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Default Android CryptoProvider using AndroidKeyStore with secp256r1/SHA256withECDSA.
 * Consumers can replace this with their own implementation via SdkProviderRegistry.crypto.
 */
class AndroidKeystoreCryptoProvider : CryptoProvider {
    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    override fun generateKey(keyRef: String) {
        if (keyStore.containsAlias(keyRef)) {
            keyStore.deleteEntry(keyRef)
        }
        val spec = KeyGenParameterSpec.Builder(
            keyRef,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()
        KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply {
            initialize(spec)
            generateKeyPair()
        }
    }

    override fun getPublicKey(keyRef: String): String? {
        val cert = keyStore.getCertificate(keyRef) ?: return null
        return Base64.encodeToString(cert.publicKey.encoded, Base64.NO_WRAP)
    }

    override fun sign(keyRef: String, data: String): String? {
        val privateKey = keyStore.getKey(keyRef, null) ?: return null
        val dataBytes = Base64.decode(data, Base64.DEFAULT)
        val signature = Signature.getInstance("SHA256withECDSA").apply {
            initSign(privateKey as java.security.PrivateKey)
            update(dataBytes)
        }.sign()
        return Base64.encodeToString(signature, Base64.NO_WRAP)
    }

    override fun deleteKey(keyRef: String) {
        if (keyStore.containsAlias(keyRef)) {
            keyStore.deleteEntry(keyRef)
        }
    }
}
```

#### 4. Rewrite SecureStorageBridgeHandler to delegate to provider

**File:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/SecureStorageBridgeHandler.kt`

Replace the current handler (which hardcodes `EncryptedSharedPreferences`) with a provider-delegated version. This also fixes the `get()` response shape bug (currently returns bare primitives, needs `{ value: ... }` wrapping).

```kotlin
package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class SecureStorageBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = when (method) {
        "get" -> get(params)
        "set" -> set(params)
        "remove" -> remove(params)
        "clear" -> clear()
        else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown secureStorage method: $method")
    }

    private fun get(params: Map<String, JsonElement>): JsonElement {
        val provider = SdkProviderRegistry.secureStorage
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value = provider.get(key)
        return buildJsonObject {
            put("value", if (value != null) JsonPrimitive(value) else JsonNull)
        }
    }

    private fun set(params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.secureStorage
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value = params["value"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")
        provider.set(key, value)
        return null
    }

    private fun remove(params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.secureStorage
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        provider.remove(key)
        return null
    }

    private fun clear(): JsonElement? {
        val provider = SdkProviderRegistry.secureStorage
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")
        provider.clear()
        return null
    }
}
```

**Key changes from current:**

- No longer takes `Context` parameter (no direct EncryptedSharedPreferences)
- Delegates to `SdkProviderRegistry.secureStorage`
- `get()` returns `buildJsonObject { put("value", ...) }` instead of bare `JsonPrimitive`/`JsonNull`
- Throws `NOT_CONFIGURED` if provider not set (fail-closed)

#### 5. Add CryptoBridgeHandler for Android

**New file:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/CryptoBridgeHandler.kt`

The `androidMain` handlers directory currently has NFC, Camera, Biometric, SecureStorage, and Lifecycle — but no crypto handler. The iOS target has `CryptoBridgeHandler.kt` in `iosMain/` which delegates to `SdkProviderRegistry.crypto`. Create the same for Android.

Since both platforms now share `SdkProviderRegistry` in `commonMain`, the Android CryptoBridgeHandler can be **identical** to the iOS one. Consider moving it to `commonMain` as a shared handler, or keep platform-specific copies if the error handling differs.

**Recommended: move to commonMain** since the handler is purely provider-delegated with no platform imports:

**New file:** `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/handlers/CryptoBridgeHandler.kt`

```kotlin
package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class CryptoBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.CRYPTO

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = when (method) {
        "generateKey" -> generateKey(params)
        "getPublicKey" -> getPublicKey(params)
        "sign" -> sign(params)
        "deleteKey" -> deleteKey(params)
        else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown crypto method: $method")
    }

    private fun generateKey(params: Map<String, JsonElement>): JsonElement {
        val provider = SdkProviderRegistry.crypto
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")
        provider.generateKey(keyRef)
        return buildJsonObject {
            put("keyRef", JsonPrimitive(keyRef))
            put("success", JsonPrimitive(true))
        }
    }

    private fun getPublicKey(params: Map<String, JsonElement>): JsonElement {
        val provider = SdkProviderRegistry.crypto
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")
        val publicKey = provider.getPublicKey(keyRef)
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")
        return buildJsonObject {
            put("publicKey", JsonPrimitive(publicKey))
        }
    }

    private fun sign(params: Map<String, JsonElement>): JsonElement {
        val provider = SdkProviderRegistry.crypto
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")
        val data = params["data"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "data parameter required")
        val signature = provider.sign(keyRef, data)
            ?: throw BridgeHandlerException("SIGN_FAILED", "Signing failed for key: $keyRef")
        return buildJsonObject {
            put("signature", JsonPrimitive(signature))
        }
    }

    private fun deleteKey(params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.crypto
            ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")
        provider.deleteKey(keyRef)
        return null
    }
}
```

If moved to `commonMain`, **delete** the existing `iosMain/.../handlers/CryptoBridgeHandler.kt` to avoid duplicate class definitions.

Response shapes match `webview-bridge/src/adapters/crypto.ts`:

- `generateKey` → `{ keyRef: string, success: true }`
- `getPublicKey` → `{ publicKey: string }` (base64)
- `sign` → `{ signature: string }` (base64)

#### 6. Scope handler registration to 3 domains

**File:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/SelfVerificationActivity.kt`

**Current `registerHandlers()` (lines 88-103):**

```kotlin
private fun registerHandlers() {
    router.register(NfcBridgeHandler(this, router))
    router.register(CameraMrzBridgeHandler(this))
    router.register(BiometricBridgeHandler(this))
    router.register(SecureStorageBridgeHandler(this))
    router.register(LifecycleBridgeHandler(this))
}
```

**Change to:**

```kotlin
private fun registerHandlers() {
    router.register(SecureStorageBridgeHandler())   // no Context — delegates to provider
    router.register(CryptoBridgeHandler())           // delegates to provider
    router.register(LifecycleBridgeHandler(this))
}
```

**Also:**

- Remove `requiredPermissions` array, `permissionLauncher`, and the permission-check block in `onCreate()` (lines 29-56). The 3-domain scope does not need CAMERA or NFC permissions at startup. The WebChromeClient (step 8) handles camera permissions on-demand.
- Simplify `onCreate()` to call `initVerificationFlow()` directly.
- Add provider initialization before handler registration:

```kotlin
private fun initVerificationFlow() {
    // Register default providers if consumer hasn't set custom ones
    if (SdkProviderRegistry.secureStorage == null) {
        SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(this)
    }
    if (SdkProviderRegistry.crypto == null) {
        SdkProviderRegistry.crypto = AndroidKeystoreCryptoProvider()
    }

    // ... router setup, handler registration, WebView creation
}
```

This gives consumers the option to set their own providers before launching the Activity (via `SdkProviderRegistry.secureStorage = MyProvider()`), or get sensible defaults.

- Remove unused imports: `BiometricBridgeHandler`, `CameraMrzBridgeHandler`, `NfcBridgeHandler`, `Manifest`, `PackageManager`, `ActivityResultContracts`, `ContextCompat`.
- Add imports: `CryptoBridgeHandler`, `SdkProviderRegistry`, `EncryptedSharedPreferencesProvider`, `AndroidKeystoreCryptoProvider`.

#### 6a. Trim Android manifest and dependency surface

This ownership belongs to KR-01, not KR-03. KR-03 validates the trimmed artifact; KR-01 performs the actual slimming.

**Android manifest**

- Remove out-of-scope permissions and features from `shared/src/androidMain/AndroidManifest.xml` that are only needed for NFC, camera/MRZ, or haptics.
- Keep only permissions and features required by the scoped 3-domain Android delivery.

**Gradle dependencies**

- Remove Android dependencies from `shared/build.gradle.kts` that only exist to support out-of-scope handlers once those handlers are no longer registered.
- Expected removals include NFC/passport-reading, camera/MRZ, and biometric-specific dependencies if no remaining 3-domain code path needs them.
- Keep Android WebView, activity/lifecycle, and encrypted storage dependencies required by the scoped SDK.

**Artifact expectation**

- `shared-release.aar` should become smaller after this step because out-of-scope Android code paths and dependencies are no longer pulled into the published artifact.

#### 7. Add query param support to WebView URL loading

**File:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/AndroidWebViewHost.kt`

**Current `createWebView()` signature (line 37):** `fun createWebView(): WebView`

**Change to:** `fun createWebView(queryParams: String = ""): WebView`

**Update loadUrl calls (lines 129-139):**

```kotlin
// Before
webView.loadUrl("https://appassets.androidplatform.net/index.html")

// After
val baseUrl = "https://appassets.androidplatform.net/index.html"
val url = if (queryParams.isNotEmpty()) "$baseUrl?$queryParams" else baseUrl
webView.loadUrl(url)
```

Apply the same pattern to the debug URL (`http://127.0.0.1:5173`).

**Update caller in SelfVerificationActivity:** Build query params from intent extras (or `VerificationRequest` if available) and pass to `createWebView(queryParams)`. Reference `packages/native-shell-android/.../SelfVerificationActivity.kt:64-84` for the query string builder pattern using `buildString { }` with `Uri.encode()`.

The native-shell-android extracts 14 intent extras and encodes them. KMP currently only extracts `EXTRA_DEBUG_MODE`, `EXTRA_VERIFICATION_REQUEST`, and `EXTRA_CONFIG`. You need to either:

- Parse `EXTRA_VERIFICATION_REQUEST` JSON and build query params from it, or
- Add the same 14 intent extras as native-shell-android

The first approach is cleaner since KMP already has structured `VerificationRequest` types.

#### 8. Add WebChromeClient to AndroidWebViewHost

**File:** `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/AndroidWebViewHost.kt`

**Current (line 122):** After the `webViewClient` block, there is no `webChromeClient`.

**Port from:** `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/webview/AndroidWebViewHost.kt:109-173`

Add after the existing `webViewClient` block (after line 122):

```kotlin
webChromeClient = object : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest?) {
        request ?: return
        val origin = request.origin?.toString() ?: ""
        val isTrusted = origin.startsWith("https://appassets.androidplatform.net") ||
            (isDebugMode && origin.startsWith("http://127.0.0.1"))
        if (!isTrusted) {
            request.deny()
            return
        }

        val activity = context as? Activity ?: run {
            request.deny()
            return
        }

        val neededPermissions = mutableListOf<String>()
        if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
            neededPermissions.add(Manifest.permission.CAMERA)
        }
        if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
            neededPermissions.add(Manifest.permission.RECORD_AUDIO)
        }

        val missingPermissions = neededPermissions.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            pendingPermissionRequest = request
            ActivityCompat.requestPermissions(
                activity, missingPermissions.toTypedArray(), CAMERA_PERMISSION_REQUEST_CODE
            )
            return
        }

        request.grant(request.resources)
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?,
    ): Boolean {
        fileUploadCallback?.onReceiveValue(null)
        fileUploadCallback = filePathCallback
        val intent = fileChooserParams?.createIntent() ?: return false
        val activity = context as? Activity ?: run {
            fileUploadCallback = null
            return false
        }
        try {
            activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
        } catch (e: Exception) {
            fileUploadCallback = null
            return false
        }
        return true
    }
}
```

Add class-level fields:

```kotlin
var pendingPermissionRequest: PermissionRequest? = null
var fileUploadCallback: ValueCallback<Array<Uri>>? = null
```

Add companion object constants:

```kotlin
companion object {
    const val FILE_CHOOSER_REQUEST_CODE = 1001
    const val CAMERA_PERMISSION_REQUEST_CODE = 1002
}
```

**Also add permission result handling** to `SelfVerificationActivity`:

```kotlin
override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == AndroidWebViewHost.CAMERA_PERMISSION_REQUEST_CODE) {
        val pending = webViewHost.pendingPermissionRequest ?: return
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pending.grant(pending.resources)
        } else {
            pending.deny()
        }
        webViewHost.pendingPermissionRequest = null
    }
}

@Deprecated("Use Activity Result API")
override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode == AndroidWebViewHost.FILE_CHOOSER_REQUEST_CODE) {
        val results = if (resultCode == RESULT_OK && data != null) {
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        } else null
        webViewHost.fileUploadCallback?.onReceiveValue(results)
        webViewHost.fileUploadCallback = null
    }
}
```

#### 9. Add protocol version validation to MessageRouter

**File:** `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/bridge/MessageRouter.kt`

**Current (lines 26-32):** After parsing the BridgeRequest, handler lookup proceeds immediately with no version check.

**Add after parsing (line 32, before handler lookup):**

```kotlin
val request = json.decodeFromString<BridgeRequest>(rawJson)

// Add this check
if (request.version != BRIDGE_PROTOCOL_VERSION) {
    sendResponse(BridgeResponse(
        id = generateUuid(),
        domain = request.domain,
        requestId = request.id,
        success = false,
        error = BridgeError("UNSUPPORTED_VERSION", "Expected protocol version $BRIDGE_PROTOCOL_VERSION, got ${request.version}"),
    ))
    return
}
```

Add companion object constant (matching `webview-bridge/src/types.ts:152`):

```kotlin
companion object {
    const val BRIDGE_PROTOCOL_VERSION = 1

    fun escapeForJs(jsonStr: String): String { ... }  // existing
}
```

#### 10. Trim unused dependencies from build.gradle.kts

**File:** `packages/kmp-sdk/shared/build.gradle.kts`

**Remove or comment out these androidMain dependencies:**

```kotlin
// NFC/Passport — not needed for 3-domain scope
// implementation("org.jmrtd:jmrtd:0.8.1")
// implementation("net.sf.scuba:scuba-sc-android:0.0.18")
// implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
// implementation("commons-io:commons-io:2.14.0")

// Biometrics — not needed for 3-domain scope
// implementation("androidx.biometric:biometric:1.2.0-alpha05")

// Camera/MRZ — not needed for 3-domain scope
// implementation("com.google.mlkit:text-recognition:16.0.1")
// implementation("androidx.camera:camera-camera2:1.4.1")
// implementation("androidx.camera:camera-lifecycle:1.4.1")
// implementation("androidx.camera:camera-view:1.4.1")
```

**Keep:**

- `androidx.webkit:webkit` — WebView
- `androidx.security:security-crypto` — Default EncryptedSharedPreferencesProvider
- `androidx.appcompat:appcompat` — Activity
- `androidx.activity:activity-ktx` — Activity Result API
- `androidx.lifecycle:lifecycle-runtime-ktx` — Lifecycle
- `kotlinx.serialization` — Bridge JSON
- `kotlinx.coroutines` — Async handlers

### Files Created

| File                                                                         | Purpose                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `shared/src/commonMain/.../providers/SecureStorageProvider.kt`               | Moved from iosMain — shared interface                            |
| `shared/src/commonMain/.../providers/CryptoProvider.kt`                      | Moved from iosMain — shared interface                            |
| `shared/src/commonMain/.../providers/SdkProviderRegistry.kt`                 | Moved from iosMain — unified registry, 3-domain `isConfigured()` |
| `shared/src/commonMain/.../handlers/CryptoBridgeHandler.kt`                  | Provider-delegated crypto handler (replaces iOS-only version)    |
| `shared/src/androidMain/.../providers/EncryptedSharedPreferencesProvider.kt` | Default Android SecureStorageProvider                            |
| `shared/src/androidMain/.../providers/AndroidKeystoreCryptoProvider.kt`      | Default Android CryptoProvider                                   |

### Files Modified

| File                                                                | Change                                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shared/src/androidMain/.../handlers/SecureStorageBridgeHandler.kt` | Rewrite: delegate to provider, fix `get()` response shape                                                               |
| `shared/src/androidMain/.../webview/SelfVerificationActivity.kt`    | Register 3 handlers, default provider init, remove permission requests, add query params, add permission/file callbacks |
| `shared/src/androidMain/.../webview/AndroidWebViewHost.kt`          | Add WebChromeClient, query params, permission/file fields                                                               |
| `shared/src/commonMain/.../bridge/MessageRouter.kt`                 | Add protocol version validation                                                                                         |
| `shared/build.gradle.kts`                                           | Remove NFC/camera/biometric dependencies                                                                                |

### Files Deleted

| File                                                        | Reason                         |
| ----------------------------------------------------------- | ------------------------------ |
| `shared/src/iosMain/.../providers/SecureStorageProvider.kt` | Moved to commonMain            |
| `shared/src/iosMain/.../providers/CryptoProvider.kt`        | Moved to commonMain            |
| `shared/src/iosMain/.../providers/SdkProviderRegistry.kt`   | Moved to commonMain            |
| `shared/src/iosMain/.../handlers/CryptoBridgeHandler.kt`    | Replaced by commonMain version |

### Files NOT Modified

- `packages/native-shell-android/` — sibling, serves different consumers
- `packages/native-shell-ios/` — sibling, serves different consumers
- `packages/webview-bridge/` — bridge protocol unchanged
- `packages/webview-app/` — WebView code unchanged
- `packages/mobile-sdk-alpha/` — SDK core unchanged
- `app/` — RN app unaffected
- Existing NFC/Camera/Biometric handler source files in androidMain — retained, just not registered
- `packages/self-sdk-swift/` — iOS providers unchanged (KR-02 scope)

### Preconditions

- `packages/webview-app/` builds and `dist/` output exists (for asset bundling)
- `packages/webview-bridge/` bridge protocol types are stable

### Validation

```bash
# Build KMP Android
cd packages/kmp-sdk && ./gradlew :shared:assembleDebug

# Run existing tests (must not regress)
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Verify AAR artifact
cd packages/kmp-sdk && ./gradlew :shared:assembleRelease
ls -la shared/build/outputs/aar/shared-release.aar

# Verify provider delegation
# Add unit test: SdkProviderRegistry.isConfigured() returns false when providers are null
# Add unit test: SdkProviderRegistry.isConfigured() returns true with secureStorage + crypto set
# Add unit test: SecureStorageBridgeHandler throws NOT_CONFIGURED when provider is null
# Add unit test: CryptoBridgeHandler throws NOT_CONFIGURED when provider is null

# Verify response shapes
# Add unit test: SecureStorageBridgeHandler.get() returns JsonObject with "value" key
# Add unit test: CryptoBridgeHandler.generateKey returns { keyRef, success: true }
# Add unit test: CryptoBridgeHandler.getPublicKey returns { publicKey } (base64 string)
# Add unit test: CryptoBridgeHandler.sign returns { signature } (base64 string)

# Verify version validation
# Add unit test: MessageRouter rejects requests with wrong protocol version
```

### Definition of Done

- [ ] `SecureStorageProvider` and `CryptoProvider` interfaces live in `commonMain`
- [ ] `SdkProviderRegistry` lives in `commonMain` with 3-domain `isConfigured()` check
- [ ] `EncryptedSharedPreferencesProvider` ships as default Android SecureStorageProvider
- [ ] `AndroidKeystoreCryptoProvider` ships as default Android CryptoProvider
- [ ] `SecureStorageBridgeHandler` delegates to provider, `get()` returns `{ value: string | null }`
- [ ] `CryptoBridgeHandler` lives in `commonMain`, delegates to provider, handles `generateKey`, `getPublicKey`, `sign`, `deleteKey`
- [ ] `SelfVerificationActivity` registers only 3 handlers, initializes default providers
- [ ] Camera/NFC permission requests removed from Activity startup
- [ ] `MessageRouter` validates protocol version and rejects mismatches
- [ ] `AndroidWebViewHost` has `WebChromeClient` with permission + file upload handling
- [ ] `AndroidWebViewHost.createWebView()` supports query params
- [ ] Activity handles `onRequestPermissionsResult` and `onActivityResult` for WebChromeClient
- [ ] NFC/camera/biometric dependencies removed from `build.gradle.kts`
- [ ] All existing KMP tests pass (`./gradlew :shared:jvmTest`)
- [ ] Android AAR builds cleanly (`./gradlew :shared:assembleRelease`)

### Estimated PR Size

~600–900 LOC changed. Within the 1k–3k target.

### Status Log

- 2026-03-31: Plan created.
- 2026-04-01: Rewritten with provider delegation approach. Provider interfaces move to commonMain, Android gets default implementations (EncryptedSharedPreferencesProvider, AndroidKeystoreCryptoProvider). CryptoBridgeHandler shared across platforms. Verified all file references against codebase.
