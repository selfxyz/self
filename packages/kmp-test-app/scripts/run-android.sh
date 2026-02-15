#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# --- Resolve Android SDK tools ---
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB_CMD="$ANDROID_HOME/platform-tools/adb"
EMULATOR_CMD="$ANDROID_HOME/emulator/emulator"

if [ ! -f "$ADB_CMD" ]; then
    echo "❌ adb not found at $ADB_CMD"
    echo "   Set ANDROID_HOME to your Android SDK directory."
    exit 1
fi

# --- Check for connected device or running emulator ---
echo "📱 Checking for Android device or emulator..."
DEVICE=$("$ADB_CMD" devices 2>/dev/null | grep -E 'device$' | head -1 | cut -f1 || true)

if [ -z "$DEVICE" ]; then
    echo "📱 No connected device or running emulator found."

    if [ ! -f "$EMULATOR_CMD" ]; then
        echo "❌ emulator command not found at $EMULATOR_CMD"
        echo "   Set ANDROID_HOME to your Android SDK directory."
        exit 1
    fi

    # Get available AVDs
    echo "🔍 Finding available Android Virtual Devices..."
    AVAILABLE_AVDS=$("$EMULATOR_CMD" -list-avds 2>/dev/null)
    
    if [ -z "$AVAILABLE_AVDS" ]; then
        echo "❌ No Android Virtual Devices (AVDs) found."
        echo "   Create one in Android Studio:"
        echo "   1. Open Android Studio"
        echo "   2. Go to Tools > Device Manager"
        echo "   3. Create Virtual Device"
        exit 1
    fi

    # Use the first available AVD
    FIRST_AVD=$(echo "$AVAILABLE_AVDS" | head -1)
    echo "🚀 Starting emulator: $FIRST_AVD"
    "$EMULATOR_CMD" -avd "$FIRST_AVD" -no-snapshot-load >/dev/null 2>&1 &

    # Wait for emulator to appear in adb devices
    echo -n "⏳ Waiting for emulator to boot"
    for i in $(seq 1 60); do
        if "$ADB_CMD" devices 2>/dev/null | grep -q emulator; then
            DEVICE=$("$ADB_CMD" devices | grep emulator | head -1 | cut -f1)
            echo ""
            echo "✅ Emulator started: $DEVICE"
            break
        fi
        echo -n "."
        sleep 2
    done

    if [ -z "$DEVICE" ]; then
        echo ""
        echo "❌ Emulator failed to start within 2 minutes."
        echo "   Try starting it manually: $EMULATOR_CMD -avd $FIRST_AVD"
        exit 1
    fi

    # Wait for emulator to be fully booted
    BOOT_COMPLETED=false
    echo -n "⏳ Waiting for boot to complete"
    for i in $(seq 1 30); do
        if "$ADB_CMD" -s "$DEVICE" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
            echo ""
            echo "✅ Emulator fully booted and ready"
            BOOT_COMPLETED=true
            break
        fi
        echo -n "."
        sleep 2
    done

    if [ "$BOOT_COMPLETED" = false ]; then
        echo ""
        echo "❌ Emulator failed to fully boot within 60 seconds."
        exit 1
    fi
else
    echo "✅ Device found: $DEVICE"
fi

# --- Run Gradle install ---
echo "📦 Installing app..."
cd "$SCRIPT_DIR"
./gradlew :composeApp:installDebug

# --- Launch the app ---
echo "🚀 Launching app..."
"$ADB_CMD" -s "$DEVICE" shell am start -n "xyz.self.testapp/.MainActivity" 2>/dev/null || true

echo "✅ Done!"
