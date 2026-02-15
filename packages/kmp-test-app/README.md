# KMP SDK Test App

This directory contains test applications for the Self KMP SDK on both Android and iOS platforms.

## Structure

```
kmp-test-app/
├── androidApp/          # Android test app (Jetpack Compose)
├── iosApp/              # iOS test app (SwiftUI)
├── shared/              # Shared KMP code
└── build.gradle.kts     # Root build configuration
```

## Android Test App

### Setup

1. Build the SDK:
```bash
cd ../kmp-sdk
./gradlew :shared:assembleDebug
```

2. Run the Android app:
```bash
cd ../kmp-test-app
./gradlew :androidApp:installDebug
```

### Implementation Example

```kotlin
// In your Android test app
import xyz.self.sdk.api.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sdk = SelfSdk.configure(
            SelfSdkConfig(
                endpoint = "https://api.self.xyz",
                debug = true
            )
        )

        setContent {
            Button(onClick = {
                sdk.launch(
                    activity = this,
                    request = VerificationRequest(userId = "test-user"),
                    callback = object : SelfSdkCallback {
                        override fun onSuccess(result: VerificationResult) {
                            Log.i("SelfSDK", "Success: ${result.verificationId}")
                        }
                        override fun onFailure(error: SelfSdkError) {
                            Log.e("SelfSDK", "Error: ${error.message}")
                        }
                        override fun onCancelled() {
                            Log.i("SelfSDK", "Cancelled")
                        }
                    }
                )
            }) {
                Text("Launch Verification")
            }
        }
    }
}
```

## iOS Test App

### Setup

1. Build the iOS framework:
```bash
cd ../kmp-sdk
./gradlew :shared:linkDebugFrameworkIosArm64
```

2. Open the iOS project in Xcode:
```bash
cd ../kmp-test-app
open iosApp/iosApp.xcodeproj
```

### Implementation Example

```swift
// In your iOS test app
import SelfSdk

struct ContentView: View {
    var body: some View {
        Button("Launch Verification") {
            let sdk = SelfSdk.companion.configure(
                config: SelfSdkConfig(
                    endpoint: "https://api.self.xyz",
                    debug: true
                )
            )

            do {
                try sdk.launch(
                    request: VerificationRequest(
                        userId: "test-user",
                        scope: nil,
                        disclosures: []
                    ),
                    callback: TestCallback()
                )
            } catch {
                print("Error: \(error)")
            }
        }
    }
}

class TestCallback: SelfSdkCallback {
    func onSuccess(result: VerificationResult) {
        print("Success: \(result.verificationId ?? "")")
    }

    func onFailure(error: SelfSdkError) {
        print("Error: \(error.message)")
    }

    func onCancelled() {
        print("Cancelled")
    }
}
```

## Status

### Android ✅
- SDK implementation: **COMPLETE**
- All native handlers implemented and functional
- WebView hosting configured
- Bridge communication working

### iOS ✅
- SDK infrastructure: **COMPLETE** (compiles successfully)
- NFC passport scanning: **WORKING** (via Swift helper + NFCPassportReader)
- MRZ camera scanning: **WORKING** (via Swift helper + AVFoundation + Vision)
- WebView hosting: needs UIViewController integration

See `iOS_INTEGRATION_GUIDE.md` for setup and testing instructions.

## Testing

### Manual Testing

1. **Android**: Deploy to device or emulator
2. **iOS**: Deploy to device (simulator may not support NFC/biometrics)

### Required Test Cases

- [ ] WebView loads successfully
- [ ] Bridge communication (JS ↔ Native)
- [ ] NFC passport scan (requires real device + passport)
- [ ] Biometric authentication
- [ ] Secure storage operations
- [ ] Camera MRZ scanning
- [ ] Haptic feedback
- [ ] Activity/ViewController lifecycle
- [ ] Error handling

## Notes

- NFC requires **physical device** (not supported on simulators)
- Biometrics require **enrolled biometrics** on device
- WebView app bundle must be built by Person 1 and copied to assets
