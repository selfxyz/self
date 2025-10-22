# Prebuilt iOS Frameworks

This directory contains prebuilt XCFrameworks that are vendored with the mobile-sdk-alpha package.

## Contents

### SelfSDK.xcframework
- **Purpose**: Wrapper framework containing NFCPassportReader statically linked
- **Includes**:
  - NFCPassportReader (statically linked)
  - NFCPassportReader.swiftmodule (for type compatibility)
  - SelfSDK convenience APIs
- **Dependencies**: OpenSSL.xcframework

### OpenSSL.xcframework
- **Purpose**: Cryptographic library required by NFCPassportReader
- **Note**: Required at runtime by SelfSDK.xcframework

## Why Prebuilt?

These frameworks are distributed as prebuilt binaries to:
1. Keep proprietary NFCPassportReader integration code private
2. Simplify distribution without requiring access to private repositories
3. Mirror the Android AAR distribution pattern

## Usage

These frameworks are automatically linked when mobile-sdk-alpha is installed via CocoaPods or used as a local dependency. No additional configuration is required by consumers.

## Building from Source

If you need to rebuild these frameworks:

### Prerequisites

1. Build the `SelfSDK-Updated.xcarchive` in `mobile-sdk-ios-native` with:
   - NFCPassportReader statically linked
   - OpenSSL linked
   - NFCPassportReader.swiftmodule in Products directory

### Build Steps

```bash
cd packages/mobile-sdk-ios-native/SelfSDK

# Step 1: Copy NFCPassportReader.swiftmodule into SelfSDK.framework/Modules/
# (This must be done BEFORE creating the XCFramework)
cp -R SelfSDK-Updated.xcarchive/Products/NFCPassportReader.swiftmodule \
      SelfSDK-Updated.xcarchive/Products/SelfSDK.framework/Modules/

# Step 2: Create SelfSDK XCFramework
xcodebuild -create-xcframework \
  -framework SelfSDK-Updated.xcarchive/Products/SelfSDK.framework \
  -output ../../mobile-sdk-alpha/ios/Frameworks/SelfSDK.xcframework

# Step 3: CRITICAL - Manually copy the .swiftmodule file
# xcodebuild filters out .swiftmodule files, so we need to copy it manually
cp SelfSDK-Updated.xcarchive/Products/SelfSDK.framework/Modules/NFCPassportReader.swiftmodule/arm64-apple-ios.swiftmodule \
   ../../mobile-sdk-alpha/ios/Frameworks/SelfSDK.xcframework/ios-arm64/SelfSDK.framework/Modules/NFCPassportReader.swiftmodule/

# Step 4: Create OpenSSL XCFramework
xcodebuild -create-xcframework \
  -framework SelfSDK-Updated.xcarchive/Products/OpenSSL.framework \
  -output ../../mobile-sdk-alpha/ios/Frameworks/OpenSSL.xcframework

# Step 5: Verify the structure
ls -la ../../mobile-sdk-alpha/ios/Frameworks/SelfSDK.xcframework/ios-arm64/SelfSDK.framework/Modules/NFCPassportReader.swiftmodule/
# Should show: arm64-apple-ios.abi.json, arm64-apple-ios.swiftdoc, arm64-apple-ios.swiftmodule
```

### Why the Manual Copy?

**Step 3 is critical**: The `xcodebuild -create-xcframework` command filters out `.swiftmodule` files from nested module directories. Without this manual copy:
- The NFCPassportReader module interface would be incomplete
- Imports of `NFCPassportReader` types would fail at compile time
- The framework would be unusable

The manual copy ensures the complete module interface is available for Swift to resolve `NFCPassportReader` types.

## Distribution

These XCFrameworks are included in the npm package via the `files` array in package.json and vendored via the podspec.
