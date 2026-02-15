# iOS Integration Guide

This guide covers the steps needed to integrate and test the iOS passport scanning flow.

## Overview

The iOS implementation includes:
- Swift helpers for camera and NFC scanning
- iOS-specific Kotlin screens using Compose Multiplatform
- Shared UI components and business logic with Android
- Data persistence using NSUserDefaults

## Integration Required

The code is complete but needs to be integrated into the Xcode project:

## Integration Steps

### 1. Add Swift Files to Xcode Project

The following Swift files have been created and need to be added to the Xcode project:

```
packages/kmp-test-app/iosApp/iosApp/NfcPassportHelper.swift
packages/kmp-test-app/iosApp/iosApp/MrzCameraHelper.swift
```

**Steps:**
1. Open `packages/kmp-test-app/iosApp/iosApp.xcodeproj` in Xcode
2. Right-click on the `iosApp` folder in Project Navigator
3. Select "Add Files to 'iosApp'"
4. Navigate to the `iosApp/iosApp` directory
5. Select both `NfcPassportHelper.swift` and `MrzCameraHelper.swift`
6. Ensure "Copy items if needed" is **unchecked** (files are already in the correct location)
7. Ensure "Create groups" is selected
8. Ensure the `iosApp` target is checked
9. Click "Add"

### 2. Install CocoaPods Dependencies

```bash
cd packages/kmp-test-app/iosApp
pod install
```

This will install the `NFCPassportReader` library required for NFC scanning.

**After installation**, always open the workspace (not the project):
```bash
open iosApp.xcworkspace
```

### 3. Configure Xcode Project Settings

#### Add NFC Capability

1. In Xcode, select the `iosApp` project in Project Navigator
2. Select the `iosApp` target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Near Field Communication Tag Reading"

#### Verify Info.plist Entries

The Info.plist should already contain (verify these are present):

```xml
<key>NFCReaderUsageDescription</key>
<string>This app needs access to NFC to read your passport for identity verification.</string>

<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
    <string>A0000002471001</string>
    <string>A0000002472001</string>
    <string>00000000000000</string>
</array>

<key>NSCameraUsageDescription</key>
<string>This app needs access to your camera to scan the MRZ code on your passport.</string>
```

### 4. Build the Kotlin Framework

```bash
cd packages/kmp-test-app
./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
```

This compiles the Kotlin code and creates the framework that the iOS app will use.

### 5. Build and Run in Xcode

1. Select a target device (physical iPhone with iOS 16.0+ is required for NFC)
2. Click "Run" (⌘R)
3. Accept any code signing prompts

## Testing the Full Flow

### Prerequisites

- **Physical iPhone** with iOS 16.0 or later
- **NFC-enabled passport** (e-Passport with chip symbol)
- **Camera permission** granted
- **NFC permission** granted (will be requested on first scan)

### Test Flow

1. **Passport Details Screen**
   - Enter passport number, date of birth (YYMMDD), date of expiry (YYMMDD)
   - Or use previously saved data
   - Tap "Next: Scan MRZ"

2. **MRZ Scan Screen**
   - Grant camera permission if prompted
   - Point camera at passport's MRZ (two-line code at bottom)
   - The viewfinder frame will change colors:
     - Red: No text detected
     - Orange: Text detected but not MRZ
     - Yellow: One MRZ line detected
     - Green (pulsing): Both lines detected
   - App automatically proceeds to confirmation when both lines are read

3. **MRZ Confirmation Screen**
   - Verify the scanned passport data
   - Tap "Confirm & Continue to NFC" or "Scan Again"

4. **NFC Scan Screen**
   - Grant NFC permission if prompted
   - Tap "Start NFC Scan"
   - Hold your iPhone near the passport's back cover (chip location)
   - Keep still for 10-15 seconds
   - Progress indicators show scanning stages:
     - Waiting for tag (0%)
     - Connecting (5%)
     - Authenticating (15%)
     - Reading passport data (40%)
     - Reading security data (55%)
     - Verifying chip authenticity (70%)
     - Processing (90%)
     - Complete (100%)

5. **Result Screen**
   - View the successful scan result or error details
   - See process logs
   - View JSON result data
   - Tap "Start Over" to test again

## Known Limitations

### Swift-Kotlin Interop

The Swift helpers (`NfcPassportHelper` and `MrzCameraHelper`) are created but need manual Xcode integration:

1. **NFC Scanning**: The `NfcPassportHelper.swift` calls NFCPassportReader but needs to be exposed via `@objc` and imported in the Kotlin code through Xcode's generated headers.

2. **Camera Preview**: The `MrzCameraHelper.swift` creates a camera preview view but the UIKitView integration in `MrzScanScreen.ios.kt` needs the Swift class to be accessible.

### Recommended Integration Pattern

For Swift → Kotlin interop:

```swift
// In NfcPassportHelper.swift (already done)
@objc public class NfcPassportHelper: NSObject {
    @objc public func scanPassport(...) { ... }
}
```

```kotlin
// In Kotlin (needs to be added once Xcode builds the framework)
import platform.UIKit.* // or platform specific import
// Access the Swift class via generated Objective-C headers
```

Alternatively, create an Objective-C bridge file that exposes the Swift classes with explicit `@objc` annotations.

## Debugging

### Enable Logging

Both Swift helpers include logging via `NSLog` and `print`. View logs in Xcode Console.

### Common Issues

1. **"NFC not available"**
   - Ensure you're testing on a physical device (not simulator)
   - Ensure device has NFC capability (iPhone 7 and later)
   - Check that NFC capability is added in Xcode

2. **"Camera permission denied"**
   - Go to iOS Settings → Privacy → Camera → Your App
   - Enable camera access

3. **"Swift class not found"**
   - Ensure Swift files are added to Xcode project
   - Ensure files are in the correct target
   - Clean build folder (⇧⌘K) and rebuild

4. **"Pod install failed"**
   - Ensure CocoaPods is installed: `sudo gem install cocoapods`
   - Try `pod repo update` then `pod install` again

## Next Steps for Full Integration

1. **Expose Swift Helpers to Kotlin**
   - Add bridging header if needed
   - Ensure `@objc` annotations are correct
   - Import Swift classes in Kotlin via cinterop definitions

2. **Wire Up Callbacks**
   - Connect Swift progress callbacks to Kotlin state updates
   - Handle completion callbacks and pass JSON results

3. **Test on Physical Device**
   - Test with real passport
   - Verify all scanning stages work
   - Test error handling (wrong MRZ key, connection issues, etc.)

4. **Polish UI/UX**
   - Add haptic feedback on state changes
   - Improve error messages
   - Add retry logic for failed scans

## Architecture Summary

```
┌─────────────────────────────────────┐
│      commonMain (Shared Kotlin)      │
│  ViewModel, State Machine, Models    │
│  MrzConfirmationScreen (Compose UI)  │
│  MrzViewfinder, NfcProgressIndicator │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
┌────────▼──────┐  ┌───────▼──────────┐
│   iosMain     │  │  Swift Helpers   │
│  (Kotlin)     │  │  (Native iOS)    │
│               │  │                  │
│ MrzScanScreen │◄─┤ MrzCameraHelper  │
│ NfcScanScreen │◄─┤ NfcPassportHelper│
│ Data Storage  │  │ (via @objc)      │
└───────────────┘  └──────────────────┘
```

## References

- `SPEC-PERSON2-KMP.md` - KMP SDK specification
- `CROSS_PLATFORM_PLAN.md` - Cross-platform architecture
- iOS SDK handlers: `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/`
- RN iOS implementation: `app/ios/PassportReader.swift`
