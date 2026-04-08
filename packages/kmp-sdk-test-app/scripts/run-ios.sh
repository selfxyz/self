#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$SCRIPT_DIR/iosApp"
KMP_SDK_DIR="$SCRIPT_DIR/../kmp-sdk"

# --- Build KMP framework for iOS Simulator ---
echo "🔨 Building KMP framework for iOS Simulator..."
cd "$KMP_SDK_DIR"
./gradlew :shared:linkDebugFrameworkIosSimulatorArm64

# --- Resolve Xcode project dependencies ---
cd "$IOS_DIR"
echo "📦 Resolving package dependencies..."
xcodebuild -workspace iosApp.xcworkspace -resolvePackageDependencies -quiet 2>/dev/null || true

# --- Find an available iOS Simulator ---
echo "📱 Finding iOS Simulator..."
SIMULATOR_ID=$(xcrun simctl list devices available --json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    if 'iOS' not in runtime:
        continue
    for d in devices:
        if d['isAvailable'] and 'iPhone' in d['name']:
            print(d['udid'])
            sys.exit(0)
print('')
")

if [ -z "$SIMULATOR_ID" ]; then
    echo "❌ No available iPhone simulator found."
    echo "   Open Xcode > Settings > Platforms to install an iOS Simulator runtime."
    exit 1
fi

SIMULATOR_NAME=$(xcrun simctl list devices available | grep "$SIMULATOR_ID" | sed 's/(.*//' | xargs)
echo "✅ Using simulator: $SIMULATOR_NAME ($SIMULATOR_ID)"

# --- Boot simulator if not already booted ---
BOOT_STATE=$(xcrun simctl list devices | grep "$SIMULATOR_ID" | grep -o "(Booted)" || true)
if [ -z "$BOOT_STATE" ]; then
    echo "🚀 Booting simulator..."
    xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true
    open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_ID"
    sleep 3
fi

# --- Build the app ---
echo "🔨 Building iOS app..."
xcodebuild -workspace iosApp.xcworkspace \
    -scheme iosApp \
    -sdk iphonesimulator \
    -destination "id=$SIMULATOR_ID" \
    ONLY_ACTIVE_ARCH=YES \
    ARCHS=arm64 \
    WEBVIEW_DEV_URL="${WEBVIEW_DEV_URL:-}" \
    build \
    2>&1 | tail -5

# --- Find and install the app ---
BUILD_DIR=$(xcodebuild -workspace iosApp.xcworkspace \
    -scheme iosApp \
    -sdk iphonesimulator \
    -showBuildSettings 2>/dev/null | grep ' BUILT_PRODUCTS_DIR' | awk '{print $3}')
APP_PATH="$BUILD_DIR/iosApp.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build output not found at $APP_PATH"
    exit 1
fi

echo "📦 Installing app on simulator..."
xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"

# --- Launch the app ---
BUNDLE_ID=$(defaults read "$APP_PATH/Info.plist" CFBundleIdentifier 2>/dev/null || echo "xyz.self.testapp")
echo "🚀 Launching $BUNDLE_ID..."
xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"

echo "✅ Done!"
