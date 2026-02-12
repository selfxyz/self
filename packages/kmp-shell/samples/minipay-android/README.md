# MiniPay Integration Sample

This sample demonstrates how to integrate the Self SDK into MiniPay (or any Android host app).

## Setup

1. Add the Self SDK dependency to your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("xyz.self:android-sdk:0.0.1-alpha.1")
}
```

2. Add NFC and camera permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

## Usage

See `MiniPayActivity.kt` for the full integration example.

```kotlin
class MiniPayActivity : AppCompatActivity() {

    private val selfSdk = SelfSdk.configure {
        appId = "minipay-app-id"
        environment = SelfSdkEnvironment.PRODUCTION
    }

    fun startVerification() {
        selfSdk.launch(
            activity = this,
            request = VerificationRequest(
                scope = "identity",
                userId = celoAddress,
                callbackUrl = "https://api.minipay.com/self/callback",
            ),
            callback = object : SelfSdkCallback {
                override fun onVerificationComplete(result: VerificationResult) {
                    // User is verified — unlock features
                    showSuccess(result.verificationId)
                }

                override fun onVerificationFailed(error: SelfSdkError) {
                    showError(error.message)
                }

                override fun onDismissed() {
                    // User cancelled — do nothing
                }
            }
        )
    }
}
```

## iOS (Swift)

```swift
let selfSdk = SelfSdk.configure {
    $0.appId = "minipay-app-id"
    $0.environment = .production
}

selfSdk.launch(from: self, request: .init(scope: "identity", userId: celoAddress)) { result in
    switch result {
    case .verified(let v):
        print("Verified: \(v.verificationId)")
    case .failed(let e):
        print("Failed: \(e.message)")
    case .dismissed:
        break
    }
}
```
