# MiniPay Sample App — Headless KMP SDK Demo

## Overview

A native Compose Multiplatform app demonstrating the **headless SDK flow** — no WebView. This is the reference implementation for integrating the Self KMP SDK into a crypto wallet (MiniPay) or any app that needs native proof generation.

The app scans a passport, generates a zero-knowledge proof using the native `ProvingClient`, and displays the result — all without launching a WebView.

**Prerequisites**:
- [SPEC-KMP-SDK.md](./SPEC-KMP-SDK.md) — Bridge protocol, common models
- [SPEC-IOS-HANDLERS.md](./SPEC-IOS-HANDLERS.md) — iOS native handlers (NFC, Camera via Swift providers)
- [SPEC-PROVING-CLIENT.md](./SPEC-PROVING-CLIENT.md) — Native proving client (`ProvingClient`)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  MiniPay Sample App (Compose Multiplatform)  │
├─────────────────────────────────────────────┤
│  Screens:                                    │
│    HomeScreen → QrScanScreen →               │
│    DocumentScanScreen → ProvingScreen →      │
│    ResultScreen                              │
├─────────────────────────────────────────────┤
│  ViewModel Layer:                            │
│    MainViewModel (navigation + state)        │
├─────────────────────────────────────────────┤
│  KMP SDK (Native APIs — no WebView):         │
│    NFC scan → ProvingClient.prove() → result │
│    SecureStorage for secrets                 │
│    Crypto for key management                 │
└─────────────────────────────────────────────┘
```

### Key Difference from Test App

| | Test App (`kmp-test-app`) | MiniPay Sample |
|---|---|---|
| Proof generation | WebView (Person 1's Vite bundle) | Native `ProvingClient` |
| UI | Compose Multiplatform + WebView overlay | Pure Compose Multiplatform |
| SDK entry point | `SelfSdk.launch()` → WebView | `ProvingClient.prove()` → native |
| Use case | Full Self verification flow | Wallet integration demo |

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
        MainViewModel.kt                # App state management
        screens/
          HomeScreen.kt                 # Landing screen with "Verify" button
          QrScanScreen.kt               # QR code scanner
          DocumentScanScreen.kt         # MRZ camera + NFC passport scan
          ProvingScreen.kt              # Proving progress UI
          ResultScreen.kt               # Success/failure display
        models/
          AppState.kt                   # Navigation state
          VerificationRequest.kt        # Parsed QR code data
        theme/
          Theme.kt                      # MiniPay-style theming

      androidMain/kotlin/xyz/self/minipay/
        MainActivity.kt                # Android entry point
        QrScannerAndroid.kt            # CameraX QR scanner (expect/actual)

      iosMain/kotlin/xyz/self/minipay/
        MainViewController.kt          # iOS entry point
        QrScannerIos.kt                # AVFoundation QR scanner (expect/actual)

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

### 1. HomeScreen

**Purpose**: Landing page with verification status and "Verify Identity" button.

**UI**:
- App title: "MiniPay" with Self branding
- Status card: Shows current verification state (unverified / verified / expired)
- "Verify Identity" button → navigates to QR scanner
- Previously verified proof summary (if any)

**State**:
```kotlin
data class HomeState(
    val isVerified: Boolean = false,
    val lastProofDate: String? = null,
    val verifiedClaims: Map<String, String>? = null,
)
```

### 2. QrScanScreen

**Purpose**: Scan a QR code containing a verification request URL.

**QR Code Format**: The QR code encodes a URL with verification parameters:
```
https://self.xyz/verify?scope=<scope>&endpoint=<endpoint>&endpointType=<type>
  &chainId=<id>&userId=<userId>&disclosures=<json>&version=<v>
  &userDefinedData=<data>&selfDefinedData=<data>
```

**UI**:
- Full-screen camera preview with QR code overlay
- "Scan a verification QR code" instruction text
- Cancel button to return to home

**Platform Implementation**:
- Android: CameraX + ML Kit `BarcodeScanning`
- iOS: AVFoundation `AVCaptureMetadataOutput` with `.qr` metadata type

```kotlin
// commonMain — expect declaration
expect class QrScanner {
    fun startScanning(onQrDetected: (String) -> Unit, onError: (String) -> Unit)
    fun stopScanning()
}
```

**QR Parsing**:
```kotlin
fun parseVerificationUrl(url: String): ProvingRequest {
    val uri = Url(url)
    return ProvingRequest(
        circuitType = CircuitType.DISCLOSE,  // QR codes are always disclosure requests
        scope = uri.parameters["scope"],
        endpoint = uri.parameters["endpoint"],
        endpointType = EndpointType.valueOf(uri.parameters["endpointType"]?.uppercase() ?: "CELO"),
        chainId = uri.parameters["chainId"]?.toIntOrNull(),
        userId = uri.parameters["userId"],
        disclosures = parseDisclosures(uri.parameters["disclosures"]),
        version = uri.parameters["version"]?.toIntOrNull() ?: 1,
        userDefinedData = uri.parameters["userDefinedData"] ?: "",
        selfDefinedData = uri.parameters["selfDefinedData"] ?: "",
    )
}
```

### 3. DocumentScanScreen

**Purpose**: Two-phase document scanning — MRZ camera detection, then NFC passport read.

**Phase 1 — MRZ Camera Scan**:
- Camera preview focused on passport MRZ zone
- Visual overlay showing the MRZ detection region
- Progress states: NO_TEXT → TEXT_DETECTED → ONE_MRZ_LINE → TWO_MRZ_LINES
- Auto-transitions to Phase 2 when MRZ is detected

**Phase 2 — NFC Passport Scan**:
- Instruction: "Hold your phone against the passport"
- Progress animation showing NFC scan states (0–7):
  - 0: "Hold your phone near the passport"
  - 1: "Passport detected..."
  - 2: "Authenticating..."
  - 3: "Reading passport data..."
  - 4: "Reading security data..."
  - 5: "Verifying passport..."
  - 6: "Processing..."
  - 7: "Scan complete!"
- Progress bar reflecting percentage
- Cancel button

**SDK Integration**:
```kotlin
// Phase 1: MRZ detection via Camera bridge handler
val mrzResult = sdk.cameraMrz.scanMrz()
val mrzData = Json.decodeFromString<MrzData>(mrzResult)

// Phase 2: NFC scan using MRZ data for BAC/PACE authentication
val scanResult = sdk.nfc.scanPassport(
    passportNumber = mrzData.documentNumber,
    dateOfBirth = mrzData.dateOfBirth,
    dateOfExpiry = mrzData.dateOfExpiry,
)
```

On Android, the NFC handler uses JMRTD directly. On iOS, it calls through the Swift `NfcProvider` → `NfcPassportHelper`.

### 4. ProvingScreen

**Purpose**: Show proving progress as the native `ProvingClient` runs.

**UI**:
- Stepper/progress indicator showing current state
- Each state maps to a user-friendly label:
  - `FetchingData` → "Fetching verification data..."
  - `ValidatingDocument` → "Validating your document..."
  - `ConnectingTee` → "Connecting to secure enclave..."
  - `Proving` → "Generating proof..." (with spinner)
  - `PostProving` → "Finalizing..."
- Animated progress bar
- Cancel button (cancels the coroutine)

**SDK Integration**:
```kotlin
val provingClient = ProvingClient(ProvingConfig(
    environment = if (request.endpointType == EndpointType.STAGING_CELO)
        Environment.STG else Environment.PROD,
))

// Load secret from secure storage
val secret = sdk.secureStorage.get("user_secret")
    ?: throw IllegalStateException("No user secret found")

// Load parsed document from previous scan
val document = parsePassportScanResult(scanResult)

// Run proving with state callbacks
try {
    val result = provingClient.prove(
        document = document,
        request = request,
        secret = secret,
        onStateChange = { state ->
            // Update UI with current state
            viewModel.updateProvingState(state)
        },
    )
    viewModel.navigateToResult(result)
} catch (e: ProvingException) {
    viewModel.navigateToResult(ProofResult(success = false), error = e)
}
```

### 5. ResultScreen

**Purpose**: Display proof result — success or failure.

**Success UI**:
- Checkmark animation
- "Identity Verified" title
- Disclosed claims list (name, nationality, age, etc. based on disclosure flags)
- Proof UUID for reference
- "Done" button → return to HomeScreen

**Failure UI**:
- Error icon
- Error code and human-readable message
- "Try Again" button → return to appropriate screen
- Error-specific guidance:
  - `DOCUMENT_NOT_SUPPORTED` → "Your passport type is not yet supported"
  - `NOT_REGISTERED` → "Please register your passport first"
  - `TEE_CONNECT_FAILED` → "Connection failed. Check your internet and try again"
  - `PROVE_FAILED` → "Proof generation failed. Please try again"

---

## ViewModel

```kotlin
class MainViewModel {
    // Navigation state
    var currentScreen by mutableStateOf<Screen>(Screen.Home)

    // Data passed between screens
    var verificationRequest: ProvingRequest? = null
    var mrzData: MrzData? = null
    var passportScanResult: JsonElement? = null
    var provingState: ProvingState? = null
    var proofResult: ProofResult? = null
    var error: ProvingException? = null

    // Navigation
    fun navigateToQrScan() { currentScreen = Screen.QrScan }
    fun onQrScanned(url: String) {
        verificationRequest = parseVerificationUrl(url)
        currentScreen = Screen.DocumentScan
    }
    fun onMrzDetected(data: MrzData) { mrzData = data }
    fun onPassportScanned(result: JsonElement) {
        passportScanResult = result
        currentScreen = Screen.Proving
    }
    fun updateProvingState(state: ProvingState) { provingState = state }
    fun navigateToResult(result: ProofResult, error: ProvingException? = null) {
        proofResult = result
        this.error = error
        currentScreen = Screen.Result
    }
    fun returnToHome() {
        currentScreen = Screen.Home
        // Clear transient state
    }
}

sealed class Screen {
    data object Home : Screen()
    data object QrScan : Screen()
    data object DocumentScan : Screen()
    data object Proving : Screen()
    data object Result : Screen()
}
```

---

## Registration Flow

Before disclosure, the user must register their passport. The sample app detects this automatically:

1. User scans QR code (disclosure request)
2. App loads passport data from secure storage (or scans if first time)
3. `ProvingClient.prove()` with `CircuitType.DISCLOSE`
4. `DocumentValidator` detects user is NOT registered
5. State machine throws `ProvingException("NOT_REGISTERED")`
6. App catches this and shows: "You need to register first. Register now?"
7. If yes: runs `ProvingClient.prove()` with `CircuitType.REGISTER` (and DSC if needed)
8. On success: re-runs the original disclosure request

```kotlin
try {
    val result = provingClient.prove(document, request, secret, onStateChange)
    // Success — show result
} catch (e: ProvingException) {
    if (e.code == "NOT_REGISTERED") {
        // Auto-register flow
        val registerRequest = ProvingRequest(circuitType = CircuitType.REGISTER)
        provingClient.prove(document, registerRequest, secret, onStateChange)
        // Retry original disclosure
        val result = provingClient.prove(document, request, secret, onStateChange)
        // Show result
    } else {
        // Show error
    }
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

            // KMP SDK (local project dependency)
            implementation(project(":kmp-sdk:shared"))

            // Serialization
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
        }

        val androidMain by getting {
            dependencies {
                implementation(libs.compose.ui.tooling.preview)
                implementation(libs.androidx.activity.compose)
                // QR scanning
                implementation("com.google.mlkit:barcode-scanning:17.2.0")
                implementation("androidx.camera:camera-camera2:1.3.4")
                implementation("androidx.camera:camera-lifecycle:1.3.4")
                implementation("androidx.camera:camera-view:1.3.4")
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

---

## Chunking Guide

### Chunk 5A: Project Setup + Navigation Shell

**Goal**: Create the Compose Multiplatform project with navigation between empty screens.

**Steps**:
1. Create `packages/kmp-minipay-sample/` directory structure
2. Configure `build.gradle.kts` with Compose Multiplatform + KMP SDK dependency
3. Implement `App.kt` with navigation controller
4. Implement `MainViewModel.kt` with screen state
5. Create placeholder screens (HomeScreen, QrScanScreen, DocumentScanScreen, ProvingScreen, ResultScreen)
6. Android: `MainActivity.kt`, `AndroidManifest.xml` (NFC + Camera permissions)
7. iOS: `MainViewController.kt`, `iOSApp.swift`, `ContentView.swift`
8. Validate: App builds and launches with navigation between placeholder screens

### Chunk 5B: QR Scanner

**Goal**: Camera-based QR code scanning with URL parsing.

**Steps**:
1. Define `expect class QrScanner` in commonMain
2. Implement Android actual: CameraX + ML Kit BarcodeScanning
3. Implement iOS actual: AVFoundation metadata output (via Swift provider if needed)
4. Implement `QrScanScreen.kt` — camera preview with QR overlay
5. Implement URL parser: `parseVerificationUrl(url) → ProvingRequest`
6. Wire QR detection → ViewModel → navigate to DocumentScan
7. Validate: Scan a test QR code, verify parsed parameters

### Chunk 5C: Document Scanner (MRZ + NFC)

**Goal**: Passport scanning using SDK native APIs.

**Steps**:
1. Implement `DocumentScanScreen.kt` with two-phase UI
2. Phase 1: Camera MRZ detection — use SDK's `CameraMrzBridgeHandler` via native API
3. Phase 2: NFC passport scan — use SDK's `NfcBridgeHandler` via native API
4. Progress UI: Map scan states to visual indicators
5. Parse `PassportScanResult` into `IDDocument` model for proving
6. Validate: Full MRZ detect → NFC scan on physical device

**Note**: On Android, the NFC scan uses the SDK's `NfcBridgeHandler` directly (JMRTD). On iOS, it calls through the Swift provider chain. The sample app calls the handler APIs directly rather than going through the WebView bridge — this is the "headless" pattern.

### Chunk 5D: Proving Screen + Integration

**Goal**: Wire up `ProvingClient` and show progress.

**Steps**:
1. Implement `ProvingScreen.kt` with state-based progress UI
2. Instantiate `ProvingClient` with config from parsed QR
3. Convert `PassportScanResult` → `IDDocument` (passport data model)
4. Load user secret from secure storage (or generate if first time)
5. Call `provingClient.prove()` with `onStateChange` callback
6. Handle success → navigate to ResultScreen
7. Handle registration requirement → auto-register flow
8. Handle errors → navigate to ResultScreen with error
9. Validate: Full end-to-end flow against staging TEE

### Chunk 5E: Result Screen + Polish

**Goal**: Display results and polish the app.

**Steps**:
1. Implement `ResultScreen.kt` with success/failure UI
2. Display disclosed claims based on verification request
3. Persist verification status for HomeScreen
4. Theme: MiniPay-style colors and typography
5. Error handling: User-friendly messages for each error code
6. iOS: Wire up `SelfSdkSwift.configure()` in `iOSApp.swift`
7. Validate: Full flow on both platforms, error cases handled

---

## Key SDK APIs Used

The sample app demonstrates calling SDK APIs directly (no WebView bridge):

```kotlin
// 1. MRZ Camera Scan
val cameraMrzProvider = SdkProviderRegistry.cameraMrz  // iOS
// or direct call to CameraMrzBridgeHandler            // Android

// 2. NFC Passport Scan
val nfcProvider = SdkProviderRegistry.nfc              // iOS
// or direct call to NfcBridgeHandler                   // Android

// 3. Secure Storage (for user secret)
val storageProvider = SdkProviderRegistry.secureStorage // iOS
// or direct call to SecureStorageBridgeHandler          // Android

// 4. Native Proving
val provingClient = ProvingClient(config)
val result = provingClient.prove(document, request, secret, onStateChange)
```

For a cleaner API, the SDK should expose a unified interface in `commonMain`:

```kotlin
// Future enhancement: SelfSdk headless API
class SelfSdk {
    val nfc: NfcApi          // Wraps NfcBridgeHandler / NfcProvider
    val camera: CameraApi    // Wraps CameraMrzBridgeHandler / CameraMrzProvider
    val storage: StorageApi  // Wraps SecureStorageBridgeHandler / SecureStorageProvider
    val proving: ProvingClient
}
```

---

## Testing

### Unit Tests (`commonTest/`)

**QR URL Parsing** (~8 tests):
- `parseVerificationUrl()` extracts all parameters correctly
- Missing optional parameters use defaults
- Malformed URL throws with clear error
- URL with encoded characters decodes correctly
- `disclosures` JSON parameter parses into `Disclosures` object

**ViewModel Navigation** (~6 tests):
- Initial screen is `Home`
- `onQrScanned()` parses URL and navigates to `DocumentScan`
- `onPassportScanned()` navigates to `Proving`
- `navigateToResult()` stores result and navigates to `Result`
- `returnToHome()` clears transient state

### Device Tests (manual, per-chunk)

**Chunk 5A — Navigation Shell**:
- App launches on Android emulator and iOS simulator
- All 5 screens reachable via navigation
- Back navigation works correctly

**Chunk 5B — QR Scanner**:
- Camera permission prompt appears on first launch
- Camera preview renders full-screen
- Scanning a test QR code extracts correct URL
- Scanning a non-URL QR code shows error gracefully
- Cancel returns to home

**Chunk 5C — Document Scanner**:
- MRZ camera phase: Progress states advance as passport is positioned (0 → 1 → 2 → 3)
- MRZ camera phase: Auto-transitions to NFC phase when MRZ detected
- NFC phase: Progress states advance during passport scan (0 → 7)
- NFC phase: Cancel during scan returns to previous screen without crash
- NFC phase: Bad MRZ data (wrong dates) produces clear error
- Full scan produces valid `PassportScanResult` JSON

**Chunk 5D — Proving**:
- State callbacks fire in order: FetchingData → ValidatingDocument → ConnectingTee → Proving → PostProving → Completed
- UI updates for each state transition (progress indicator advances)
- Cancel during proving cancels the coroutine cleanly
- NOT_REGISTERED error triggers auto-register flow
- Other errors navigate to result screen with error details
- Full end-to-end against staging TEE succeeds with mock passport

**Chunk 5E — Result + Polish**:
- Success screen shows disclosed claims matching the request's disclosures
- Failure screen shows error code and human-readable message
- "Try Again" navigates back to appropriate screen
- "Done" returns to home, home shows verified status
- Both platforms: identical behavior for same QR code + passport combo

### End-to-End Acceptance Test

1. Launch app → Home screen shows "Unverified"
2. Tap "Verify Identity" → QR scanner opens
3. Scan test QR code → navigates to document scanner
4. Position passport → MRZ detected → "Hold phone near passport"
5. Tap passport → NFC scan completes
6. Proving screen shows progress through all states
7. Result screen shows "Identity Verified" with correct claims
8. Return to Home → shows "Verified" with proof date

Run on: Android physical device + iOS physical device.

---

## Dependencies

- **SPEC-KMP-SDK.md**: NFC handler (Android), Camera handler (Android), SecureStorage handler
- **SPEC-IOS-HANDLERS.md**: NFC provider (iOS), Camera provider (iOS), SecureStorage provider (iOS)
- **SPEC-PROVING-CLIENT.md**: `ProvingClient` API — the core of this app
- **SPEC-COMMON-LIB.md**: Passport data parsing, commitment generation (used by ProvingClient)
