#!/bin/bash
# SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1
# NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

# Copy prebuilt iOS XCFrameworks to dist directory for distribution

set -e

echo "🍎 Preparing iOS XCFrameworks for mobile-sdk-alpha..."

# Navigate to SDK directory
SDK_DIR="$(dirname "$0")/.."
cd "$SDK_DIR"

# Ensure dist/ios directory exists
mkdir -p dist/ios

# Define source and destination paths
PREBUILT_DIR="ios/Frameworks"
DIST_DIR="dist/ios"

NFCPASSPORTREADER_XCFRAMEWORK="NFCPassportReader.xcframework"
OPENSSL_XCFRAMEWORK="OpenSSL.xcframework"

echo "🔍 Checking for prebuilt XCFrameworks..."

# Check if prebuilt XCFrameworks exist
if [ -d "$PREBUILT_DIR/$NFCPASSPORTREADER_XCFRAMEWORK" ] && [ -d "$PREBUILT_DIR/$OPENSSL_XCFRAMEWORK" ]; then
    echo "✅ Found prebuilt XCFrameworks in $PREBUILT_DIR"

    # Copy NFCPassportReader.xcframework
    echo "📦 Copying $NFCPASSPORTREADER_XCFRAMEWORK to $DIST_DIR..."
    rm -rf "$DIST_DIR/$NFCPASSPORTREADER_XCFRAMEWORK"
    cp -R "$PREBUILT_DIR/$NFCPASSPORTREADER_XCFRAMEWORK" "$DIST_DIR/$NFCPASSPORTREADER_XCFRAMEWORK"

    # Copy OpenSSL.xcframework
    echo "📦 Copying $OPENSSL_XCFRAMEWORK to $DIST_DIR..."
    rm -rf "$DIST_DIR/$OPENSSL_XCFRAMEWORK"
    cp -RL "$PREBUILT_DIR/$OPENSSL_XCFRAMEWORK" "$DIST_DIR/$OPENSSL_XCFRAMEWORK"

    echo "✅ XCFrameworks copied successfully"
    echo "📦 NFCPassportReader XCFramework: $DIST_DIR/$NFCPASSPORTREADER_XCFRAMEWORK"
    echo "📦 OpenSSL XCFramework: $DIST_DIR/$OPENSSL_XCFRAMEWORK"
    echo "💡 NFCPassportReader.xcframework contains SelfSDK which re-exports NFCPassportReader (private code protected)"

else
    echo "❌ Prebuilt XCFrameworks not found in $PREBUILT_DIR"
    echo "💡 Expected frameworks:"
    echo "   - $PREBUILT_DIR/$NFCPASSPORTREADER_XCFRAMEWORK"
    echo "   - $PREBUILT_DIR/$OPENSSL_XCFRAMEWORK"
    echo ""
    echo "⚠️  These frameworks should be prebuilt in mobile-sdk-ios-native and copied to $PREBUILT_DIR"
    echo "   See ios/Frameworks/README.md for build instructions"
    exit 1
fi
