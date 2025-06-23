# Self Demo Android App

This Android app provides a WebView wrapper that opens to `embedded.self.xyz` with secure secret passing and NFC reading capabilities.

## Features

### 1. WebView Integration
- Opens to `https://embedded.self.xyz` by default
- JavaScript interface enabled for communication between web app and native app
- Secure secret injection after page load

### 2. Secure Secret Passing
- The app stores a secret key (configurable in `MainActivity.kt`)
- Secret is hashed using SHA-256 before transmission
- Secret is injected into the web app via JavaScript after page load
- Web app can access the secret through `window.selfApp.setSecret()` or `window.selfAppSecret`

### 3. NFC Reading
- Full NFC tag reading support
- Supports multiple NFC technologies (NDEF, IsoDep, NfcA, NfcB, etc.)
- Web app can request NFC reads via JavaScript interface
- Returns tag ID, NDEF data, and technology information

## How to Use

### For the Web App (embedded.self.xyz)

The web app can interact with the Android app through the `AndroidApp` JavaScript interface:

```javascript
// Read an NFC tag
const nfcData = window.AndroidApp.readNfcTag();
console.log('NFC Data:', nfcData);

// Get app version
const version = window.AndroidApp.getAppVersion();
console.log('App Version:', version);

// Receive the secret (automatically injected)
if (window.selfApp) {
    window.selfApp.setSecret = function(secret) {
        console.log('Received secret:', secret);
        // Use the secret as needed
    };
}
```

### NFC Data Format

The NFC reading function returns data in the following format:
```
ID:1234567890ABCDEF|NDEF:Some NDEF data|TECH:android.nfc.tech.Ndef,android.nfc.tech.NfcA
```

- `ID:` - The unique tag identifier (hex format)
- `NDEF:` - NDEF message content (if available)
- `TECH:` - List of supported NFC technologies

### Error Handling

The app returns error messages in the format `ERROR:description`:
- `ERROR:NFC_NOT_AVAILABLE` - NFC is not available on the device
- `ERROR:TIMEOUT` - NFC read timed out
- `ERROR:NO_TAG_DATA` - No tag data received
- `ERROR:exception_message` - Other exceptions

## Configuration

### Changing the Secret

Edit the `appSecret` variable in `MainActivity.kt`:

```kotlin
private val appSecret = "your-actual-secret-key-here"
```

### Testing

For testing purposes, you can load the local test HTML file by changing the URL in `MainActivity.kt`:

```kotlin
// Change this line in setupWebView()
webView.loadUrl("file:///android_asset/test.html")
```

## Permissions

The app requires the following permissions:
- `INTERNET` - To load the web app
- `NFC` - To read NFC tags
- `ACCESS_NETWORK_STATE` - For network connectivity

## Security Considerations

1. **Secret Storage**: In production, the secret should be stored securely (e.g., in Android Keystore)
2. **HTTPS**: The web app should use HTTPS to ensure secure communication
3. **Input Validation**: The web app should validate all data received from the Android app
4. **Error Handling**: Implement proper error handling for NFC operations

## Building and Running

1. Open the project in Android Studio
2. Ensure you have an NFC-capable device or emulator
3. Build and run the app
4. The app will open to `embedded.self.xyz` with full NFC and secret passing capabilities

## Troubleshooting

### NFC Not Working
- Ensure the device has NFC hardware
- Check that NFC is enabled in device settings
- Verify the app has NFC permissions

### Web App Not Loading
- Check internet connectivity
- Verify the URL is accessible
- Check for any CORS issues

### JavaScript Interface Not Available
- Ensure JavaScript is enabled in WebView settings
- Check that the interface is properly added to the WebView
- Verify the web app is calling the correct interface name (`AndroidApp`) 