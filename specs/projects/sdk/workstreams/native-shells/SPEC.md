# Person 2: Native Shells (KMP SDK + Swift Providers) — Implementation Spec

> Last updated: 2026-03-05
> Owner: Person 2 (Native Shells)
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Context

**What you own:**

- `packages/kmp-sdk/` — Kotlin Multiplatform SDK (Android + iOS targets)
- `packages/self-sdk-swift/` — Swift companion package for iOS providers
- Android native handlers (NFC, Camera, Biometrics, Keychain, Lifecycle)
- iOS native handlers (via Swift provider pattern — no cinterop)
- `SelfSdk.launch()` public API for host apps

**Architecture context:**

```
┌──────────────────────────────────────────────────┐
│                   HOST APP                        │
│          (MiniPay / Self Wallet / etc.)           │
└────────────────────┬─────────────────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │    YOUR LAYER (Person 2)        │
    │  ┌───────────┐  ┌────────────┐  │
    │  │  Android   │  │   iOS      │  │
    │  │  kmp-sdk   │  │  kmp-sdk + │  │
    │  │  (Kotlin)  │  │  Swift pkg │  │
    │  └─────┬─────┘  └──────┬─────┘  │
    │  NFC · Camera · Biometrics      │
    │  Keychain · Lifecycle           │
    │  ┌─────▼───────────────▼─────┐  │
    │  │   WebView Host            │  │
    │  │   (loads Person 1 bundle) │  │
    │  └─────────────┬─────────────┘  │
    └────────────────┼────────────────┘
                     │ JSON postMessage
    ┌────────────────▼────────────────┐
    │    BRIDGE PROTOCOL (Person 1)   │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │    WEBVIEW UI (Person 1)        │
    └─────────────────────────────────┘
```

**Dependencies:**

| Direction     | Person / Package | What                                              | Status |
| ------------- | ---------------- | ------------------------------------------------- | ------ |
| **You need**  | Person 1         | Vite bundle (`dist/`) loaded into your WebView    | Ready  |
| **You need**  | Person 1         | Bridge protocol types (`@selfxyz/webview-bridge`) | Ready  |
| **Needs you** | Person 5         | Bridge protocol as reference for RN handler       | Ready  |
| **Needs you** | Integrations     | `SelfSdk.launch()` API consumed by MiniPay sample | Done   |

**Status:**

- [x] Android: 5 handlers + WebView host + Activity
- [x] iOS: Swift providers wired (NFC, Biometrics, Lifecycle, WebView host)
- [x] Platform asymmetry contract documented and signed off
- [ ] SDK Public API finalize (chunk 2F — partial)
- [ ] Camera MRZ Handler iOS (chunk 2L — deferred Phase 2)

## Execution Model

- Durable workstream context lives in this file.
- PR-sized execution handoff lives under [`plans/`](./plans/).
- If you need to answer "what's next?", read the backlog table and active plans before reading the rest of this spec.

## Backlog

| ID | Title | Status | Priority | Depends On | Plan | PR |
| -- | ----- | ------ | -------- | ---------- | ---- | -- |
| NS-01 | Physical-device validation matrix for Android + iOS NFC flows | Ready | High | - | [plans/NS-01-physical-device-validation.md](./plans/NS-01-physical-device-validation.md) | - |
| NS-02 | iOS Camera MRZ Phase 2 | Deferred | Medium | NS-01 | - | - |
| NS-03 | Publishing readiness for AAR + XCFramework artifacts | Ready | High | NS-01 | [plans/NS-03-publishing-readiness.md](./plans/NS-03-publishing-readiness.md) | - |
| NS-04 | APDU allowlist in KMP NFC bridge handler | Ready | High | - | [plans/NS-04-apdu-allowlist.md](./plans/NS-04-apdu-allowlist.md) | - |
| NS-05 | LifecycleBridgeHandler type/error semantics on iOS | Ready | Low | - | [plans/NS-05-lifecycle-handler-semantics.md](./plans/NS-05-lifecycle-handler-semantics.md) | - |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan | IDs | Status |
| ---- | --- | ------ |
| [plans/NS-01-physical-device-validation.md](./plans/NS-01-physical-device-validation.md) | NS-01 | Ready |
| [plans/NS-03-publishing-readiness.md](./plans/NS-03-publishing-readiness.md) | NS-03 | Ready |
| [plans/NS-04-apdu-allowlist.md](./plans/NS-04-apdu-allowlist.md) | NS-04 | Ready |
| [plans/NS-05-lifecycle-handler-semantics.md](./plans/NS-05-lifecycle-handler-semantics.md) | NS-05 | Ready |

## Completion Checklist

- [ ] Backlog rows reflect reality
- [ ] Open PR-sized work has a linked plan file
- [ ] Deferred work is explicitly marked deferred
- [ ] Completed work is reflected here and in [SDK Overview](../../OVERVIEW.md) when system status changes

## Overview

You are building the native side of the Self Mobile SDK — the Kotlin Multiplatform module (`packages/kmp-sdk/`) and the Swift companion package (`packages/self-sdk-swift/`). This means hosting a WebView containing Person 1's Vite bundle, routing bridge messages from the WebView to native handlers, and providing `SelfSdk.launch()` as the public API for host apps. On Android, handlers are written directly in Kotlin. On iOS, handlers delegate to Swift provider implementations via a factory pattern (cinterop is abandoned). This matters because it is the only native code standing between third-party host apps and the verification flow — it must be thin, correct, and easy to integrate.

## Prerequisites

- Familiarity with Kotlin Multiplatform (KMP), Gradle KMP plugin, `expect`/`actual` pattern
- Familiarity with Swift Package Manager (SPM), `WKWebView`, `WKScriptMessageHandler`
- **Bridge protocol** = versioned JSON over `postMessage` (10 domains, request/response/event)
- **Handler** = native-side implementation of a bridge domain (e.g., `NfcBridgeHandler`)
- **Provider** = Swift protocol implementation injected into KMP iOS handlers via factory pattern
- Read [SDK Overview](../../OVERVIEW.md) for architecture context and the full decision matrix

## The Problem

The Self Wallet is a monolithic React Native app where all logic, NFC, proving, and UI are tangled together. To ship an embeddable SDK:

| Problem area                               | Issue                                                                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/kmp-shell/` (deleted)            | Previous KMP experiment — bridge protocol and handler pattern are sound, but module structure needed rebuild as proper KMP SDK with Android target (not just JVM + iOS) |
| `androidMain/handlers/` — 4 extra handlers | Documents, Crypto, Analytics, Haptic handlers exist but are unnecessary — WebView handles them via web fallbacks. 511 LOC to delete.                                    |
| `iosMain/handlers/` — cinterop approach    | Kotlin/Native cinterop with Apple frameworks blocked by Xcode SDK compatibility issues. Stubs in place, nothing functional.                                             |
| `packages/self-sdk-swift/`                 | Swift companion package for iOS providers (NFC, Biometrics, WebView hosting) is now implemented                                                                         |
| No public API for host apps                | `SelfSdk.launch()` exists as expect/actual skeleton but iOS side has no working implementation                                                                          |

## Design Principles

1. **No logic in native handlers.** Your handlers are thin bridges between the WebView's JSON requests and platform APIs. All verification logic, state management, and proof generation live in TypeScript inside the WebView. If you're writing logic in Kotlin or Swift, you're doing it wrong.
2. **Only bridge to native what the browser cannot do.** You bridge NFC (hardware), camera (hardware), biometrics (OS prompt), keychain (host-app-managed), and lifecycle (Activity/VC management). Documents (IndexedDB), crypto hashing (Web Crypto), analytics (fetch), and haptic (skipped) run inside the WebView.
3. **No parsing, formatting, or validation in Kotlin or Swift.** The WebView sends you ready-to-use parameters; your native code calls platform APIs and returns raw results. JSON structure decisions belong to the TypeScript bridge layer.
4. **cinterop stays disabled.** You make all Apple framework calls in Swift via the provider pattern. Your Kotlin iOS handlers only call provider interface methods.
5. **Callback-based Swift APIs bridge to Kotlin suspend functions.** Your Swift closures dispatch to main queue; your Kotlin handlers use `suspendCancellableCoroutine` to bridge.

## Definition of Done

> **Done when:** The KMP test app builds and runs on both Android emulator and iOS simulator, `SelfSdk.launch()` presents a WebView that loads the Vite bundle, bridge messages flow through all registered handlers, and an NFC passport scan on a physical device produces a verified proof delivered back to the host app via `SelfSdkCallback`.

## Web Fallback Migration

Delete four Android handlers -- the WebView handles their functionality using standard web APIs. This reduces native code, eliminates iOS porting work, and keeps behavior consistent across platforms.

| Deleted Handler            | LOC Removed | Web Fallback        | Notes                                                                                                                              |
| -------------------------- | ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **DocumentsBridgeHandler** | 146 LOC     | IndexedDB           | WebView stores documents in IndexedDB; no native file I/O needed                                                                   |
| **CryptoBridgeHandler**    | 177 LOC     | Web Crypto API      | Hashing and key derivation run in Web Crypto; signing keys live in SecureStorage (native keychain), accessed via biometrics bridge |
| **AnalyticsBridgeHandler** | 94 LOC      | `console` / `fetch` | Analytics events logged via console or sent via fetch from the WebView; fire-and-forget                                            |
| **HapticBridgeHandler**    | 94 LOC      | Skipped             | Haptic feedback is not critical to verification flow; WebView skips it                                                             |

**Total savings:** 511 LOC deleted from Android, 6 fewer iOS handlers to build. See the Decision Matrix in [SDK Overview](../../OVERVIEW.md) for the full architecture rationale.

> **Keychain note:** SecureStorage stays native because host apps (like MiniPay) control keychain access policy. The WebView must not have direct keychain access.

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
          LifecycleBridgeHandler.kt    # WebView <-> host communication + relay listener

      iosMain/kotlin/xyz/self/sdk/
        api/
          SelfSdk.ios.kt           # actual class — iOS implementation
        providers/                  # Factory interfaces (Swift wrapper pattern)
          NfcProvider.kt            # NFC passport scanning
          BiometricProvider.kt      # Face ID / Touch ID
          WebViewProvider.kt        # WKWebView hosting
          SdkProviderRegistry.kt    # Central registry (4 providers)
        webview/
          IosWebViewHost.kt        # Delegates to WebViewProvider
        handlers/
          NfcBridgeHandler.kt          # NFC scan via provider
          BiometricBridgeHandler.kt    # Biometrics via provider
          LifecycleBridgeHandler.kt    # WebView <-> host communication (self-contained, no provider)

    nativeInterop/
      cinterop/
        CoreNFC.def               # DISABLED — kept for reference only
        LocalAuthentication.def   # DISABLED — kept for reference only

  build.gradle.kts              # KMP plugin, Android + iOS targets

packages/self-sdk-swift/                    # Swift companion package
  Package.swift                             # SPM package definition
  Sources/SelfSdkSwift/
    SelfSdkSwift.swift                      # Public setup API: SelfSdkSwift.configure()
    Providers/
      NfcProviderImpl.swift                 # Wraps NfcPassportHelper
      BiometricProviderImpl.swift           # LAContext wrapper
      WebViewProviderImpl.swift             # WKWebView wrapper
    Helpers/
      NfcPassportHelper.swift               # Moved from test app (274 lines)

packages/kmp-sdk-test-app/
  shared/                       # Shared KMP app code
  androidApp/                   # Android test app (Compose)
  iosApp/                       # iOS test app (SwiftUI)
  build.gradle.kts
```

## Scope of Work

### 1. KMP Project Structure and Gradle Configuration

**Create:** `packages/kmp-sdk/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)  // Android library target
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
                implementation("androidx.biometric:biometric:1.1.0")
                // Encrypted storage (keychain)
                implementation("androidx.security:security-crypto:1.1.0")
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

> **Note:** cinterop blocks (lines 32-62 in original) are removed/commented out. All Apple framework calls happen in Swift.

### 2. Bridge Protocol (Kotlin Side)

The bridge protocol is the shared contract with Person 1. The Kotlin implementation mirrors the TypeScript types exactly.

#### BridgeMessage.kt

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

#### BridgeHandler.kt

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

#### MessageRouter.kt

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
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    return "'$escaped'"
}
```

#### Input / Output — Bridge Message Round-Trip

**Input (WebView -> Native):**

```json
{
  "type": "request",
  "version": 1,
  "id": "a1b2c3d4-...",
  "domain": "nfc",
  "method": "scan",
  "params": {
    "passportNumber": "AB1234567",
    "dateOfBirth": "900115",
    "dateOfExpiry": "300115"
  },
  "timestamp": 1708200000000
}
```

**Expected Output (Native -> WebView, success):**

```json
{
  "type": "response",
  "version": 1,
  "id": "r9s0t1u2-...",
  "domain": "nfc",
  "requestId": "a1b2c3d4-...",
  "success": true,
  "data": { "passportData": { "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<..." } },
  "timestamp": 1708200010000
}
```

**Edge case — unknown domain:**

```text
Input:  { "domain": "unknown_domain", ... }
Output: Response with success: false, error: { "code": "HANDLER_NOT_FOUND", "message": "No handler for domain: unknown_domain" }
```

**Edge case — malformed JSON:**

```text
Input:  "not valid json {{"
Output: Response with success: false, error: { "code": "PARSE_ERROR", "message": "Failed to parse bridge request" }
```

### 3. Android WebView Host

#### AndroidWebViewHost.kt

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

            // JS interface: WebView -> Native
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

#### SelfVerificationActivity.kt

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

        // Register native handlers (5 total -- web fallbacks handle the rest)
        router.register(NfcBridgeHandler(this, router))
        router.register(BiometricBridgeHandler(this))
        router.register(SecureStorageBridgeHandler(this))  // Keychain -- native managed
        router.register(CameraMrzBridgeHandler(this))
        router.register(LifecycleBridgeHandler(this))
        // DELETED: CryptoBridgeHandler -- Web Crypto handles hashing
        // DELETED: HapticBridgeHandler -- WebView skips haptic feedback
        // DELETED: AnalyticsBridgeHandler -- WebView uses console/fetch
        // DELETED: DocumentsBridgeHandler -- WebView uses IndexedDB

        // Create and show WebView
        webViewHost = AndroidWebViewHost(this, router)
        setContentView(webViewHost.createWebView())
    }
}
```

### 4. Android Native Handlers (5 Handlers)

#### NfcBridgeHandler.kt (Android)

**This is the most complex handler.** Port from `app/android/react-native-passport-reader/android/src/main/java/io/tradle/nfc/RNPassportReaderModule.kt`.

Key changes from the RN module:

1. Remove all React Native dependencies (`ReactApplicationContext`, `Promise`, `WritableMap`, `ReadableMap`, `DeviceEventManagerModule`)
2. Replace `AsyncTask` with Kotlin coroutines (`suspend fun`)
3. Use `NfcAdapter.enableReaderMode()` instead of `enableForegroundDispatch()` (better for SDK embedding -- doesn't require the host's Activity to handle intents)
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

##### Input / Output — NFC Scan

**Input:**

```json
{
  "method": "scan",
  "params": {
    "passportNumber": "AB1234567",
    "dateOfBirth": "900115",
    "dateOfExpiry": "300115"
  }
}
```

**Expected Output:**

```json
{ "success": true, "data": { "passportData": { "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<...", "dsc": "-----BEGIN CERTIFICATE-----\nMIIC...", "dg1Hash": [72, 101, 108, ...], "eContent": [...], "signedAttr": [...], "encryptedDigest": [...], "documentType": "passport", "parsed": true, "mock": false } } }
```

**Edge case — NFC not available:**

```
Input:  { "method": "isSupported" }
Output: false (device has no NFC adapter)
```

**Edge case — tag connection lost mid-scan:**

```
Input:  { "method": "scan", "params": { ... } }
Output: BridgeHandlerException("NFC_CONNECTION_LOST", "Tag was lost during read")
```

#### BiometricBridgeHandler.kt (Android)

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

##### Input / Output — Biometric Authenticate

**Input:**

```json
{ "method": "authenticate", "params": { "reason": "Confirm your identity" } }
```

**Expected Output:**

```json
true
```

**Edge case — user cancels prompt:**

```
Input:  { "method": "authenticate", "params": { "reason": "Confirm" } }
Output: BridgeHandlerException("BIOMETRIC_ERROR", "User cancelled")
```

#### SecureStorageBridgeHandler.kt (Android)

Uses `EncryptedSharedPreferences` backed by Android Keystore. This handler stays native because host apps (like MiniPay) control keychain access policy — the WebView must not have direct keychain access.

```kotlin
class SecureStorageBridgeHandler(context: Context) : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "self_sdk_secure_prefs",
        masterKey,
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

##### Input / Output — SecureStorage

**Input:**

```json
{
  "method": "set",
  "params": { "key": "signing_key", "value": "base64-encoded-key-data" }
}
```

**Expected Output:**

```text
null (void — no return value)
```

**Edge case — get missing key:**

```text
Input:  { "method": "get", "params": { "key": "nonexistent" } }
Output: JsonNull
```

#### CameraMrzBridgeHandler.kt (Android)

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

#### LifecycleBridgeHandler.kt (Android)

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
                // Set Activity result and finish -- delivers proof/error back to host app
                val resultJson = Json.encodeToString(params)
                val intent = Intent().putExtra("self_sdk_result", resultJson)
                activity.setResult(Activity.RESULT_OK, intent)
                activity.finish()
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

##### Input / Output — Lifecycle setResult

**Input:**

```json
{
  "method": "setResult",
  "params": { "success": true, "data": { "proof": "..." } }
}
```

**Expected Output:**

```
null (void — Activity sets result and finishes)
```

**Edge case — dismiss without result:**

```
Input:  { "method": "dismiss" }
Output: null (Activity finishes, host app sees RESULT_CANCELLED)
```

### 5. iOS Provider Interfaces (Swift Wrapper Pattern)

The original cinterop approach is abandoned due to Xcode SDK compatibility issues. Instead, Kotlin `iosMain` defines factory interfaces that Swift implementations register at startup.

#### SdkProviderRegistry.kt

```kotlin
package xyz.self.sdk.providers

/**
 * Central registry for iOS native provider implementations.
 * Swift companion package calls SdkProviderRegistry.configure() at app startup.
 *
 * Required providers: NFC, Biometric, WebView, SecureStorage.
 * No in-memory fallback is allowed for secureStorage.
 * Documents, Crypto, Analytics, Haptic are handled by web fallbacks inside the WebView.
 */
object SdkProviderRegistry {
    var nfc: NfcProvider? = null
    var biometric: BiometricProvider? = null
    var webView: WebViewProvider? = null
    var secureStorage: SecureStorageProvider? = null

    /**
     * Returns true if all required providers (NFC, Biometric, WebView, SecureStorage) are registered.
     */
    fun isConfigured(): Boolean = nfc != null && biometric != null && webView != null && secureStorage != null
}
```

#### NfcProvider.kt

```kotlin
package xyz.self.sdk.providers

interface NfcProvider {
    fun isAvailable(): Boolean
    fun scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: (stateIndex: Int, percent: Int, message: String) -> Unit,
        onComplete: (success: Boolean, jsonResult: String) -> Unit,
    )
    fun cancelScan()
}
```

#### BiometricProvider.kt

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

#### WebViewProvider.kt

```kotlin
package xyz.self.sdk.providers

import platform.UIKit.UIView
import platform.UIKit.UIViewController

interface WebViewProvider {
    fun createWebView(
        onMessageReceived: (String) -> Unit,
        isDebugMode: Boolean,
    ): UIView
    fun evaluateJs(js: String)
    fun getViewController(): UIViewController
}
```

### 6. iOS Native Handlers (3 Handlers + required secureStorage provider)

Only 3 custom iOS handlers are needed (down from 9 in the original spec). `secureStorage` remains required and native-managed via provider-backed bridge wiring.

| Handler        | Why Native?                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| **NFC**        | Hardware — browser cannot access NFC chip                                     |
| **Biometrics** | OS prompt — Face ID / Touch ID requires native LAContext                      |
| **Lifecycle**  | ViewController management — dismiss/result delivery needs native VC reference |

#### BiometricBridgeHandler.kt (iOS)

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

#### LifecycleBridgeHandler.kt (iOS)

Self-contained in Kotlin -- no Swift provider needed. Uses `SelfSdkCallback` reference and dismiss action set by `SelfSdk.ios.kt`.

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

#### NfcBridgeHandler.kt (iOS)

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

### 7. Swift Companion Package

#### Package.swift

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
        .package(url: "https://github.com/AndyQ/NFCPassportReader", .upToNextMinor(from: "2.3.0")),
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

#### SelfSdkSwift.swift -- Public Setup API

```swift
import Foundation
import SelfSdk  // KMP XCFramework

public class SelfSdkSwift {
    /// Call this at app startup to register all default Swift provider implementations.
    /// After calling this, SelfSdk.launch() will work on iOS.
    ///
    /// Required providers registered:
    /// - NFC (hardware access)
    /// - Biometric (OS prompt)
    /// - WebView (WKWebView hosting)
    /// - SecureStorage (native keychain boundary)
    ///
    /// Documents, Crypto, Analytics, and Haptic are handled by web
    /// fallbacks inside the WebView -- no native providers needed.
    public static func configure() {
        let registry = SdkProviderRegistry.shared
        registry.nfc = NfcProviderImpl()
        registry.biometric = BiometricProviderImpl()
        registry.webView = WebViewProviderImpl()
        registry.secureStorage = SecureStorageProviderImpl()
    }
}
```

#### BiometricProviderImpl.swift

```swift
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

#### NfcProviderImpl.swift

```swift
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
        nfcHelper?.cancel()  // Explicitly invalidate session before release
        nfcHelper = nil
    }
}
```

#### WeakScriptMessageHandler.swift (weak proxy to avoid retain cycle)

```swift
import WebKit

final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    init(_ delegate: WKScriptMessageHandler) {
        self.delegate = delegate
        super.init()
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(controller, didReceive: message)
    }
}
```

#### WebViewProviderImpl.swift

```swift
import WebKit
import UIKit
import SelfSdk

class WebViewProviderImpl: NSObject, WebViewProvider, WKScriptMessageHandler {
    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String) -> Void)?
    private weak var scriptMessageHandlerProxy: WeakScriptMessageHandler?

    func createWebView(onMessageReceived: @escaping (String) -> Void, isDebugMode: Bool) -> UIView {
        self.onMessageReceived = onMessageReceived

        let config = WKWebViewConfiguration()
        let proxy = WeakScriptMessageHandler(self)
        self.scriptMessageHandlerProxy = proxy
        config.userContentController.add(proxy, name: "SelfNativeIOS")

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.scrollView.isScrollEnabled = true
        self.webView = wv

        if isDebugMode {
            wv.load(URLRequest(url: URL(string: "http://localhost:5173")!))
        } else {
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

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "SelfNativeIOS")
    }

    // WKScriptMessageHandler (called via WeakScriptMessageHandler proxy)
    func userContentController(_ controller: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard let body = message.body as? String else { return }
        onMessageReceived?(body)
    }
}
```

### 8. Public API

#### SelfSdk.kt (commonMain -- expect)

```kotlin
expect class SelfSdk {
    companion object {
        fun configure(config: SelfSdkConfig): SelfSdk
    }

    fun launch(request: VerificationRequest, callback: SelfSdkCallback)
}
```

#### SelfSdkConfig.kt

```kotlin
data class SelfSdkConfig(
    val endpoint: String = "https://api.self.xyz",
    val debug: Boolean = false,
)
```

#### VerificationRequest.kt

```kotlin
data class VerificationRequest(
    val userId: String? = null,
    val scope: String? = null,
    val disclosures: List<String> = emptyList(),
)
```

#### SelfSdkCallback.kt

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
    val claims: Map<String, Any?>?,
)

data class SelfSdkError(
    val code: String,
    val message: String,
)
```

#### SelfSdk.android.kt (actual)

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

#### SelfSdk.ios.kt (actual)

```kotlin
actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
    check(SdkProviderRegistry.isConfigured()) {
        "iOS requires Swift providers. Call SelfSdkSwift.configure() at app startup."
    }

    val router = MessageRouter(
        sendToWebView = { js -> webViewHost?.evaluateJs(js) }
    )

    // Register iOS handlers; secureStorage remains native-managed via provider-backed bridge wiring
    val lifecycleHandler = LifecycleBridgeHandler().apply {
        pendingCallback = callback
        dismissAction = {
            val vc = SdkProviderRegistry.webView?.getViewController()
            vc?.dismiss(animated = true, completion = null)
        }
    }

    router.register(BiometricBridgeHandler())
    router.register(lifecycleHandler)
    router.register(NfcBridgeHandler(router))
    // Documents  -> IndexedDB in WebView
    // Crypto     -> Web Crypto API in WebView
    // Analytics  -> console/fetch in WebView
    // Haptic     -> skipped (not critical)
    // SecureStorage -> via SecureStorageProvider (factory pattern, same as NFC/Biometrics)

    // Create WebView
    webViewHost = IosWebViewHost(router, config.debug)
    webViewHost?.createWebView()

    // Present modally
    val sdkViewController = webViewHost?.getViewController() as UIViewController
    sdkViewController.modalPresentationStyle = UIModalPresentationFullScreen
    findTopViewController()?.present(sdkViewController, animated = true, completion = null)
}

private fun findTopViewController(): UIViewController? {
    val scene = UIApplication.sharedApplication.connectedScenes
        .filterIsInstance<UIWindowScene>()
        .firstOrNull { it.activationState == UIScene.ActivationState.foregroundActive }
    val window = scene?.windows?.firstOrNull { it.isKeyWindow }
    var vc = window?.rootViewController
    while (vc?.presentedViewController != null) {
        vc = vc?.presentedViewController
    }
    return vc
}
```

### 9. Asset Bundling

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

### 10. Common Models (from prototype -- keep as-is)

#### MrzKeyUtils.kt

Pure Kotlin, already correct in the prototype. ICAO 9303 check digit computation with `[7, 3, 1]` weighting.

#### PassportScanResult.kt / NfcScanProgress.kt / NfcScanParams.kt

`@Serializable` data classes matching the TypeScript types in the bridge protocol spec. Already correct in the prototype.

---

## Files You Will Modify

| File                                                                         | Change                                                                | Risk                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/kmp-sdk/shared/build.gradle.kts`                                   | Add Android library target, disable cinterop, configure iOS framework | **Med** -- Gradle config affects all compilations |
| `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/bridge/`         | Bridge protocol types, router                                         | **Low** -- new files in correct structure         |
| `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/`      | 5 native handlers, delete 4 web-fallback handlers                     | **Med** -- NFC handler is complex port            |
| `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/webview/`       | WebView host + Activity                                               | **Low** -- standard Android patterns              |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/providers/`         | 3 provider interfaces + registry                                      | **Low** -- interfaces only                        |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/`          | 3 iOS handlers delegating to providers                                | **Low** -- thin delegation                        |
| `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/api/SelfSdk.ios.kt` | iOS launch flow using providers                                       | **Med** -- VC presentation logic                  |
| `packages/self-sdk-swift/`                                                   | Entire Swift companion package (new)                                  | **Med** -- new package, SPM config                |
| `packages/kmp-sdk-test-app/iosApp/iosApp/iOSApp.swift`                       | Replace manual factory registrations with `SelfSdkSwift.configure()`  | **Low** -- one-line change                        |

## Files You Will NOT Modify

| File                              | Why                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/webview-bridge/src/*`   | Owned by Person 1 (WebView UI + Bridge). Bridge protocol TypeScript types are read-only reference. |
| `packages/webview-app/src/*`      | Owned by Person 1. Vite bundle is consumed as-is.                                                  |
| `packages/mobile-sdk-alpha/src/*` | Owned by Person 4 (SDK Core). Adapter interfaces are read-only reference.                          |
| `common/src/*`                    | Shared utilities -- stable, no changes needed.                                                     |
| `app/`                            | Self Wallet app -- out of scope for SDK work.                                                      |
| `packages/rn-sdk/`                | Owned by Person 5 (RN Native Shell). Does not exist yet.                                           |

---

## Chunking Guide

### Chunk 2A: KMP Project Setup + Bridge Protocol -- S ~3k tokens

**Goal:** Create `packages/kmp-sdk/` with Gradle KMP config, bridge protocol types, common models.

**You Will NOT:**

- Add any logic beyond serialization/deserialization to bridge types
- Parse or validate passport data in common models -- that happens in the WebView
- Import any Android or iOS framework dependencies in `commonMain`
- Modify any files in `packages/webview-bridge/` (read-only reference)

**Steps:**

1. Delete `packages/kmp-shell/` entirely
2. Create `packages/kmp-sdk/` directory structure per the Directory Structure section
3. Create `build.gradle.kts` with KMP plugin, Android + iOS targets (cinterop disabled)
4. Create `settings.gradle.kts`, `gradle.properties`, `libs.versions.toml`
5. Implement `commonMain/bridge/` -- BridgeMessage, BridgeHandler, MessageRouter
6. Implement `commonMain/models/` -- MrzKeyUtils, PassportScanResult, NfcScanParams, NfcScanProgress
7. Implement platform actuals (jvmMain, iosMain) for `currentTimeMillis()` and `generateUuid()`
8. Write unit tests in `commonTest/`
9. Validate: `./gradlew :shared:compileKotlinJvm && ./gradlew :shared:jvmTest`

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinJvm && ./gradlew :shared:jvmTest
```

**Expected Output:**

```
BUILD SUCCESSFUL
All tests passed (MessageRouterTest, MrzKeyUtilsTest)
```

#### Tests

| Test                                               | Type | What it validates                                                |
| -------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `MessageRouterTest` — route to registered handler  | Unit | Router dispatches request to correct handler by domain           |
| `MessageRouterTest` — unknown domain returns error | Unit | Router returns `HANDLER_NOT_FOUND` error for unregistered domain |
| `MessageRouterTest` — malformed JSON returns error | Unit | Router handles parse failures gracefully                         |
| `MrzKeyUtilsTest` — ICAO 9303 check digits         | Unit | MRZ key derivation matches known test vectors                    |
| `MrzKeyUtilsTest` — padding with `<`               | Unit | Short passport numbers are padded correctly                      |

**Status: DONE**

---

### Chunk 2B: Android WebView Host -- S ~2k tokens

**Depends on:** Chunk 2A

**Goal:** Android WebView hosting, JS injection, dev mode URL loading, asset bundling Gradle task.

**You Will NOT:**

- Add any verification logic to the WebView host -- it only loads HTML and passes messages
- Modify the bridge protocol types from Chunk 2A
- Enable `allowFileAccess` or `allowContentAccess` on the WebView (security)

**Steps:**

1. Implement `androidMain/webview/AndroidWebViewHost.kt`
2. Implement `androidMain/webview/SelfVerificationActivity.kt`
3. Configure WebView security settings (JS enabled, DOM storage, file access disabled)
4. Set up dev mode URL loading (`http://10.0.2.2:5173`)
5. Create Gradle task for copying Vite `dist/` into assets
6. Validate: `./gradlew :shared:compileDebugKotlinAndroid`

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
```

**Expected Output:**

```
BUILD SUCCESSFUL
```

#### Tests

| Test                         | Type       | What it validates                                                           |
| ---------------------------- | ---------- | --------------------------------------------------------------------------- |
| Android compilation succeeds | Build gate | WebView host compiles against Android SDK 35                                |
| WebView security settings    | Manual     | `allowFileAccess=false`, `allowContentAccess=false` verified in code review |

**Status: DONE**

---

### Chunk 2C: Android Native Handlers (5 handlers) -- L ~12k tokens

**Depends on:** Chunk 2B

**Goal:** The 5 native Android bridge handlers. Delete the 4 web-fallback handlers.

**You Will NOT:**

- Add any verification logic, proof generation, or state management to handlers
- Parse passport MRZ data beyond what JMRTD returns -- pass raw results back
- Format or transform JSON in handlers -- return `JsonElement` directly from platform APIs
- Validate proof correctness in handlers -- that is the WebView's job
- Keep DocumentsBridgeHandler, CryptoBridgeHandler, HapticBridgeHandler, or AnalyticsBridgeHandler

**Steps (in priority order):**

1. `NfcBridgeHandler` -- port from `RNPassportReaderModule.kt` (biggest effort)
2. `BiometricBridgeHandler` -- BiometricPrompt wrapper
3. `SecureStorageBridgeHandler` -- EncryptedSharedPreferences (keychain -- native managed)
4. `CameraMrzBridgeHandler` -- ML Kit text recognition
5. `LifecycleBridgeHandler` -- Activity result delivery + relay listener
6. **DELETE** `CryptoBridgeHandler`, `DocumentsBridgeHandler`, `HapticBridgeHandler`, `AnalyticsBridgeHandler`
7. Validate: compile + unit tests

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid && ./gradlew :shared:jvmTest
```

**Expected Output:**

```
BUILD SUCCESSFUL
All tests passed
```

**Edge case validation -- NFC handler method routing:**

```
Input:  { "domain": "nfc", "method": "isSupported" }
Output: true/false (no crash, no exception for known method)
```

```
Input:  { "domain": "nfc", "method": "unknownMethod" }
Output: BridgeHandlerException("METHOD_NOT_FOUND", "Unknown NFC method: unknownMethod")
```

#### Tests

| Test                                                   | Type       | What it validates                                                    |
| ------------------------------------------------------ | ---------- | -------------------------------------------------------------------- |
| NFC handler routes `scan`, `cancelScan`, `isSupported` | Unit       | Method dispatch works for all 3 NFC methods                          |
| NFC handler rejects unknown method                     | Unit       | `METHOD_NOT_FOUND` error for unknown methods                         |
| Biometric handler routes 3 methods                     | Unit       | Method dispatch works for authenticate, isAvailable, getBiometryType |
| SecureStorage get/set/remove round-trip                | Unit       | Values persist and can be retrieved/deleted                          |
| SecureStorage missing key returns `JsonNull`           | Unit       | Get on nonexistent key returns null, not exception                   |
| Lifecycle `setResult` sets Activity result             | Unit       | Intent extra contains result JSON                                    |
| Lifecycle `dismiss` finishes Activity                  | Unit       | Activity.finish() called                                             |
| Deleted handlers are gone                              | Build gate | No compilation errors after deletion                                 |

**Status: DONE**

---

### Chunks 2D/2E: (SUPERSEDED)

Chunks 2D (iOS WebView Host + Provider Infrastructure) and 2E (iOS Native Handlers) were the original iOS stubs. They are fully superseded by Chunks 2G-2K, which implement the same scope using the Swift wrapper pattern instead. See Chunks 2G, 2H, 2I, 2J, and 2K below for the current iOS implementation plan.

---

### Chunk 2F: SDK Public API + Test App -- M ~5k tokens

**Depends on:** Chunk 2C (Android), Chunk 2K (iOS — final iOS handler in the 2G-2K chain)

**Goal:** Public API (`SelfSdk.launch()`) + test app on both platforms.

**You Will NOT:**

- Add verification logic to the public API -- it launches the WebView and delivers callbacks
- Modify bridge protocol types
- Build anything for React Native (that is Person 5)

**Steps:**

1. Implement `commonMain/api/SelfSdk.kt` (expect) + platform actuals
2. Create `packages/kmp-sdk-test-app/` with Compose Multiplatform
3. Android test app: "Launch Verification" button -> `SelfSdk.launch()`
4. iOS test app: same button via SwiftUI wrapping KMP framework, with `SelfSdkSwift.configure()` at startup
5. Test on emulator/simulator
6. Configure `maven-publish` for AAR output
7. Configure XCFramework output + SPM `Package.swift`
8. Validate: test app builds and launches on both platforms

#### Input / Output -- Chunk Validation

**Input (Android):**

```
Launch test app -> Tap "Launch Verification" -> WebView loads -> Bridge messages flow
```

**Expected Output:**

```
WebView presents full-screen with verification UI
Bridge messages logged in logcat
SelfSdkCallback.onSuccess/onFailure fires on completion
```

**Input (iOS):**

```
Launch test app -> Tap "Launch Verification" -> WebView loads modally
```

**Expected Output:**

```
WKWebView presents modally with verification UI
Bridge messages flow through Swift providers
SelfSdkCallback fires on completion/dismissal
```

#### Tests

| Test                                           | Type        | What it validates                                      |
| ---------------------------------------------- | ----------- | ------------------------------------------------------ |
| Android test app builds                        | Build gate  | AAR dependency resolution works                        |
| iOS test app builds                            | Build gate  | XCFramework + SPM dependency resolution works          |
| `SelfSdk.launch()` presents WebView (Android)  | Integration | Full Activity launch flow                              |
| `SelfSdk.launch()` presents WebView (iOS)      | Integration | Modal VC presentation via providers                    |
| `SelfSdkCallback.onSuccess` fires              | Integration | Result delivery from WebView through lifecycle handler |
| `SelfSdkCallback.onCancelled` fires on dismiss | Integration | Dismiss wiring works correctly                         |

**Status: DONE** (Android common launch signature fixed, test app now exercises `SelfSdk.configure(...).launch(...)`, and validation gates pass)

---

### Chunk 2G: Factory Infrastructure -- S ~3k tokens

**Depends on:** Chunk 2A (bridge protocol)

**Goal:** Define required provider interfaces in the SDK (including secureStorage) and create the Swift companion package skeleton. This is the foundation for all iOS handler work.

**You Will NOT:**

- Enable cinterop
- Write any handler logic (that comes in 2H-2K)
- Import Apple frameworks in Kotlin
- Add providers beyond the required set (NFC, Biometric, WebView, SecureStorage)

**Steps:**

1. Create `iosMain/providers/SdkProviderRegistry.kt`
2. Create `iosMain/providers/NfcProvider.kt`
3. Create `iosMain/providers/BiometricProvider.kt`
4. Create `iosMain/providers/WebViewProvider.kt`
5. Create `iosMain/providers/SecureStorageProvider.kt`
6. Create `packages/self-sdk-swift/Package.swift`
7. Create `Sources/SelfSdkSwift/SelfSdkSwift.swift`
8. Update `SelfSdk.ios.kt` to check `isConfigured()`
9. Validate: Kotlin compiles for iOS, Swift package builds

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
cd packages/self-sdk-swift && swift build
```

**Expected Output:**

```
BUILD SUCCESSFUL (both)
```

#### Tests

| Test                                          | Type       | What it validates                             |
| --------------------------------------------- | ---------- | --------------------------------------------- |
| `isConfigured()` returns false initially      | Unit       | Empty registry correctly reports unconfigured |
| `isConfigured()` returns true after all 4 set | Unit       | Registry detects all providers present        |
| iOS Kotlin compilation                        | Build gate | Interfaces compile without cinterop           |
| Swift package compilation                     | Build gate | SPM resolves NFCPassportReader dependency     |

**Status: Done**

---

---

### Chunk 2H: Biometric Handler -- S ~2k tokens

**Depends on:** Chunk 2G

**Goal:** Implement the simplest handler end-to-end (Kotlin handler + Swift provider). Validates the full Swift wrapper pattern.

**You Will NOT:**

- Add any logic beyond delegating to the Swift provider
- Parse or transform the authentication result -- pass boolean through
- Call LAContext from Kotlin -- all LAContext calls happen in Swift

**Steps:**

1. Implement `iosMain/handlers/BiometricBridgeHandler.kt` delegating to `BiometricProvider`
2. Create `Sources/SelfSdkSwift/Providers/BiometricProviderImpl.swift`
3. Test on physical device (Face ID prompt) and simulator (`isAvailable()` returns false)
4. Validate: `./gradlew :shared:compileKotlinIosArm64`

#### Input / Output -- Chunk Validation

**Input (physical device):**

```json
{
  "domain": "biometrics",
  "method": "authenticate",
  "params": { "reason": "Verify identity" }
}
```

**Expected Output:**

```json
true
```

**Edge case -- simulator (no biometric hardware):**

```
Input:  { "method": "isAvailable" }
Output: false
```

#### Tests

| Test                                     | Type        | What it validates                                         |
| ---------------------------------------- | ----------- | --------------------------------------------------------- |
| Biometric authenticate succeeds (device) | Integration | Face ID / Touch ID prompt appears, success callback fires |
| Biometric `isAvailable` on simulator     | Integration | Returns false gracefully (no crash)                       |
| Kotlin iOS compilation                   | Build gate  | Handler compiles with provider delegation                 |

**Status: Done**

---

### Chunk 2I: Lifecycle Handler -- S ~2k tokens

**Depends on:** Chunk 2G

**Goal:** Implement the Lifecycle handler with callback/dismiss wiring. Self-contained in Kotlin (no Swift provider).

**You Will NOT:**

- Create a Swift provider for Lifecycle -- it is self-contained
- Add any verification logic
- Parse proof data -- pass `JsonElement` through to callback

**Steps:**

1. Implement `iosMain/handlers/LifecycleBridgeHandler.kt` with `pendingCallback` and `dismissAction`
2. Wire `SelfSdk.ios.kt` to set `pendingCallback` and `dismissAction` before WebView launch
3. Test `setResult`, `dismiss`, and `ready` methods
4. Validate: `./gradlew :shared:compileKotlinIosArm64`

#### Input / Output -- Chunk Validation

**Input:**

```json
{
  "domain": "lifecycle",
  "method": "setResult",
  "params": { "success": true, "data": { "proof": "..." } }
}
```

**Expected Output:**

```
SelfSdkCallback.onSuccess() called with VerificationResult
ViewController dismissed
```

**Edge case -- dismiss without result:**

```
Input:  { "method": "dismiss" }
Output: SelfSdkCallback.onCancelled() called, ViewController dismissed
```

#### Tests

| Test                               | Type | What it validates                                       |
| ---------------------------------- | ---- | ------------------------------------------------------- |
| `setResult` success -> `onSuccess` | Unit | Callback correctly dispatches success                   |
| `setResult` failure -> `onFailure` | Unit | Callback correctly dispatches error with code + message |
| `dismiss` -> `onCancelled`         | Unit | Cancel callback fires + dismiss action invoked          |
| `ready` -> no-op                   | Unit | No crash, no callback                                   |

**Status: Done**

---

### Chunk 2J: iOS WebView Host + `SelfSdk.launch()` -- M ~5k tokens

**Depends on:** Chunk 2G, 2H, 2I

**Goal:** Full WebView-based verification flow working on iOS via Swift wrapper.

**You Will NOT:**

- Enable cinterop
- Add verification logic to the WebView host
- Modify bridge protocol types

**Steps:**

1. Rewrite `iosMain/webview/IosWebViewHost.kt` to delegate to `WebViewProvider`
2. Create `Sources/SelfSdkSwift/Providers/WebViewProviderImpl.swift`
3. Update `SelfSdk.ios.kt` launch flow: register 3 handlers, create WebView, present modally
4. Test: `SelfSdk.launch()` -> WebView loads -> bridge messages flow -> result callback
5. Test: launch without `SelfSdkSwift.configure()` -> clear error message
6. Enforce single active launch policy: reject concurrent launch attempts with `SDK_ALREADY_ACTIVE`
7. Validate in test app

#### Input / Output -- Chunk Validation

**Input:**

```swift
SelfSdkSwift.configure()
let sdk = SelfSdk.companion.configure(config: SelfSdkConfig(endpoint: "...", debug: true))
sdk.launch(request: request, callback: callback)
```

**Expected Output:**

```
WKWebView presented modally, loads verification UI
Bridge messages flow: WebView -> Kotlin handlers -> Swift providers -> responses back
SelfSdkCallback.onSuccess fires on verification completion
```

**Edge case -- launch without configure:**

```
Input:  SelfSdk.launch() without SelfSdkSwift.configure()
Output: IllegalStateException with message: "iOS requires Swift providers. Call SelfSdkSwift.configure() at app startup."
```

**Edge case -- concurrent launch while active:**

```
Input:  SelfSdk.launch() called while a verification session is already active
Output: callback.onFailure(SelfSdkError("SDK_ALREADY_ACTIVE", "...")) and no second WebView is presented
```

#### Tests

| Test                                    | Type        | What it validates                                      |
| --------------------------------------- | ----------- | ------------------------------------------------------ |
| WebView loads in debug mode (localhost) | Integration | Dev server URL works                                   |
| WebView loads in release mode (bundled) | Integration | Asset bundling works                                   |
| Bridge message round-trip               | Integration | Request -> handler -> response flows correctly         |
| `onSuccess` callback fires              | Integration | Full lifecycle from WebView setResult to host callback |
| Launch without configure throws         | Unit        | Clear error message for misconfiguration               |
| Concurrent launch rejected              | Unit        | Single-flight policy enforced (`SDK_ALREADY_ACTIVE`)   |

**Status: Done**

---

### Chunk 2K: NFC Handler -- M ~5k tokens

**Depends on:** Chunk 2J

**Goal:** Connect existing `NfcPassportHelper.swift` to the SDK's factory pattern. Most complex iOS handler.

**You Will NOT:**

- Rewrite NfcPassportHelper -- move it as-is from the test app
- Parse passport data in Kotlin -- Swift returns JSON string, Kotlin parses to JsonElement
- Add NFC logic in Kotlin -- all NFCPassportReader calls happen in Swift

**Steps:**

1. Move `NfcPassportHelper.swift` from `packages/kmp-sdk-test-app/iosApp/iosApp/` into `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/`
2. Create `Sources/SelfSdkSwift/Providers/NfcProviderImpl.swift`
3. Implement `iosMain/handlers/NfcBridgeHandler.kt` delegating to `NfcProvider`
4. Update test app: replace `NfcScanFactoryImpl.register()` with `SelfSdkSwift.configure()`
5. Delete test app's `NfcScanFactoryImpl.swift` (now in Swift companion package)
6. Validate: full passport scan on physical device

#### Input / Output -- Chunk Validation

**Input (physical device):**

```json
{
  "domain": "nfc",
  "method": "scan",
  "params": {
    "passportNumber": "AB1234567",
    "dateOfBirth": "900115",
    "dateOfExpiry": "300115"
  }
}
```

**Expected Output:**

```json
{ "passportData": { "mrz": "...", "dsc": "...", "dg1Hash": [...], ... } }
```

**Events during scan:**

```json
{ "event": "scanProgress", "data": { "stateIndex": 0, "percent": 10, "message": "Attempting PACE..." } }
{ "event": "scanProgress", "data": { "stateIndex": 3, "percent": 40, "message": "Reading DG1..." } }
...
{ "event": "scanProgress", "data": { "stateIndex": 7, "percent": 100, "message": "Scan complete" } }
```

**Edge case -- cancel during scan:**

```
Input:  { "method": "cancelScan" }
Output: null (no crash, NfcPassportHelper released)
```

#### Tests

| Test                                | Type        | What it validates                                                                       |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| Progress callbacks in correct order | Unit        | States 0-7 fire sequentially                                                            |
| Cancel during scan                  | Unit        | No crash, helper released                                                               |
| Test app migration                  | Integration | `SelfSdkSwift.configure()` replaces manual factory registration with identical behavior |

**Status: Done**

---

### Chunk 2L: Camera MRZ Handler (Phase 2, Optional) -- S ~2k tokens

**Depends on:** Chunk 2K

**Goal:** iOS camera MRZ scanning via Vision framework. Not needed for initial launch.

**You Will NOT:**

- Build this for initial launch -- WebView supports manual MRZ entry as fallback
- Rewrite MrzCameraHelper -- move as-is if needed

**Steps (deferred):**

1. Move `MrzCameraHelper.swift` from test app into `SelfSdkSwift/Helpers/`
2. Create `CameraMrzProvider.kt` interface
3. Create `CameraMrzBridgeHandler.kt`
4. Create `CameraMrzProviderImpl.swift`
5. Add optional `cameraMrz` field to `SdkProviderRegistry`

**Status: Deferred (Phase 2)**

---

## Dependency Graph

```
Chunk 2A: KMP Setup + Bridge Protocol (no deps -- start here)
  |
  |---> Chunk 2B: Android WebView Host (after 2A)
  |       |
  |       '---> Chunk 2C: Android Native Handlers (after 2B) ──┐
  |                                                             |
  '---> Chunk 2G: Factory Infrastructure (after 2A)            |
          |                                                     |
          |---> Chunk 2H: Biometric Handler (after 2G)         |
          |                                                     |
          |---> Chunk 2I: Lifecycle Handler (after 2G)         |
          |                                                     |
          '---> Chunk 2J: iOS WebView + launch() (after 2G-2I) |
                  |                                             |
                  '---> Chunk 2K: NFC Handler (after 2J) ──────┘
                          |                                     |
                          '---> Chunk 2L: Camera MRZ (optional) |
                                                                |
  Chunk 2F: SDK Public API + Test App (after 2C + 2K) <────────┘
```

> **Note:** Chunks 2D/2E (original iOS stubs) are **superseded** by 2G-2K (Swift wrapper pattern). They are not shown in this graph. Chunk 2F depends on both the Android chain (2C) and the iOS chain (2K).

## Completion Status

| Chunk | Description                                | Size   | Status                                                                                    |
| ----- | ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| 2A    | KMP Setup + Bridge Protocol                | S ~3k  | **Done**                                                                                  |
| 2B    | Android WebView Host                       | S ~2k  | **Done**                                                                                  |
| 2C    | Android Native Handlers (5 handlers)       | L ~12k | **Done**                                                                                  |
| 2D    | iOS WebView Host + Provider Infrastructure | M ~6k  | **Superseded** by 2G-2K (Swift wrapper pattern)                                           |
| 2E    | iOS Native Handlers (3 handlers)           | M ~6k  | **Superseded** by 2G-2K (Swift wrapper pattern)                                           |
| 2F    | SDK Public API + Test App                  | M ~5k  | **Done** (common Android launch fixed, test app launch screen wired, validation complete) |
| 2G    | Factory Infrastructure                     | S ~3k  | **Done**                                                                                  |
| 2H    | Biometric Handler (iOS)                    | S ~2k  | **Done**                                                                                  |
| 2I    | Lifecycle Handler (iOS)                    | S ~2k  | **Done**                                                                                  |
| 2J    | iOS WebView Host + SelfSdk.launch()        | M ~5k  | **Done**                                                                                  |
| 2K    | NFC Handler (iOS)                          | M ~5k  | **Done**                                                                                  |
| 2L    | Camera MRZ (iOS, Phase 2)                  | S ~2k  | **Skipped** (deferred)                                                                    |

## Validation Plan

```bash
# After every chunk (must pass):
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinJvm
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid

# After iOS chunks (must pass):
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
cd packages/self-sdk-swift && swift build

# After all chunks (integration):
# 1. Person 1 runs `cd packages/webview-app && npx vite build` -> dist/
# 2. Copy dist/ into KMP test app assets
# 3. Launch test app on Android emulator -> WebView loads -> bridge messages flow
# 4. Launch test app on iOS simulator -> WebView loads -> bridge messages flow
# 5. NFC scan on physical Android device with real passport
# 6. NFC scan on physical iOS device with real passport
# 7. Both scans produce verified proof delivered to SelfSdkCallback
```

## Coordination Notes

- **Person 1 (WebView UI + Bridge):** You consume their Vite bundle (`dist/`) as a static asset. When they change bridge message shapes in `packages/webview-bridge/src/types.ts`, you must update the Kotlin `BridgeMessage.kt` types to match. Coordinate on any domain or method name changes.
- **Person 4 (SDK Core):** They own the adapter interfaces in `packages/mobile-sdk-alpha/src/types/public.ts`. The WebView engine calls your native handlers through these adapters. If adapter signatures change, the bridge protocol may need updating.
- **Person 5 (RN Native Shell):** They build a separate native shell (`packages/rn-sdk/`) using the same bridge protocol. Share handler method contracts and test vectors. Their `SelfVerification` component loads the same Vite bundle you do.
- **PR #1762:** iOS bridge handlers with Swift provider pattern added `self-sdk-swift` and unblocked the 2G-2K implementation path.
- **MiniPay Integration:** The [SPEC.md](../integrations/SPEC.md) depends on this spec for iOS SDK functionality. Android side is already working.

## Key Reference Files

| File                                                                    | What to Look At                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `app/android/.../RNPassportReaderModule.kt`                             | Android NFC implementation to port (PACE, BAC, DG reading, chip auth, passive auth)  |
| `app/android/.../PassportNFC.kt`                                        | Additional NFC utilities (if exists)                                                 |
| `app/ios/PassportReader.swift`                                          | iOS NFC flow reference (MRZ key, readPassport call, SOD extraction)                  |
| `packages/kmp-shell/shared/`                                            | Previous KMP prototype (bridge protocol, handler pattern, MRZ utils -- all reusable) |
| `packages/webview-bridge/src/types.ts`                                  | Bridge protocol TypeScript types (must match Kotlin exactly)                         |
| `packages/mobile-sdk-alpha/src/types/public.ts`                         | Adapter interfaces (what the WebView expects the bridge to implement)                |
| `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/` | Android handlers (reference for iOS method contracts)                                |
| `packages/kmp-sdk-test-app/iosApp/iosApp/NfcPassportHelper.swift`       | Move to Swift companion package                                                      |
| `packages/kmp-sdk-test-app/iosApp/iosApp/NfcScanFactoryImpl.swift`      | Reference pattern, then delete                                                       |

---

## Related Specs

| Spec                                            | Relationship                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| [SDK Overview](../../OVERVIEW.md)               | Parent architecture spec -- north star, decision matrix, shared contracts |
| [webview/SPEC.md](../webview/SPEC.md)           | Sibling -- owns WebView UI, bridge adapters, Vite bundle you consume      |
| [sdk-core/SPEC.md](../sdk-core/SPEC.md)         | Sibling -- owns SDK core, adapter interfaces your handlers implement      |
| [rn-sdk/SPEC.md](../rn-sdk/SPEC.md)             | Sibling -- separate native shell using same bridge protocol               |
| [integrations/SPEC.md](../integrations/SPEC.md) | Downstream -- MiniPay sample app depends on this SDK                      |

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

<!-- Added post-completion. Brief and factual. -->

### Architecture (brief)

<!-- 3-5 sentences. Pattern used, key decisions made during implementation. -->

### Deviations from Spec

| Spec said | We did | Why |
| --------- | ------ | --- |
|           |        |     |

### Key Files (final)

| File | Role |
| ---- | ---- |
|      |      |

### Lessons / Gotchas

- (To be filled after implementation)

---

## Follow-Up (Out of Scope)

| Item                                         | Discovered during | Suggested spec                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Camera MRZ handler for iOS                   | Chunk 2L scoping  | Phase 2 -- add to this spec when needed                                                                                                                                                                                                                                                                                                                                                                                            |
| SecureStorage handler for iOS                | Design review     | **Decided:** Add `SecureStorageProvider` to factory pattern (see SDK-OVERVIEW canonical rule)                                                                                                                                                                                                                                                                                                                                      |
| Crypto signing handler for iOS               | Design review     | Depends on whether secure enclave signing is needed vs. Web Crypto                                                                                                                                                                                                                                                                                                                                                                 |
| LifecycleBridgeHandler thin-wrapper refactor | PR #1805 review   | Both Android and iOS `setResult()` have 4-branch business logic (interpreting `type`/`success`/`errorCode` to decide result codes / callback methods). Per CLAUDE.md rule ("Native handlers are thin wrappers — no error mapping in native"), TypeScript should send an explicit `resultCode` or `outcome` field, and the handler should pass it through without interpretation. Touches both platform handlers + bridge protocol. |

## Spec Deviations

| Suggestion skipped                         | Reason                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| BEFORE/AFTER code blocks for modifications | Most work is creating new files, not modifying existing ones. Full code examples are provided instead.                             |
| Single-file task format                    | Scope covers 30+ files across two packages. Organized by subsystem (bridge, handlers, providers) instead of individual file tasks. |
| Strict "Lines X-Y" references              | Files do not exist yet (new creation). Directory structure and full code examples serve as the implementation guide.               |
