# Self SDK Android Demo (MiniPay Sample)

This sample is a minimal Android demo app for validating:

- SDK launch from host app
- WebView loading desktop-hosted content
- bridge readiness (`lifecycle.ready`)
- native response delivery via `_handleResponse`
- dismiss and result callback flow

## Default local dev URL

- Android emulator default: `http://10.0.2.2:5173`
- Physical device: `http://<YOUR-LAN-IP>:5173`
  - Example: `http://192.168.1.50:5173`
  - Ensure phone and laptop are on the same network.

## Build and run

From `packages/kmp-shell`:

```bash
./gradlew :android-sdk:assemble
./gradlew :samples:minipay-android:assembleDebug
```

Then install/run the sample app from Android Studio (open `packages/kmp-shell`) or with adb:

```bash
./gradlew :samples:minipay-android:installDebug
adb shell am start -n com.example.minipay/com.example.minipay.MiniPayActivity
```

## Start a local web app for WebView testing

Use your desktop web app at port 5173, or serve the included fixture page:

```bash
cd packages/kmp-shell/samples/minipay-android/docs
python3 -m http.server 5173
```

Fixture file: `bridge-fixture.html`

## Demo flow

1. Open the sample app.
2. Keep the dev server URL as `http://10.0.2.2:5173` (or replace with LAN IP URL).
3. Tap **Launch Self Verification**.
4. Verify the WebView loads your page.
5. Trigger bridge actions from the page.

## What "bridge ready" looks like

- In Android Logcat (tag `SelfVerification`):
  - `Bridge lifecycle.ready received`
- In fixture page log area:
  - request for `lifecycle.ready`
  - response passed through `_handleResponse`

## Expected callback logs in app

The sample app log area shows:

- `onVerificationComplete: verificationId=..., success=true`
- `onVerificationFailed: code=..., message=...`
- `onDismissed`

## Bridge fixture buttons

`bridge-fixture.html` provides buttons to send:

- `lifecycle.ready`
- `lifecycle.setResult` (success)
- `lifecycle.setResult` (failure)
- `lifecycle.dismiss`

This is intentionally minimal for SDK bridge sanity checks.
