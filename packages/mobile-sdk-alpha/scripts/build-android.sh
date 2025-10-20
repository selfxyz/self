#!/bin/bash
# SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1
# NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

# Build Android AAR from source using the app's Gradle wrapper

set -e

echo "🤖 Building Android AAR for mobile-sdk-alpha..."

# Navigate to SDK directory
SDK_DIR="$(dirname "$0")/.."
cd "$SDK_DIR"

# Ensure dist/android directory exists
mkdir -p dist/android

# Check if native modules source is available
MOBILE_SDK_NATIVE="mobile-sdk-native"

echo "🔍 Checking for Android build options..."

if [ -d "$MOBILE_SDK_NATIVE" ]; then
    echo "✅ Native modules source submodule found, building from source..."

    # Check if we already have an AAR file
    if [ -f "dist/android/mobile-sdk-alpha-release.aar" ]; then
        echo "✅ AAR file found, skipping build"
        echo "📦 Using existing AAR: dist/android/mobile-sdk-alpha-release.aar"
        exit 0
    fi

    # Update submodule to latest
    echo "🔄 Updating submodule to latest..."
    git submodule update --init --recursive mobile-sdk-native

    # Navigate to android directory
    cd android

    # Check if we're in a monorepo and can use the app's gradlew
    APP_GRADLEW="../../../app/android/gradlew"

    if [ -f "$APP_GRADLEW" ]; then
        echo "✅ Using app's Gradle wrapper"

        # Copy source from submodule if available
        if [ -d "../$MOBILE_SDK_NATIVE/src" ]; then
            echo "📝 Copying source from submodule to android directory..."
            rm -rf src
            cp -r "../$MOBILE_SDK_NATIVE/src" .
        fi

        if [ -d "../$MOBILE_SDK_NATIVE/libs" ]; then
            echo "📝 Copying libs from submodule to android directory..."
            rm -rf libs
            cp -r "../$MOBILE_SDK_NATIVE/libs" .
        fi

        # Build using app's gradlew from the app's android directory
        # This ensures React Native and other dependencies are available
        cd ../../../app/android
        ./gradlew :mobile-sdk-alpha:assembleRelease

        echo "✅ Android AAR built successfully from submodule source"
        echo "📦 AAR location: packages/mobile-sdk-alpha/dist/android/"
        echo "💡 Changes in mobile-sdk-native/ are tracked with git history"
    else
        echo "❌ Error: Could not find app's Gradle wrapper at $APP_GRADLEW"
        echo "Please ensure you're running this from the monorepo root or that the app is set up."
        exit 1
    fi
else
    echo "⚠️  Private source not found, checking for prebuilt AAR..."

    # Check if prebuilt AAR already exists
    if [ -f "dist/android/mobile-sdk-alpha-release.aar" ]; then
        echo "✅ Prebuilt AAR found: dist/android/mobile-sdk-alpha-release.aar"
        echo "📦 Using existing prebuilt AAR"
    else
        echo "❌ No prebuilt AAR found at dist/android/mobile-sdk-alpha-release.aar"
        echo "💡 To build from source, clone the mobile-sdk-native repository:"
        echo "   node scripts/setup-native-source.cjs"
        echo "   yarn build:android"
        echo ""
        echo "⚠️  Package may not work without AAR file!"
        exit 1
    fi
fi
