# MiniPay Integration Sample

## Overview

A Kotlin sample app demonstrating how a host app (like MiniPay) integrates Self identity verification using the KMP SDK's `SelfSdk.launch()` API.

The app has a minimal native UI — a home screen with a "Verify Identity" button and a result screen. All verification logic (country selection, document scanning, NFC, proving, result) runs inside the SDK's WebView, launched via a single `SelfSdk.launch()` call.

**Prerequisites**:

- [SPEC-KMP-SDK.md](./SPEC-KMP-SDK.md) — KMP SDK with 5 native handlers and WebView host
- [SPEC-WEBVIEW-UI.md](./SPEC-WEBVIEW-UI.md) — WebView app (bundled Vite bundle)

---

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

---

## Directory Structure

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
      AndroidManifest.xml
      java/.../MainApplication.kt

  iosApp/
    iosApp/
      iOSApp.swift                     # SwiftUI wrapper
      ContentView.swift
    iosApp.xcodeproj/
```

---

## Screens

The sample app has only two native screens. Everything else happens inside the WebView.

### 1. HomeScreen

**Purpose**: Landing page with verification status and a "Verify Identity" button that launches the SDK.

**UI**:

- App title: "MiniPay" with Self branding
- Status card: Shows current verification state (unverified / verified / expired)
- "Verify Identity" button -- calls `SelfSdk.launch()`
- Previously verified proof summary (if any)

**State**:

```kotlin
data class HomeState(
    val isVerified: Boolean = false,
    val lastProofDate: String? = null,
    val verifiedClaims: Map<String, String>? = null,
)
```

### 2. WebView Verification Flow (SDK-managed)

When the user taps "Verify Identity", the app calls `SelfSdk.launch()`. The SDK opens a WebView that handles the entire verification flow internally:

1. Country selection
2. Document type selection
3. Camera MRZ scanning
4. NFC passport reading
5. Biometric confirmation
6. Proof generation
7. Result display

The native app does not manage any of these screens -- the WebView handles all navigation, state, and proving logic. The native app only receives a callback when the flow completes.

### 3. ResultScreen

**Purpose**: Display the verification result after the WebView flow completes.

**Success UI**:

- Checkmark animation
- "Identity Verified" title
- Disclosed claims list (nationality, age, etc. based on disclosure flags)
- "Done" button -- return to HomeScreen

**Failure UI**:

- Error icon
- Error message from `SelfSdkError`
- "Try Again" button -- re-launches `SelfSdk.launch()`

**Cancelled**:

- User dismissed the WebView -- return to HomeScreen silently

---

## SDK Integration

The entire integration fits in a single call site:

```kotlin
// Configure once (e.g., in Application.onCreate or ViewModel init)
val sdk = SelfSdk.configure(SelfSdkConfig(debug = true))

// Launch verification from a button tap
sdk.launch(
    request = VerificationRequest(
        userId = "...",
        disclosures = listOf("nationality", "age"),
    ),
    callback = object : SelfSdkCallback {
        override fun onSuccess(result: VerificationResult) {
            // Navigate to ResultScreen with success
            viewModel.onVerificationSuccess(result)
        }
        override fun onFailure(error: SelfSdkError) {
            // Navigate to ResultScreen with error
            viewModel.onVerificationFailure(error)
        }
        override fun onCancelled() {
            // User dismissed -- stay on HomeScreen
            viewModel.onVerificationCancelled()
        }
    }
)
```

That is the entire SDK surface area the sample app touches. Registration, document scanning, NFC, proving -- all handled inside the WebView.

---

## ViewModel

```kotlin
class MainViewModel {
    // Navigation state
    var currentScreen by mutableStateOf<Screen>(Screen.Home)

    // Result data
    var verificationResult: VerificationResult? = null
    var verificationError: SelfSdkError? = null

    // Home state
    var homeState by mutableStateOf(HomeState())

    fun onVerificationSuccess(result: VerificationResult) {
        verificationResult = result
        verificationError = null
        currentScreen = Screen.Result
    }

    fun onVerificationFailure(error: SelfSdkError) {
        verificationResult = null
        verificationError = error
        currentScreen = Screen.Result
    }

    fun onVerificationCancelled() {
        // Stay on home, no action needed
    }

    fun returnToHome() {
        // Update home state if verification succeeded
        verificationResult?.let {
            homeState = HomeState(
                isVerified = true,
                lastProofDate = it.timestamp,
                verifiedClaims = it.disclosedClaims,
            )
        }
        verificationResult = null
        verificationError = null
        currentScreen = Screen.Home
    }
}

sealed class Screen {
    data object Home : Screen()
    data object Result : Screen()
}
```

---

## Build Configuration

### `packages/kmp-minipay-sample/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}
```

### `composeApp/build.gradle.kts`

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
        compilations.all { kotlinOptions { jvmTarget = "17" } }
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

---

## Chunking Guide

### Chunk 5A: Project Setup + Home Screen + Launch Button

**Goal**: Create the project, build the home screen, and wire the "Verify Identity" button.

**Steps**:

1. Create `packages/kmp-minipay-sample/` directory structure
2. Configure `build.gradle.kts` with Compose Multiplatform + `project(":kmp-sdk:shared")` dependency
3. Implement `App.kt` with simple two-screen navigation (Home, Result)
4. Implement `MainViewModel.kt` with launch/result state
5. Implement `HomeScreen.kt` with status card and "Verify Identity" button
6. Android: `MainActivity.kt`, `AndroidManifest.xml`
7. iOS: `MainViewController.kt`, `iOSApp.swift`, `ContentView.swift`
8. Validate: App builds and launches on both platforms, button is visible

### Chunk 5B: Wire SelfSdk.launch() + Handle Callback

**Goal**: Connect the button to `SelfSdk.launch()` and handle the three callback paths.

**Steps**:

1. Initialize `SelfSdk.configure()` in the ViewModel or Application class
2. Wire "Verify Identity" button to call `sdk.launch()` with a test `VerificationRequest`
3. Implement `SelfSdkCallback` -- route `onSuccess`, `onFailure`, `onCancelled` to ViewModel
4. Implement `ResultScreen.kt` with success/failure/cancelled display
5. Validate: Tap button, WebView opens with verification flow, callback fires on completion

### Chunk 5C: Polish Result Display + Error Handling

**Goal**: Polish the result screen and handle edge cases.

**Steps**:

1. Success: Display all disclosed claims from `VerificationResult`
2. Failure: Map `SelfSdkError` codes to user-friendly messages
3. Persist verification status so HomeScreen reflects verified state across app restarts
4. Theme: Apply MiniPay-style colors and typography
5. Edge cases: Handle Activity recreation during WebView flow, back button behavior
6. Validate: Full end-to-end flow on physical device, error cases handled gracefully

---

## Testing

### Unit Tests (`commonTest/`)

**ViewModel State** (~5 tests):

- Initial screen is `Home`
- `onVerificationSuccess()` stores result and navigates to `Result`
- `onVerificationFailure()` stores error and navigates to `Result`
- `onVerificationCancelled()` stays on `Home`
- `returnToHome()` updates `HomeState` if verification succeeded, clears transient state

### Device Tests (manual, per-chunk)

**Chunk 5A -- Home Screen**:

- App launches on Android emulator and iOS simulator
- HomeScreen displays "Unverified" status
- "Verify Identity" button is visible and tappable

**Chunk 5B -- SDK Launch + Callback**:

- Tapping "Verify Identity" opens the WebView verification flow
- Completing the flow in the WebView fires `onSuccess` callback
- Dismissing the WebView fires `onCancelled` callback
- A failure scenario fires `onFailure` callback
- Result screen displays after callback

**Chunk 5C -- Polish**:

- Success screen shows disclosed claims matching the request
- Failure screen shows error message
- "Try Again" re-launches the verification flow
- "Done" returns to home with updated verified status
- Both platforms: identical behavior

### End-to-End Acceptance Test

1. Launch app -- Home screen shows "Unverified"
2. Tap "Verify Identity" -- WebView opens
3. WebView: Select country, scan MRZ, tap NFC, confirm biometrics
4. WebView: Proof generated, result shown inside WebView
5. WebView closes -- native `onSuccess` callback fires
6. ResultScreen shows "Identity Verified" with correct claims
7. Return to Home -- shows "Verified" with proof date

Run on: Android physical device + iOS physical device.

---

## Dependencies

- **SPEC-KMP-SDK.md**: KMP SDK with 5 native handlers (NFC, Camera, Biometrics, Keychain, Lifecycle) and WebView host
- **SPEC-WEBVIEW-UI.md**: Bundled Vite app that runs inside the WebView (all verification screens + proving logic)
