#!/bin/bash
# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

# Unified Local E2E Testing Script
# Run this from the app directory

set -e

PLATFORM=${1:-}
EMULATOR_PID=""

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "🎭 Local E2E Testing"
    echo "Usage: $0 [ios|android] [--workflow-match]"
    echo ""
    echo "Examples:"
    echo "  $0 ios      - Run iOS e2e tests locally"
    echo "  $0 android  - Run Android e2e tests locally"
    echo "  $0 android --workflow-match  - Run Android tests matching GitHub Actions workflow"
    echo ""
    echo "Prerequisites:"
    echo "  iOS:     Xcode, iOS Simulator, CocoaPods"
    echo "  Android: Android SDK, running emulator"
    echo ""
    echo "Workflow Match Mode:"
    echo "  --workflow-match  - Use Release builds and exact workflow steps"
    echo "                     (No Metro dependency, matches CI environment)"
}

log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory (app directory)
check_directory() {
    if [ ! -f "package.json" ]; then
        log_error "Please run this from the app directory (where package.json exists)"
        echo "Current directory: $(pwd)"
        echo "Expected: /path/to/your/project/app"
        exit 1
    fi
}

# Check if Maestro is installed and install if needed
setup_maestro() {
    if ! command -v maestro &> /dev/null; then
        if [ -f "$HOME/.maestro/bin/maestro" ]; then
            log_info "📦 Maestro found in ~/.maestro/bin, adding to PATH..."
            export PATH="$HOME/.maestro/bin:$PATH"
        else
            log_info "📦 Installing Maestro..."
            curl -Ls "https://get.maestro.mobile.dev" | bash
            export PATH="$HOME/.maestro/bin:$PATH"
            log_success "Maestro installed successfully"
        fi
    else
        log_success "Maestro already available in PATH"
    fi
}

# Check if Metro is running (required for debug builds)
check_metro_running() {
    # Skip Metro check if in workflow match mode (Release builds don't need Metro)
    if [ "$WORKFLOW_MATCH" = "true" ]; then
        log_info "🔍 Skipping Metro check (Release builds don't need Metro)"
        return
    fi

    log_info "🔍 Checking if Metro server is running..."

    # Check if Metro is running on port 8081
    if ! curl -f -s http://localhost:8081/status > /dev/null 2>&1; then
        log_error "Metro server is not running!"
        echo ""
        echo "React Native debug builds require Metro to serve the JavaScript bundle."
        echo "Please start Metro in another terminal before running e2e tests:"
        echo ""
        echo "  ${BLUE}cd $(pwd)${NC}"
        echo "  ${BLUE}yarn start${NC}"
        echo ""
        echo "Wait for Metro to show 'Metro waiting on exp://localhost:8081' then re-run this script."
        echo ""
        echo "Or use --workflow-match to use Release builds (no Metro needed):"
        echo "  ${BLUE}$0 $PLATFORM --workflow-match${NC}"
        exit 1
    else
        log_success "Metro server is running on http://localhost:8081"
    fi
}

# Build dependencies (shared by both platforms)
build_dependencies() {
    log_info "🔨 Building dependencies..."
    if ! yarn build:deps; then
        log_error "Dependency build failed"
        exit 1
    fi
}

# Run Maestro tests (shared by both platforms)
run_maestro_tests() {
    log_info "🎭 Running Maestro tests..."
    echo "Starting test execution..."

    # Use platform-specific flow files
    if [ "$PLATFORM" = "ios" ]; then
        FLOW_FILE="tests/e2e/launch.ios.flow.yaml"
    else
        FLOW_FILE="tests/e2e/launch.android.flow.yaml"
    fi

    # Set a longer timeout for the driver to start, especially for the first run
    export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 # 180 seconds (3 minutes) in ms

    # Attempt to run Maestro, capturing output to check for a specific error
    MAESTRO_OUTPUT_FILE=$(mktemp)
    if maestro test "$FLOW_FILE" --format junit --output maestro-results.xml > "$MAESTRO_OUTPUT_FILE" 2>&1; then
        log_success "🎉 Maestro tests passed on the first attempt!"
        cat "$MAESTRO_OUTPUT_FILE"
        rm "$MAESTRO_OUTPUT_FILE"
        return 0
    else
        # First attempt failed, check for known timeout errors
        cat "$MAESTRO_OUTPUT_FILE"
        if grep -q "MaestroDriverStartupException\|IOSDriverTimeoutException" "$MAESTRO_OUTPUT_FILE"; then
            log_warning "Maestro driver failed to start. Retrying in 30 seconds..."
            sleep 30

            # Second attempt
            log_info "🎭 Retrying Maestro tests..."
            if maestro test "$FLOW_FILE" --format junit --output maestro-results.xml; then
                log_success "🎉 Maestro tests passed on the second attempt!"
                rm "$MAESTRO_OUTPUT_FILE"
                return 0
            else
                log_error "Maestro tests failed on the second attempt."
                rm "$MAESTRO_OUTPUT_FILE"
                return 1
            fi
        else
            # Failed for a different reason, so don't retry
            log_error "Maestro tests failed for a reason other than driver timeout."
            rm "$MAESTRO_OUTPUT_FILE"
            return 1
        fi
    fi
}


shutdown_all_simulators() {
    log_info "🔌 Shutting down all running iOS simulators..."
    xcrun simctl shutdown all
    log_success "All simulators shut down"
}

# iOS-specific functions
setup_ios_environment() {
    # Check if Xcode is available
    if ! command -v xcrun &> /dev/null; then
        log_error "Xcode not found. Please install Xcode and iOS Simulator"
        exit 1
    fi

    log_info "🍎 Setting up iOS environment..."
    cd ios
    echo "Installing CocoaPods dependencies with e2e configuration..."
    # Set environment variable for e2e testing to enable OpenSSL fixes
    export E2E_TESTING=1
    pod install
    cd ..
}

setup_ios_simulator() {
    log_info "📱 Setting up iOS Simulator..."

    # Get available iOS simulators
    echo "Available simulators:"
    xcrun simctl list devices

    # Find the first available iPhone simulator (prefer booted ones, then shutdown ones)
    AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "iPhone" | grep "(Booted)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        # Try to find any available iPhone simulator that's shutdown
        AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "iPhone" | grep "(Shutdown)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    fi

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        # Try to find any available simulator
        AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "(Booted)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    fi

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        # Last resort - any shutdown simulator
        AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "(Shutdown)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    fi

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        log_error "No available simulators found. Please create a simulator in Xcode."
        exit 1
    fi

    # Get the simulator name for display
    SIMULATOR_NAME=$(xcrun simctl list devices | grep "$AVAILABLE_SIMULATOR" | sed -E 's/^[[:space:]]*([^(]+).*/\1/' | xargs)

    log_info "Using simulator: $SIMULATOR_NAME ($AVAILABLE_SIMULATOR)"

    # Boot the simulator and ensure the Simulator app is open
    log_info "Booting $SIMULATOR_NAME simulator..."
    # This can fail if the device is already booted. The `|| true` handles this gracefully.
    # Our shutdown command should prevent this, but we keep it for robustness.
    xcrun simctl boot "$AVAILABLE_SIMULATOR" || true

    log_info "Opening Simulator app to ensure it is visible..."
    open -a Simulator

    log_info "Waiting for simulator to fully boot..."
    xcrun simctl bootstatus "$AVAILABLE_SIMULATOR" -b

    # Store the simulator ID for later use
    export IOS_SIMULATOR_ID="$AVAILABLE_SIMULATOR"
    export IOS_SIMULATOR_NAME="$SIMULATOR_NAME"

    echo "Simulator status:"
    xcrun simctl list devices | grep "$AVAILABLE_SIMULATOR"
}

build_ios_app() {
    log_info "🔨 Building iOS app..."
    # Set environment variable for e2e testing to enable OpenSSL fixes
    export E2E_TESTING=1

    # Set build configuration based on workflow match
    if [ "$WORKFLOW_MATCH" = "true" ]; then
        log_info "Using Release configuration for workflow match"
        BUILD_CONFIG="Release"
    else
        log_info "Using Debug configuration for local development"
        BUILD_CONFIG="Debug"
    fi

    if ! xcodebuild -workspace ios/OpenPassport.xcworkspace -scheme OpenPassport -configuration "$BUILD_CONFIG" -sdk iphonesimulator -derivedDataPath ios/build -jobs "$(sysctl -n hw.ncpu)" -parallelizeTargets SWIFT_ACTIVE_COMPILATION_CONDITIONS="E2E_TESTING"; then
        log_error "iOS build failed"
        exit 1
    fi
    log_success "iOS build succeeded"
}

install_ios_app() {
    log_info "📦 Installing app on simulator..."
    APP_PATH=$(find "ios/build/Build/Products/$BUILD_CONFIG-iphonesimulator" -name "*.app" | head -1)
    if [ -z "$APP_PATH" ]; then
        log_error "Could not find built iOS app in ios/build/Build/Products/$BUILD_CONFIG-iphonesimulator"
        exit 1
    fi

    echo "Found app at: $APP_PATH"

    # Dynamically determine the bundle ID from the built app
    log_info "🔍 Determining app bundle ID from built app..."
    IOS_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$APP_PATH/Info.plist")
    if [ -z "$IOS_BUNDLE_ID" ]; then
        log_error "Could not determine bundle ID from $APP_PATH/Info.plist"
        exit 1
    fi
    export IOS_BUNDLE_ID
    log_success "App Bundle ID: $IOS_BUNDLE_ID"

    # Use the dynamic simulator ID
    SIMULATOR_ID="${IOS_SIMULATOR_ID:-iPhone 15}"
    log_info "Installing on simulator: $SIMULATOR_ID"

    # Uninstall any existing version first
    echo "Removing any existing app installation..."
    xcrun simctl uninstall "$SIMULATOR_ID" "$IOS_BUNDLE_ID" 2>/dev/null || true

    # Install the app
    echo "Installing app..."
    if ! xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"; then
        log_error "iOS app installation failed"
        exit 1
    fi

    # Verify the app is installed
    echo "Verifying app installation..."
    echo "All installed apps on simulator:"
    xcrun simctl listapps "$SIMULATOR_ID"
    echo "Checking for exact bundle ID: $IOS_BUNDLE_ID"
    if xcrun simctl listapps "$SIMULATOR_ID" | grep -q "$IOS_BUNDLE_ID"; then
        log_success "App successfully installed"
    else
        log_error "App installation verification failed"
        exit 1
    fi

    # Test if the app can be launched directly
    log_info "🚀 Testing app launch capability..."
    if ! xcrun simctl launch "$SIMULATOR_ID" "$IOS_BUNDLE_ID"; then
        log_warning "Direct app launch test failed - this might be expected if the app has launch conditions, but it could also indicate a problem."
    fi
}

# Android-specific functions
setup_android_environment() {
    # Check if Android SDK is configured
    if [ -z "$ANDROID_HOME" ]; then
        log_error "ANDROID_HOME environment variable is not set."
        echo "Please set ANDROID_HOME to your Android SDK directory."
        exit 1
    fi

    # Define and export full paths to tools for robustness
    export ADB_CMD="$ANDROID_HOME/platform-tools/adb"
    export EMULATOR_CMD="$ANDROID_HOME/emulator/emulator"

    if [ ! -f "$ADB_CMD" ]; then
        log_error "adb not found at $ADB_CMD"
        echo "Please ensure your ANDROID_HOME is set correctly."
        exit 1
    fi

    # Check if emulator is running
    log_info "📱 Checking for Android emulator..."

    # Set shorter wait time for emulator shutdown to reduce logging
    export ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL=5

    RUNNING_EMULATOR=$($ADB_CMD devices | grep emulator | head -1 | cut -f1)

    if [ -z "$RUNNING_EMULATOR" ]; then
        log_info "No Android emulator running. Attempting to start one..."

        # Check if emulator command is available
        if [ ! -f "$EMULATOR_CMD" ]; then
            log_error "emulator command not found at $EMULATOR_CMD"
            echo "Please ensure your ANDROID_HOME is set correctly."
            exit 1
        fi

        # Get available AVDs
        log_info "Finding available Android Virtual Devices..."
        AVAILABLE_AVDS=$($EMULATOR_CMD -list-avds)

        if [ -z "$AVAILABLE_AVDS" ]; then
            log_error "No Android Virtual Devices (AVDs) found."
            echo "Please create an AVD in Android Studio:"
            echo "  1. Open Android Studio"
            echo "  2. Go to Tools > Device Manager"
            echo "  3. Create Virtual Device"
            exit 1
        fi

        # Use the first available AVD
        FIRST_AVD=$(echo "$AVAILABLE_AVDS" | head -1)
        log_info "Using emulator: $FIRST_AVD"

        # Start the emulator in background
        log_info "Starting emulator (this may take a minute)..."
        "$EMULATOR_CMD" -avd "$FIRST_AVD" -no-snapshot-load >/dev/null 2>&1 &
        EMULATOR_PID=$!

        # Wait for emulator to start
        log_info "Waiting for emulator to boot..."
        for i in {1..60}; do
            if "$ADB_CMD" devices | grep -q emulator; then
                RUNNING_EMULATOR=$("$ADB_CMD" devices | grep emulator | head -1 | cut -f1)
                log_success "Emulator started: $RUNNING_EMULATOR"
                break
            fi
            echo -n "."
            sleep 2
        done

        if [ -z "$RUNNING_EMULATOR" ]; then
            log_error "Emulator failed to start within 2 minutes"
            echo "You can try starting it manually:"
            echo "  $EMULATOR_CMD -avd $FIRST_AVD"
            exit 1
        fi

        # Wait for emulator to be fully booted
        log_info "Waiting for emulator to be fully booted..."
        for i in {1..30}; do
            if "$ADB_CMD" -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
                log_success "Emulator fully booted and ready"
                break
            fi
            echo -n "."
            sleep 2
        done
    else
        log_success "Android emulator already running: $RUNNING_EMULATOR"

        # Ensure the running emulator is fully booted
        log_info "Checking if emulator is fully booted..."
        if ! "$ADB_CMD" -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
            log_warning "Emulator is running but not fully booted, waiting..."
            for i in {1..15}; do
                if "$ADB_CMD" -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
                    log_success "Emulator is now fully booted"
                    break
                fi
                echo -n "."
                sleep 2
            done
        else
            log_success "Emulator is fully booted and ready"
        fi
    fi

    # Store the emulator device ID for later use
    export ANDROID_EMULATOR_ID="$RUNNING_EMULATOR"

    log_success "Android emulator ready:"
    "$ADB_CMD" devices
}

build_android_app() {
    log_info "🔨 Building Android APK..."
    # Note: Using Release builds to avoid Metro dependency in CI
    # Debug builds require Metro server, Release builds have JS bundled
    # Run the build inside the android directory so gradlew is available
    echo "Current working directory: $(pwd)"
    echo "Checking if gradlew exists:"
    ls -la android/gradlew || echo "gradlew not found in android/"

    cd android
    if ! ./gradlew assembleRelease --quiet; then
        log_error "Android build failed"
        exit 1
    fi
    log_success "Android build succeeded"
    cd ..
}

install_android_app() {
    log_info "📦 Installing app on emulator..."
    # Check if APK was built successfully (matching workflow)
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    log_info "Looking for APK at: $APK_PATH"
    if [ ! -f "$APK_PATH" ]; then
        log_error "APK not found at expected location"
        echo "Available files in build directory:"
        find android/app/build -name "*.apk" 2>/dev/null || echo "No APK files found"
        exit 1
    fi

    echo "Found APK at: $APK_PATH"

    # Use the dynamic emulator ID
    EMULATOR_ID="${ANDROID_EMULATOR_ID:-emulator-5554}"
    log_info "Installing on emulator: $EMULATOR_ID"

    # Dynamically find the latest 'aapt' tool path and determine package name
    # Prioritize 'aapt2' for reliability, then fall back to 'aapt'.
    AAPT2_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name "aapt2" | sort -r | head -n 1)
    if [ -n "$AAPT2_PATH" ]; then
        log_info "Using aapt2 to get package name from $APK_PATH..."
        ACTUAL_PACKAGE=$("$AAPT2_PATH" dump packagename "$APK_PATH" 2>/dev/null | head -1)
    else
        log_warning "aapt2 not found, falling back to aapt..."
        AAPT_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name "aapt" | sort -r | head -n 1)
        if [ -n "$AAPT_PATH" ]; then
            log_info "Found aapt at: $AAPT_PATH"
            ACTUAL_PACKAGE=$("$AAPT_PATH" dump badging "$APK_PATH" 2>/dev/null | grep "package:" | sed -E "s/.*name='([^']+)'.*/\1/" | head -1)
        else
            log_error "Neither aapt2 nor aapt found in $ANDROID_HOME/build-tools"
            echo "Please ensure your Android build-tools are installed correctly."
            exit 1
        fi
    fi

    if [ -n "$ACTUAL_PACKAGE" ]; then
        log_success "Determined APK package name: $ACTUAL_PACKAGE"
    else
        log_warning "Could not determine package name from APK, assuming default: com.proofofpassportapp"
        ACTUAL_PACKAGE="com.proofofpassportapp"
    fi

    # Install the app, replacing any existing installation.
    # The -r flag allows adb to replace an existing app, which is safer than
    # trying to uninstall first, especially in a CI environment where the
    # emulator state might be inconsistent.
    echo "Installing app..."
    if ! "$ADB_CMD" -s "$EMULATOR_ID" install -r "$APK_PATH"; then
        log_error "Android app installation failed"
        exit 1
    fi
    log_success "App successfully installed"

    # Verify installation
    log_info "🔍 Verifying app installation..."

    # Give a moment for installation to settle
    sleep 2

    # Check if the package is installed using the detected package name
    echo "Checking installed packages for: $ACTUAL_PACKAGE"
    PACKAGE_CHECK=$("$ADB_CMD" -s "$EMULATOR_ID" shell pm list packages | grep "$ACTUAL_PACKAGE" || echo "")
    if [ -n "$PACKAGE_CHECK" ]; then
        log_success "App package verified on device: $PACKAGE_CHECK"
    else
        log_warning "Package '$ACTUAL_PACKAGE' not found, doing broader search..."

        # Try searching for parts of the package name
        PARTIAL_CHECKS=(
            "proofofpassport"
            "warroom"
            "passport"
        )

        FOUND_PACKAGE=""
        for PARTIAL in "${PARTIAL_CHECKS[@]}"; do
            PARTIAL_RESULT=$("$ADB_CMD" -s "$EMULATOR_ID" shell pm list packages | grep "$PARTIAL" || echo "")
            if [ -n "$PARTIAL_RESULT" ]; then
                echo "Found packages containing '$PARTIAL': $PARTIAL_RESULT"
                FOUND_PACKAGE="true"
            fi
        done

        if [ -z "$FOUND_PACKAGE" ]; then
            log_error "No related packages found on device"
            echo "Attempting to continue anyway - Maestro might still work..."
        fi
    fi

    # Test if the app can be launched directly
    log_info "🚀 Testing app launch capability..."
    "$ADB_CMD" -s "$EMULATOR_ID" shell am start -n "$ACTUAL_PACKAGE/.MainActivity" || {
        log_warning "Direct app launch test failed - this might be expected if the main activity name is different"
    }
}

# Cleanup function for Android emulator
cleanup_android_emulator() {
    if [ -n "$EMULATOR_PID" ] && kill -0 "$EMULATOR_PID" 2>/dev/null; then
        log_info "Cleaning up Android emulator (PID: $EMULATOR_PID)..."
        # Kill the emulator process silently
        kill "$EMULATOR_PID" >/dev/null 2>&1
        # Wait a moment for graceful shutdown
        sleep 2
        # Force kill if still running
        if kill -0 "$EMULATOR_PID" 2>/dev/null; then
            kill -9 "$EMULATOR_PID" >/dev/null 2>&1
        fi
    fi

    # Also silence any remaining emulator processes that might be hanging
    if [ -n "$FIRST_AVD" ]; then
        pkill -f "emulator.*$FIRST_AVD" >/dev/null 2>&1 || true
    fi
}

# Main platform runners
run_ios_tests() {
    echo "🍎 Starting local iOS e2e testing..."

    shutdown_all_simulators
    check_metro_running
    setup_ios_environment
    setup_ios_simulator
    build_ios_app
    install_ios_app

    log_info "⏰ Giving the simulator a moment to settle before starting tests..."
    sleep 15

    run_maestro_tests
    MAESTRO_STATUS=$?

    log_success "Local iOS e2e testing completed!"

    shutdown_all_simulators

    exit $MAESTRO_STATUS
}

run_android_tests() {
    echo "🤖 Starting local Android e2e testing..."

    # Set up trap to cleanup emulator on script exit
    trap cleanup_android_emulator EXIT

    # Only check Metro if not in workflow match mode
    if [ "$WORKFLOW_MATCH" != "true" ]; then
        check_metro_running
    fi

    setup_android_environment
    build_android_app
    install_android_app

    log_info "⏰ Giving the emulator a moment to settle before starting tests..."
    sleep 45

    run_maestro_tests
    MAESTRO_STATUS=$?

    log_success "Local Android e2e testing completed!"
    exit $MAESTRO_STATUS
}

# Main execution
main() {
    check_directory

    if [ -z "$PLATFORM" ]; then
        print_usage
        exit 1
    fi

    # Check for workflow match mode
    WORKFLOW_MATCH="false"
    for arg in "$@"; do
        if [ "$arg" = "--workflow-match" ]; then
            WORKFLOW_MATCH="true"
            log_info "🔧 Running in workflow match mode (Release builds, no Metro)"
            break
        fi
    done

    setup_maestro
    build_dependencies

    case "$PLATFORM" in
        ios)
            run_ios_tests
            ;;
        android)
            run_android_tests
            ;;
        *)
            log_error "Invalid platform: $PLATFORM"
            echo "Valid options: ios, android"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
