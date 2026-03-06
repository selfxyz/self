# Person 3: MiniPay Integration Sample — Implementation Spec

> Last updated: 2026-03-05
> Owner: Person 3 (Integrations)
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Context

**What you own:**

- **MiniPay sample app** (`packages/kmp-minipay-sample/`) — Kotlin/Compose Multiplatform reference integration
- **Future integration samples** — Self Wallet migration sample, other third-party app examples

**Architecture context:**

```
┌────────────────────────────────────────┐
│  Sample App (Compose Multiplatform)    │
│  HomeScreen ──→ SelfSdk.launch() ──→ ResultScreen
│     (native)       (SDK WebView)       (native)
└────────────────────┬───────────────────┘
                     │
         ┌───────────▼───────────┐
         │  KMP SDK (kmp-sdk/)   │
         │  5 native handlers    │
         │  WebView host         │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  WebView (Vite bundle)│
         │  Full verification    │
         │  flow: 10 screens     │
         └───────────────────────┘
```

**Dependencies:**

| Direction    | Person / Package   | What                                           | Status |
| ------------ | ------------------ | ---------------------------------------------- | ------ |
| **You need** | Person 2 (KMP SDK) | `SelfSdk.launch()` API and Kotlin SDK artifact | Done   |
| **You need** | Person 1 (WebView) | Vite bundle embedded in the SDK                | Ready  |

**Status:**

- [x] MiniPay sample project scaffolded
- [x] Android + iOS launch path wiring present
- [x] Error-code to user-message mapping in result UX
- [ ] Polish + error handling (chunk 3C — partial)

## Overview

You are building a Kotlin sample app demonstrating how a host app integrates Self identity verification using the KMP SDK's `SelfSdk.launch()` API. The app has a minimal native UI — a home screen with a "Verify Identity" button and a result screen. All verification logic (country selection, document scanning, NFC, proving, result) runs inside the SDK's WebView, launched via a single `SelfSdk.launch()` call. This sample serves as the reference implementation for third-party integrators.

## Prerequisites

- Familiarity with Compose Multiplatform and the KMP project structure (shared/android/ios source sets)
- Familiarity with the KMP SDK public API: `SelfSdk.configure()`, `SelfSdk.launch()`, `SelfSdkCallback`
- **Bridge protocol** = JSON messaging over `postMessage` between WebView and native handlers (10 domains, see [SDK Overview](../../OVERVIEW.md))
- **5 native handlers** = NFC, Camera/MRZ, Biometrics, Keychain, Lifecycle — the only native code the SDK requires
- Read [SDK Overview](../../OVERVIEW.md) for architecture context

## The Problem

The MiniPay sample app does not exist yet. Third-party integrators have no reference implementation showing how to embed Self verification into a Kotlin Multiplatform app with minimal code.

| File / Area                    | Issue                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| `packages/kmp-minipay-sample/` | Directory does not exist — entire project needs to be scaffolded       |
| KMP SDK public API             | No consumer exists to validate the `SelfSdk.launch()` integration path |
| Third-party integrator docs    | No working sample to point integrators to                              |

## Design Principles

1. **Minimal native UI — only 2 screens.** The sample app has exactly two native screens (HomeScreen, ResultScreen). Everything else runs in the SDK's WebView. This demonstrates that integrators write almost no UI code.
2. **Single call site integration.** The entire SDK surface area the sample touches is `SelfSdk.configure()` + `SelfSdk.launch()` + `SelfSdkCallback`. No deeper SDK internals are exposed or used.
3. **Reference quality code.** This is what third-party developers will copy. Code must be clean, well-commented, and demonstrate best practices for Compose Multiplatform.
4. **Platform parity.** Identical behavior on Android and iOS. The shared Kotlin code handles all logic; platform-specific code is limited to entry points (`MainActivity`, `MainViewController`).

## Definition of Done

> **Done when:** MiniPay sample app launches `SelfSdk.launch()`, WebView opens with verification flow, and callback fires with verification result on both Android and iOS.

## Architecture

```
┌─────────────────────────────────────────┐
│  MiniPay Sample App (Compose/Activity)   │
│                                          │
│  SelfSdk.launch(request, callback)       │
├──────────────────────────────────────────┤
│  KMP SDK (5 native handlers)             │
│  ├─ NFC (JMRTD)                         │
│  ├─ Camera/MRZ (ML Kit)                 │
│  ├─ Biometrics (BiometricPrompt)        │
│  ├─ Keychain (EncryptedSharedPrefs)     │
│  └─ Lifecycle (Activity result)         │
├──────────────────────────────────────────┤
│  Bridge Protocol (postMessage JSON)      │
├──────────────────────────────────────────┤
│  WebView (bundled Vite app)              │
│  Full verification flow:                 │
│  Country → ID → Camera → NFC → Prove    │
│  + Web fallbacks: IndexedDB, Web Crypto  │
└──────────────────────────────────────────┘
```

### Key Difference from Test App

|                  | Test App (`kmp-test-app`)                    | MiniPay Sample                           |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| Purpose          | Validates all 5 native handlers individually | Demonstrates real wallet integration     |
| Proof generation | WebView (shared engine)                      | WebView (shared engine)                  |
| UI               | Developer test harness + WebView overlay     | Compose home + WebView verification flow |
| SDK entry point  | `SelfSdk.launch()` (same API)                | `SelfSdk.launch()` (same API)            |
| Use case         | Internal SDK development                     | Reference for third-party integrators    |

## Scope of Work

### 1. Project Scaffolding

**Create:** `packages/kmp-minipay-sample/` directory structure

```
packages/kmp-minipay-sample/
  build.gradle.kts
  composeApp/
    build.gradle.kts
    src/
      commonMain/kotlin/xyz/self/minipay/
        App.kt                          # Root composable + navigation
        MainViewModel.kt                # Simple launch/result state
        screens/
          HomeScreen.kt                 # Landing screen with "Verify" button
          ResultScreen.kt               # Success/failure display
        theme/
          Theme.kt                      # MiniPay-style theming

      androidMain/kotlin/xyz/self/minipay/
        MainActivity.kt                # Android entry point

      iosMain/kotlin/xyz/self/minipay/
        MainViewController.kt          # iOS entry point

  androidApp/
    build.gradle.kts
    src/main/
      AndroidManifest.xml          # See permissions note below
      java/.../MainApplication.kt

  iosApp/
    iosApp/
      iOSApp.swift                     # SwiftUI wrapper
      ContentView.swift
    iosApp.xcodeproj/
```

### 2. HomeScreen — Landing Page

**Create:** `composeApp/src/commonMain/kotlin/xyz/self/minipay/screens/HomeScreen.kt`

**Purpose:** Landing page with verification status and a "Verify Identity" button that launches the SDK.

**UI elements:**

- App title: "MiniPay" with Self branding
- Status card: Shows current verification state (unverified / verified / expired)
- "Verify Identity" button — calls `SelfSdk.launch()`
- Previously verified proof summary (if any)

**State:**

```kotlin
data class HomeState(
    val isVerified: Boolean = false,
    val lastProofDate: String? = null,
    val verifiedClaims: Map<String, String>? = null,
)
```

#### Input / Output

**Input (user context):** App launches, user has not verified identity.

**Expected Output (UI):**

```
┌────────────────────────┐
│       MiniPay          │
│                        │
│  ┌──────────────────┐  │
│  │  Status:          │  │
│  │  ⊘ Unverified     │  │
│  └──────────────────┘  │
│                        │
│  [ Verify Identity ]   │
│                        │
└────────────────────────┘
```

**Edge case — previously verified:**

```
Input:  HomeState(isVerified = true, lastProofDate = "2026-02-17", verifiedClaims = {"nationality": "NLD"})
Output: Status card shows "Verified" with proof date and claims summary
```

### 3. SDK Integration — Single Call Site

**Create:** SDK integration logic in `MainViewModel.kt`

The entire integration fits in a single call site. **Configure the SDK once** (e.g. ViewModel init), not on every button tap. **Dispatch callbacks to the main thread** before updating Compose state (SDK may call back from a background thread):

```kotlin
// In MainViewModel: hold a single SDK instance (init once)
private val sdk = SelfSdk.configure(SelfSdkConfig(debug = BuildConfig.DEBUG))

fun launchVerification(scope: CoroutineScope) {
    sdk.launch(
        request = VerificationRequest(userId = "...", disclosures = listOf("nationality", "age")),
        callback = object : SelfSdkCallback {
            override fun onSuccess(result: VerificationResult) {
                scope.launch(Dispatchers.Main) { onVerificationSuccess(result) }
            }
            override fun onFailure(error: SelfSdkError) {
                scope.launch(Dispatchers.Main) { onVerificationFailure(error) }
            }
            override fun onCancelled() {
                scope.launch(Dispatchers.Main) { onVerificationCancelled() }
            }
        }
    )
}
```

#### Input / Output

**Input (button tap):**

```kotlin
sdk.launch(
    request = VerificationRequest(
        userId = "user-uuid-123",
        disclosures = listOf("nationality", "date_of_birth"),
    ),
    callback = sdkCallback
)
```

**Expected Output (success callback):**

```kotlin
// Must match SDK-OVERVIEW canonical VerificationResult shape.
// proof is String? (opaque proof data), claims is Map<String, Any?>? (canonical target type).
VerificationResult(
    success = true,
    userId = "user-uuid-123",
    verificationId = "ver-uuid",
    proof = "eyJhbGciOiJFZDI1NTE5...",  // opaque proof string
    claims = mapOf(
        "nationality" to "NLD",
        "date_of_birth" to "1990-01-15"
    ),
)
```

**Error case — passport not supported:**

```kotlin
SelfSdkError(
    code = "PASSPORT_NOT_SUPPORTED",
    message = "This passport type is not supported for verification"
)
```

**Edge case — user dismisses WebView:**

```
Input:  User swipes down or taps back during WebView flow
Output: onCancelled() fires, app stays on HomeScreen, no state change
```

### 4. ViewModel

**Create:** `composeApp/src/commonMain/kotlin/xyz/self/minipay/MainViewModel.kt`

```kotlin
// SKELETON
class MainViewModel {
    // Navigation state
    var currentScreen by mutableStateOf<Screen>(Screen.Home)

    // Result data
    var verificationResult: VerificationResult? by mutableStateOf(null)
    var verificationError: SelfSdkError? by mutableStateOf(null)

    // Home state
    var homeState by mutableStateOf(HomeState())

    fun onVerificationSuccess(result: VerificationResult)
    fun onVerificationFailure(error: SelfSdkError)
    fun onVerificationCancelled()
    fun returnToHome()
}

sealed class Screen {
    data object Home : Screen()
    data object Result : Screen()
}
```

#### Input / Output

**Input:** `onVerificationSuccess(result)` called with a valid result.

**Expected Output:**

```
verificationResult = result
verificationError = null
currentScreen = Screen.Result
```

**Input:** `returnToHome()` called after a successful verification.

**Expected Output:** Copy from `verificationResult` into `homeState` (e.g. `lastProofDate = Clock.System.now().toString()`, `verifiedClaims = verificationResult.claims`), then set `homeState.isVerified = true`, then clear `verificationResult = null`, `verificationError = null`, and `currentScreen = Screen.Home`.

### 5. ResultScreen

**Create:** `composeApp/src/commonMain/kotlin/xyz/self/minipay/screens/ResultScreen.kt`

**Success UI:**

- Checkmark animation
- "Identity Verified" title
- Disclosed claims list (nationality, age, etc. based on disclosure flags)
- "Done" button — return to HomeScreen

**Failure UI:**

- Error icon
- Error message from `SelfSdkError`
- "Try Again" button — re-launches `SelfSdk.launch()`

**Cancelled:**

- User dismissed the WebView — return to HomeScreen silently

#### Input / Output

**Input (success):**

```kotlin
verificationResult = VerificationResult(
    success = true,
    claims = mapOf("nationality" to "NLD", "age" to "36"),
    proof = "eyJhbGciOiJFZDI1NTE5..."  // opaque proof string
)
```

**Expected Output (UI):**

```
┌────────────────────────┐
│       ✓ Verified       │
│                        │
│  Nationality: NLD      │
│  Age: 36               │
│                        │
│  [ Done ]              │
└────────────────────────┘
```

**Input (failure):**

```kotlin
verificationError = SelfSdkError(
    code = "NFC_SCAN_FAILED",
    message = "NFC scan timed out after 120 seconds"
)
```

**Expected Output (UI):**

```
┌────────────────────────┐
│       ✗ Error          │
│                        │
│  NFC scan timed out    │
│  after 120 seconds     │
│                        │
│  [ Try Again ]         │
└────────────────────────┘
```

### 6. Build Configuration

**Create:** `packages/kmp-minipay-sample/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}
```

**Create:** `composeApp/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    androidTarget {
        compilations.all { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
    }
    iosArm64()
    iosSimulatorArm64()

    listOf(iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            // Compose
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)

            // Navigation
            implementation(libs.navigation.compose)

            // KMP SDK -- the only Self dependency needed
            implementation(project(":kmp-sdk:shared"))

            // Serialization
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
        }

        val androidMain by getting {
            dependencies {
                implementation(libs.compose.ui.tooling.preview)
                implementation(libs.androidx.activity.compose)
            }
        }
    }
}

android {
    namespace = "xyz.self.minipay"
    compileSdk = 35
    defaultConfig {
        applicationId = "xyz.self.minipay"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
}
```

Note: No QR scanning libraries, no ML Kit, no CameraX in the sample app's own dependencies. The KMP SDK bundles everything needed for the verification flow (NFC, camera, etc.) and handles it within the WebView.

#### AndroidManifest Permissions

The sample app's `AndroidManifest.xml` must declare permissions required by the KMP SDK's native handlers:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- NFC passport scanning -->
    <uses-permission android:name="android.permission.NFC" />
    <uses-feature android:name="android.hardware.nfc" android:required="false" />

    <!-- Camera for MRZ scanning -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <!-- Biometrics (fingerprint/face) -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <!-- Internet for WebView content and proof submission -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application android:name=".MainApplication" ...>
        <!-- Declare the Activity that will receive NFC events -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <!-- NFC intent filter for tag discovery — must be on the Activity that handles NFC -->
            <intent-filter>
                <action android:name="android.nfc.action.TECH_DISCOVERED" />
            </intent-filter>
            <meta-data
                android:name="android.nfc.action.TECH_DISCOVERED"
                android:resource="@xml/nfc_tech_filter" />
        </activity>
    </application>
</manifest>
```

The `nfc_tech_filter.xml` resource (in `res/xml/`) should list `android.nfc.tech.IsoDep` for passport NFC chip communication. These permissions are declared but the KMP SDK handles all runtime permission requests internally.

---

## Files You Will Modify

| File                                                                           | Change                                      | Risk                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------- |
| `packages/kmp-minipay-sample/build.gradle.kts`                                 | Create — root project config                | **Low** — new file, no existing code affected     |
| `packages/kmp-minipay-sample/composeApp/build.gradle.kts`                      | Create — Compose Multiplatform build config | **Med** — must match kmp-sdk dependency correctly |
| `packages/kmp-minipay-sample/composeApp/src/commonMain/.../App.kt`             | Create — root composable + navigation       | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/commonMain/.../MainViewModel.kt`   | Create — launch/result state management     | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/commonMain/.../HomeScreen.kt`      | Create — landing screen with verify button  | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/commonMain/.../ResultScreen.kt`    | Create — success/failure display            | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/commonMain/.../Theme.kt`           | Create — MiniPay-style theming              | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/androidMain/.../MainActivity.kt`   | Create — Android entry point                | **Low** — new file                                |
| `packages/kmp-minipay-sample/composeApp/src/iosMain/.../MainViewController.kt` | Create — iOS entry point                    | **Low** — new file                                |
| `packages/kmp-minipay-sample/androidApp/build.gradle.kts`                      | Create — Android app module config          | **Low** — new file                                |
| `packages/kmp-minipay-sample/androidApp/src/main/AndroidManifest.xml`          | Create — Android manifest                   | **Low** — new file                                |
| `packages/kmp-minipay-sample/iosApp/iosApp/iOSApp.swift`                       | Create — SwiftUI wrapper                    | **Low** — new file                                |
| `packages/kmp-minipay-sample/iosApp/iosApp/ContentView.swift`                  | Create — SwiftUI content view               | **Low** — new file                                |
| `settings.gradle.kts` (monorepo root)                                          | Add `include(":kmp-minipay-sample")`        | **Med** — affects monorepo build graph            |

## Files You Will NOT Modify

| File                               | Why                                                            |
| ---------------------------------- | -------------------------------------------------------------- |
| `packages/kmp-sdk/shared/src/**`   | SDK internals — owned by Person 2 native shells workstream     |
| `packages/webview-bridge/src/**`   | Bridge protocol — owned by Person 1 webview workstream         |
| `packages/webview-app/src/**`      | WebView UI — owned by Person 1 webview workstream              |
| `packages/mobile-sdk-alpha/src/**` | SDK core — owned by Person 4 sdk core workstream               |
| `app/src/**`                       | Self Wallet — out of scope, separate app                       |
| `packages/kmp-sdk-test-app/**`         | Test app — separate from integration sample, different purpose |
| `common/src/**`                    | Shared utilities — stable, no changes needed                   |

---

## Chunking Guide

### Chunk 3A: Project Setup + Home Screen + Launch Button — M ~6k tokens

**Goal:** Create the project scaffolding, build the home screen, and wire the "Verify Identity" button.

**You Will NOT:**

- Modify any KMP SDK internals — you are a consumer of `SelfSdk.launch()`, not a contributor to it
- Add any native dependencies beyond what Compose Multiplatform provides — no ML Kit, no CameraX, no NFC libraries in this project
- Build more than 2 native screens — HomeScreen and ResultScreen only; all verification logic is in the WebView
- Implement the actual `SelfSdk.launch()` call yet — that is Chunk 3B

**Steps:**

1. Create `packages/kmp-minipay-sample/` directory structure as specified above
2. Configure `build.gradle.kts` with Compose Multiplatform + `project(":kmp-sdk:shared")` dependency
3. Add the project to monorepo `settings.gradle.kts`
4. Implement `App.kt` with simple two-screen navigation (Home, Result)
5. Implement `MainViewModel.kt` with launch/result state (placeholder, no SDK call yet)
6. Implement `HomeScreen.kt` with status card and "Verify Identity" button
7. Implement `Theme.kt` with MiniPay-style colors and typography
8. Android: `MainActivity.kt`, `AndroidManifest.xml`, `MainApplication.kt`
9. iOS: `MainViewController.kt`, `iOSApp.swift`, `ContentView.swift`
10. Validate: App builds and launches on both platforms, button is visible

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileDebugKotlinAndroid
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileKotlinIosSimulatorArm64
```

**Expected Output:**

```
BUILD SUCCESSFUL
```

**Device validation:**

```
Input:  Launch app on Android emulator
Output: HomeScreen renders with "MiniPay" title, "Unverified" status card, "Verify Identity" button visible and tappable
```

#### Tests

| Test                                   | Type       | What it validates                                        |
| -------------------------------------- | ---------- | -------------------------------------------------------- |
| `HomeState defaults to unverified`     | Unit       | Initial state has `isVerified = false` and null claims   |
| `MainViewModel initial screen is Home` | Unit       | `currentScreen` starts as `Screen.Home`                  |
| Android emulator launch                | Build gate | App compiles and launches without crash on Android       |
| iOS simulator launch                   | Build gate | App compiles and launches without crash on iOS simulator |

---

### Chunk 3B: Wire SelfSdk.launch() + Handle Callback — M ~5k tokens

**Depends on:** Chunk 3A

**Goal:** Connect the button to `SelfSdk.launch()` and handle the three callback paths (success, failure, cancelled).

**You Will NOT:**

- Implement or modify any SDK internals — you only call `SelfSdk.configure()` and `SelfSdk.launch()`
- Add any screens beyond HomeScreen and ResultScreen — the WebView handles all verification UI
- Handle bridge messages directly — the SDK manages all WebView communication internally
- Build custom NFC, camera, or biometric UI — the SDK's WebView handles all of that

**Steps:**

1. Initialize `SelfSdk.configure()` in the ViewModel or Application class
2. Wire "Verify Identity" button to call `sdk.launch()` with a test `VerificationRequest`
3. Implement `SelfSdkCallback` — route `onSuccess`, `onFailure`, `onCancelled` to ViewModel
4. Implement `ResultScreen.kt` with success/failure/cancelled display
5. Wire navigation: Home -> (launch) -> WebView -> (callback) -> Result -> (done) -> Home
6. Validate: Tap button, WebView opens with verification flow, callback fires on completion

#### Input / Output — Chunk Validation

**Input:**

```
1. Launch app
2. Tap "Verify Identity" button
```

**Expected Output:**

```
1. WebView opens showing country selection screen (first step of verification flow)
2. Completing flow (or using mock) fires onSuccess callback
3. App navigates to ResultScreen with verification result displayed
```

**Edge case — user cancels:**

```
Input:  Tap "Verify Identity", then swipe to dismiss WebView
Output: onCancelled() fires, app stays on HomeScreen, no crash, no state change
```

**Error case — SDK not configured:**

```
Input:  Call sdk.launch() before SelfSdk.configure()
Output: onFailure() fires with descriptive error, app shows error on ResultScreen
```

#### Tests

| Test                                             | Type  | What it validates                                   |
| ------------------------------------------------ | ----- | --------------------------------------------------- |
| `onVerificationSuccess stores result, navigates` | Unit  | ViewModel sets result and moves to Result screen    |
| `onVerificationFailure stores error, navigates`  | Unit  | ViewModel sets error and moves to Result screen     |
| `onVerificationCancelled stays on Home`          | Unit  | ViewModel does not change screen on cancel          |
| Tap Verify -> WebView opens (emulator)           | Smoke | `SelfSdk.launch()` opens the WebView on an emulator |

---

### Chunk 3C: Polish Result Display + Error Handling — S ~4k tokens

**Depends on:** Chunk 3B

**Goal:** Polish the result screen, persist verification status, and handle edge cases.

**You Will NOT:**

- Add additional screens — still only HomeScreen and ResultScreen
- Modify the SDK callback interface — use it as-is
- Implement custom error recovery logic — just map `SelfSdkError` codes to user-friendly messages
- Add analytics, logging, or telemetry — this is a minimal sample app

**Steps:**

1. Success: Display all disclosed claims from `VerificationResult` in a clean list
2. Failure: Map `SelfSdkError` codes to user-friendly messages
3. Persist verification status so HomeScreen reflects verified state across app restarts (use a KMP-compatible store: e.g. `multiplatform-settings` in `commonMain.dependencies`, or an expect/actual `VerificationStore` with DataStore/NSUserDefaults actuals)
4. Theme: Apply MiniPay-style colors and typography consistently
5. Edge cases: Handle Activity recreation during WebView flow, back button behavior
6. Validate: Error cases handled gracefully on emulator

#### Input / Output — Chunk Validation

**Input:**

```
1. Launch app on emulator, verify result screen renders
2. Kill and restart the app
```

**Expected Output:**

```
1. ResultScreen shows "Identity Verified" with correct claims (nationality, age, etc.)
2. After restart, HomeScreen shows "Verified" status with last proof date
```

**Edge case — Activity recreation:**

```
Input:  Start verification, rotate device (Activity recreated)
Output: WebView flow continues uninterrupted or resumes gracefully
```

**Edge case — back button during WebView:**

```
Input:  Tap back button while WebView verification is in progress
Output: WebView dismisses, onCancelled() fires, HomeScreen shown
```

#### Tests

| Test                                        | Type        | What it validates                                         |
| ------------------------------------------- | ----------- | --------------------------------------------------------- |
| `returnToHome updates HomeState on success` | Unit        | HomeState reflects verified status after successful flow  |
| `returnToHome clears transient state`       | Unit        | verificationResult and verificationError are nulled       |
| Error code mapping                          | Unit        | Known SelfSdkError codes map to user-friendly strings     |
| Persisted state survives restart            | Integration | Verification status is preserved across app process death |

---

## Dependency Graph

```
Chunk 3A (no deps)
  └──→ Chunk 3B (after 3A)
         └──→ Chunk 3C (after 3B)
```

All three chunks are sequential — each builds on the previous.

## Completion Status

| Chunk | Description                                 | Size  | Status      |
| ----- | ------------------------------------------- | ----- | ----------- |
| 3A    | Project Setup + Home Screen + Launch Button | M ~6k | **Done**    |
| 3B    | Wire SelfSdk.launch() + Handle Callback     | M ~5k | **Done**    |
| 3C    | Polish Result Display + Error Handling      | S ~4k | **Partial** |

**Overall: Partial (implementation complete; physical-device NFC E2E remains).**

## Validation Plan

```bash
# After every chunk (must pass):
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileDebugKotlinAndroid
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileKotlinIosSimulatorArm64

# After Chunk 3A:
# Launch on Android emulator — HomeScreen renders, button visible
# Launch on iOS simulator — HomeScreen renders, button visible

# After Chunk 3B:
# Tap "Verify Identity" — WebView opens with verification flow
# Complete flow — callback fires, ResultScreen displays
# Enforce canonical result contract (fail if legacy fields appear)
rg -n "\\bverified\\s*=|disclosedClaims" packages/kmp-minipay-sample/composeApp/src/ \
  && echo "FAIL: legacy result fields found" \
  || echo "PASS: canonical result contract only"

# After all chunks (smoke test on emulator):
# 1. Launch app — Home screen shows "Unverified"
# 2. Tap "Verify Identity" — WebView opens
# 3. Verify WebView loads and SDK launch flow is wired correctly
```

## Coordination Notes

- **Person 2 (native shells):** This sample depends on the KMP SDK's `SelfSdk.launch()` API being stable. Coordinate on API surface changes. The sample will need to be updated if the callback interface changes.
- **Person 1 (WebView UI):** The WebView verification flow must be functional and bundled into the KMP SDK assets before Chunk 3B can be fully validated. The sample does not control or modify the WebView.
- **Person 4 (SDK core):** The WebView engine must support the bridge protocol for NFC, camera, biometrics domains. The sample does not interact with the engine directly.
- **All:** Build smoke tests (compile + emulator launch) validate integration. Full NFC E2E is not automatable (requires physical hardware + real passport).

## Testing

### Unit Tests (`commonTest/`)

**ViewModel State** (~5 tests):

- Initial screen is `Home`
- `onVerificationSuccess()` stores result and navigates to `Result`
- `onVerificationFailure()` stores error and navigates to `Result`
- `onVerificationCancelled()` stays on `Home`
- `returnToHome()` updates `HomeState` if verification succeeded, clears transient state

### Device Tests (manual, per-chunk)

**Chunk 3A — Home Screen:**

- App launches on Android emulator and iOS simulator
- HomeScreen displays "Unverified" status
- "Verify Identity" button is visible and tappable

**Chunk 3B — SDK Launch + Callback:**

- Tapping "Verify Identity" opens the WebView verification flow
- Completing the flow in the WebView fires `onSuccess` callback
- Dismissing the WebView fires `onCancelled` callback
- A failure scenario fires `onFailure` callback
- Result screen displays after callback

**Chunk 3C — Polish:**

- Success screen shows disclosed claims matching the request
- Failure screen shows error message
- "Try Again" re-launches the verification flow
- "Done" returns to home with updated verified status
- Both platforms: identical behavior

### Build Smoke Tests

1. Android: `./gradlew :composeApp:compileDebugKotlinAndroid` passes
2. iOS: `./gradlew :composeApp:compileKotlinIosSimulatorArm64` passes
3. Launch on emulator — Home screen renders, button visible, WebView opens on tap

## Key Reference Files

| File                                                          | What to Look At                                         |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/kmp-sdk/shared/src/commonMain/.../SelfSdk.kt`       | Public API: `configure()`, `launch()`, callback types   |
| `packages/kmp-sdk/shared/src/commonMain/.../BridgeMessage.kt` | Bridge message types (for understanding, not modifying) |
| `packages/kmp-sdk-test-app/`                                      | Existing test app — reference for project structure     |
| `packages/webview-app/src/App.tsx`                            | WebView flow screens (what the user sees inside SDK)    |

## Dependencies

- **[native-shells/SPEC.md](../native-shells/SPEC.md)** — KMP SDK with 5 native handlers (NFC, Camera, Biometrics, Keychain, Lifecycle) and WebView host
- **[webview/SPEC.md](../webview/SPEC.md)** — Bundled Vite app that runs inside the WebView (all verification screens + proving logic)

## Related Specs

- **Parent:** [SDK Overview](../../OVERVIEW.md) — Architecture overview and north star
- **Sibling specs:**
  - [native-shells/SPEC.md](../native-shells/SPEC.md) — Kotlin/Swift native shell (Person 2)
  - [webview/SPEC.md](../webview/SPEC.md) — WebView UI + bridge (Person 1)
  - [sdk-core/SPEC.md](../sdk-core/SPEC.md) — SDK core adaptation (Person 4)
  - [rn-sdk/SPEC.md](../rn-sdk/SPEC.md) — React Native SDK (Person 5)

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

<!-- Added post-completion. Brief and factual. -->

### Architecture (brief)

<!-- 3-5 sentences. Pattern used, key decisions made during implementation. -->

### Deviations from Spec

| Spec said       | We did                  | Why      |
| --------------- | ----------------------- | -------- |
| [original plan] | [actual implementation] | [reason] |

### Key Files (final)

| File           | Role           |
| -------------- | -------------- |
| `src/thing.ts` | [what it does] |

### Lessons / Gotchas

- [One-liner that would help the next person]

---

## Follow-Up (Out of Scope)

| Item                                        | Discovered during | Suggested spec               |
| ------------------------------------------- | ----------------- | ---------------------------- |
| Production publishing (AAR + XCFramework)   | —                 | New spec: SPEC-PUBLISHING.md |
| Self Wallet migration to `SelfVerification` | —                 | rn-sdk/SPEC.md               |

## Spec Deviations

| Suggestion skipped                | Reason                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BEFORE/AFTER code blocks          | All files are new (CREATE, not MODIFY). There is no existing code to show BEFORE/AFTER diffs for.                                                          |
| File:line references in Problem   | The problem is that the project does not exist yet. There are no existing files to reference with line numbers.                                            |
| Architecture diagram in impl spec | Included because the sample app's position in the overall architecture is essential context for the implementer, per SPEC-GUIDE "include if it clarifies." |
