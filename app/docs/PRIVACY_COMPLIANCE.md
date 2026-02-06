# Privacy Compliance for SumSub Integration

## Overview

This document outlines the privacy declarations required for App Store and Google Play Store compliance when using SumSub's Device Intelligence (Fisherman) module.

## iOS Privacy Compliance

### Privacy Manifest Declaration

**File:** `app/ios/PrivacyInfo.xcprivacy`

Device Intelligence requires declaring device ID collection in the privacy manifest:

```xml
<key>NSPrivacyCollectedDataTypes</key>
<array>
  <dict>
    <key>NSPrivacyCollectedDataType</key>
    <string>NSPrivacyCollectedDataTypeDeviceID</string>
    <key>NSPrivacyCollectedDataTypeLinked</key>
    <false/>
    <key>NSPrivacyCollectedDataTypeTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypePurposes</key>
    <array>
      <string>NSPrivacyCollectedDataTypePurposeFraudPreventionAndSecurity</string>
    </array>
  </dict>
</array>
```

### iOS Configuration

**Device Intelligence (Fisherman):** ✅ Enabled
- Configured in `app/ios/Podfile` via `ENV["IDENSIC_WITH_FISHERMAN"] = "true"`
- Privacy declaration: Device ID collection for fraud prevention

**VideoIdent:** ❌ Disabled
- Commented out in `app/ios/Podfile`
- Avoids microphone permission requirements
- Will be re-enabled in future release for liveness checks

### iOS Verification Checklist

Before submitting to App Store:

- [x] `PrivacyInfo.xcprivacy` declares `NSPrivacyCollectedDataTypeDeviceID`
- [x] Purpose set to `NSPrivacyCollectedDataTypePurposeFraudPreventionAndSecurity`
- [x] Data is not linked to user identity (`NSPrivacyCollectedDataTypeLinked = false`)
- [x] Data is not used for tracking (`NSPrivacyCollectedDataTypeTracking = false`)
- [ ] If VideoIdent is re-enabled, add microphone usage description to Info.plist

## Android Privacy Compliance

### Google Play Data Safety Declaration

**Data Type:** Device or Other IDs

**What's collected:**
- Device fingerprinting data for fraud detection
- Device configuration and attributes

**Declaration details:**
- **Collected:** ✅ Yes
- **Processed ephemerally:** ❌ No
- **Required or optional:** ✅ Required for fraud prevention
- **Purpose:** Fraud prevention, security, and compliance
- **Shared with third parties:** ✅ Yes - SumSub for identity verification

### Android Configuration

**Device Intelligence (Fisherman):** ✅ Enabled
- Configured in `patches/@sumsub+react-native-mobilesdk-module+1.40.2.patch`
- Includes `idensic-mobile-sdk-fisherman` module

**VideoIdent:** ❌ Disabled
- Commented out in patch file
- Avoids `FOREGROUND_SERVICE_MICROPHONE` permission requirement
- Will be re-enabled in future release for liveness checks

### Android Manifest

Currently, no special AndroidManifest declarations are required for Device Intelligence beyond standard permissions already included.

**Future requirement (if VideoIdent is re-enabled):**
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
```

### Android Verification Checklist

Before submitting to Google Play:

- [ ] Google Play Data Safety form declares "Device or other IDs" as collected
- [ ] Purpose listed as "Fraud prevention, security, and compliance"
- [ ] Third-party sharing with SumSub is disclosed
- [ ] If VideoIdent is re-enabled, add microphone permission and declare usage

## SumSub Modules Summary

| Module | iOS | Android | Purpose | Privacy Impact |
|--------|-----|---------|---------|----------------|
| **Device Intelligence (Fisherman)** | ✅ Enabled | ✅ Enabled | Fraud detection | Requires device ID declaration |
| **VideoIdent** | ❌ Disabled | ❌ Disabled | Liveness checks | Would require microphone permissions |

## Related Files

### Configuration
- `app/ios/Podfile` - iOS SumSub module configuration
- `patches/@sumsub+react-native-mobilesdk-module+1.40.2.patch` - Android module configuration
- `app/src/integrations/sumsub/sumsubService.ts` - Platform configuration documentation

### Privacy Declarations
- `app/ios/PrivacyInfo.xcprivacy` - iOS privacy manifest
- `app/android/app/src/main/AndroidManifest.xml` - Android permissions

## Additional Resources

### Apple
- [Apple Privacy Manifest Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [MASTG iOS Privacy Analysis](https://mas.owasp.org/MASTG/techniques/ios/MASTG-TECH-0137/)

### Google
- [Google Play Data Safety Form](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Android Permissions Best Practices](https://developer.android.com/training/permissions/requesting)

### SumSub
- [SumSub Device Intelligence Documentation](https://docs.sumsub.com/reference/get-started-with-device-intelligence)
- [SumSub React Native Module](https://docs.sumsub.com/docs/react-native-module)
- [SumSub iOS SDK Documentation](https://docs.sumsub.com/docs/get-started-ios)

## Future Considerations

When re-enabling VideoIdent for liveness checks:

### iOS Requirements
1. Add microphone usage description to Info.plist:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Required for live video verification during identity checks</string>
   ```
2. Uncomment `ENV["IDENSIC_WITH_VIDEOIDENT"] = "true"` in Podfile

### Android Requirements
1. Add microphone permission to AndroidManifest.xml:
   ```xml
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
   ```
2. Declare foreground service microphone usage in Google Play console
3. Uncomment VideoIdent module in patch file
4. Update Data Safety form to include microphone usage

### Both Platforms
1. Update platform documentation in `sumsubService.ts`
2. Test microphone permissions flow
3. Verify privacy declarations are complete
