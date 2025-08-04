#!/bin/bash
# Unified Local E2E Testing Script
# Run this from the app directory

set -e

PLATFORM=${1:-}

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "🎭 Local E2E Testing"
    echo "Usage: $0 [ios|android]"
    echo ""
    echo "Examples:"
    echo "  $0 ios      - Run iOS e2e tests locally"
    echo "  $0 android  - Run Android e2e tests locally"
    echo ""
    echo "Prerequisites:"
    echo "  iOS:     Xcode, iOS Simulator, CocoaPods"
    echo "  Android: Android SDK, running emulator"
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
        exit 1
    else
        log_success "Metro server is running on http://localhost:8081"
    fi
}

# Build dependencies (shared by both platforms)
build_dependencies() {
    log_info "🔨 Building dependencies..."
    yarn build:deps
}

# Run Maestro tests (shared by both platforms)
run_maestro_tests() {
    log_info "🎭 Running Maestro tests..."
    echo "Starting test execution..."
    if maestro test e2e/launch.flow.yaml --format junit --output maestro-results.xml; then
        log_success "🎉 Maestro tests passed!"
    else
        log_error "Maestro tests failed"
        echo "Check maestro-results.xml for detailed results"
        exit 1
    fi
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

    # Find the first available iPhone simulator
    AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "iPhone" | grep "(Shutdown)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        # Try to find any available simulator
        AVAILABLE_SIMULATOR=$(xcrun simctl list devices | grep "(Shutdown)" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    fi

    if [ -z "$AVAILABLE_SIMULATOR" ]; then
        log_error "No available simulators found. Please create a simulator in Xcode."
        exit 1
    fi

    # Get the simulator name for display
    SIMULATOR_NAME=$(xcrun simctl list devices | grep "$AVAILABLE_SIMULATOR" | sed -E 's/^[[:space:]]*([^(]+).*/\1/' | xargs)

    log_info "Using simulator: $SIMULATOR_NAME ($AVAILABLE_SIMULATOR)"

    # Boot the simulator
    echo "Booting $SIMULATOR_NAME simulator..."
    xcrun simctl boot "$AVAILABLE_SIMULATOR" || true
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

    if ! xcodebuild -workspace ios/OpenPassport.xcworkspace -scheme OpenPassport -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -jobs $(sysctl -n hw.ncpu) -parallelizeTargets; then
        log_error "iOS build failed"
        exit 1
    fi
    log_success "iOS build succeeded"
}

install_ios_app() {
    log_info "📦 Installing app on simulator..."
    APP_PATH=$(find ios/build/Build/Products/Debug-iphonesimulator -name "*.app" | head -1)
    if [ -z "$APP_PATH" ]; then
        log_error "Could not find built iOS app"
        exit 1
    fi

    echo "Found app at: $APP_PATH"

    # Check the app's bundle ID
    echo "Checking app bundle info:"
    /usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$APP_PATH/Info.plist" || echo "Could not read bundle ID"
    /usr/libexec/PlistBuddy -c "Print CFBundleDisplayName" "$APP_PATH/Info.plist" || echo "Could not read display name"

    # Use the dynamic simulator ID
    SIMULATOR_ID="${IOS_SIMULATOR_ID:-iPhone 15}"
    log_info "Installing on simulator: $SIMULATOR_ID"

    # Uninstall any existing version first
    echo "Removing any existing app installation..."
    xcrun simctl uninstall "$SIMULATOR_ID" "com.warroom.proofofpassport" 2>/dev/null || true

    # Install the app
    echo "Installing app..."
    if ! xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"; then
        log_error "iOS app installation failed"
        exit 1
    fi

    # Verify the app is installed
    echo "Verifying app installation..."
    echo "All installed apps with 'passport' in name:"
    xcrun simctl listapps "$SIMULATOR_ID" | grep -i passport || echo "No apps with 'passport' found"
    echo "Checking for exact bundle ID:"
    if xcrun simctl listapps "$SIMULATOR_ID" | grep -q "com.warroom.proofofpassport"; then
        log_success "App successfully installed"
    else
        log_error "App installation verification failed"
        echo "Full app list:"
        xcrun simctl listapps "$SIMULATOR_ID"
        exit 1
    fi

    # Test if the app can be launched directly
    log_info "🚀 Testing app launch capability..."
    xcrun simctl launch "$SIMULATOR_ID" "com.warroom.proofofpassport" || {
        log_warning "Direct app launch test failed - this might be expected if the app has launch conditions"
    }
}

# Android-specific functions
setup_android_environment() {
    # Check if Android tools are available
    if ! command -v adb &> /dev/null; then
        log_error "Android SDK not found. Please install Android SDK and set up PATH"
        echo "Make sure you have:"
        echo "  - Android SDK installed"
        echo "  - ANDROID_HOME environment variable set"
        echo "  - Android SDK tools in your PATH"
        exit 1
    fi

    # Check if emulator is running
    log_info "📱 Checking for Android emulator..."
    RUNNING_EMULATOR=$(adb devices | grep emulator | head -1 | cut -f1)

    if [ -z "$RUNNING_EMULATOR" ]; then
        log_info "No Android emulator running. Attempting to start one..."

        # Check if emulator command is available
        if ! command -v emulator &> /dev/null; then
            log_error "emulator command not found in PATH"
            echo "Please start an Android emulator manually:"
            echo "  1. Open Android Studio"
            echo "  2. Go to Tools > AVD Manager"
            echo "  3. Start an emulator"
            echo "  OR use command line:"
            echo "     emulator -avd YOUR_AVD_NAME"
            echo ""
            echo "Available AVDs:"
            if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME/emulator" ]; then
                "$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null || echo "No AVDs found"
            else
                echo "ANDROID_HOME not set or emulator not found"
            fi
            exit 1
        fi

        # Get available AVDs (similar to iOS approach)
        log_info "Finding available Android Virtual Devices..."
        AVAILABLE_AVDS=$(emulator -list-avds 2>/dev/null)

        if [ -z "$AVAILABLE_AVDS" ]; then
            log_error "No Android Virtual Devices (AVDs) found."
            echo "Please create an AVD in Android Studio:"
            echo "  1. Open Android Studio"
            echo "  2. Go to Tools > AVD Manager"
            echo "  3. Create Virtual Device"
            exit 1
        fi

        # Use the first available AVD (similar to iOS first available simulator)
        FIRST_AVD=$(echo "$AVAILABLE_AVDS" | head -1)
        log_info "Using emulator: $FIRST_AVD"

        # Start the emulator in background
        log_info "Starting emulator (this may take a minute)..."
        emulator -avd "$FIRST_AVD" -no-snapshot-load &
        EMULATOR_PID=$!

        # Wait for emulator to start (similar to iOS bootstatus)
        log_info "Waiting for emulator to boot..."
        for i in {1..60}; do
            if adb devices | grep -q emulator; then
                RUNNING_EMULATOR=$(adb devices | grep emulator | head -1 | cut -f1)
                log_success "Emulator started: $RUNNING_EMULATOR"
                break
            fi
            echo -n "."
            sleep 2
        done

        if [ -z "$RUNNING_EMULATOR" ]; then
            log_error "Emulator failed to start within 2 minutes"
            echo "You can try starting it manually:"
            echo "  emulator -avd $FIRST_AVD"
            exit 1
        fi

        # Wait for emulator to be fully booted (similar to iOS bootstatus check)
        log_info "Waiting for emulator to be fully booted..."
        for i in {1..30}; do
            if adb -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
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
        if ! adb -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
            log_warning "Emulator is running but not fully booted, waiting..."
            for i in {1..15}; do
                if adb -s "$RUNNING_EMULATOR" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
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
    adb devices
}

build_android_app() {
    cd android

    log_info "🔨 Building Android APK..."
    if ! ./gradlew assembleDebug; then
        log_error "Android build failed"
        exit 1
    fi
    log_success "Android build succeeded"

    cd ..
}

install_android_app() {
    log_info "📦 Installing app on emulator..."
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ ! -f "$APK_PATH" ]; then
        log_error "Could not find built APK at $APK_PATH"
        exit 1
    fi

    echo "Found APK at: $APK_PATH"

    # Use the dynamic emulator ID
    EMULATOR_ID="${ANDROID_EMULATOR_ID:-emulator-5554}"
    log_info "Installing on emulator: $EMULATOR_ID"

    # Check the APK's actual package name
    echo "Checking APK package info:"
    ACTUAL_PACKAGE=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep "package:" | sed "s/.*name='\([^']*\)'.*/\1/" | head -1)
    if [ -n "$ACTUAL_PACKAGE" ]; then
        echo "APK package name: $ACTUAL_PACKAGE"
    else
        log_warning "Could not determine package name from APK, assuming com.proofofpassportapp"
        ACTUAL_PACKAGE="com.proofofpassportapp"
    fi

    # Uninstall any existing version first
    echo "Removing any existing app installation..."
    adb -s "$EMULATOR_ID" uninstall "$ACTUAL_PACKAGE" 2>/dev/null || true

    # Install the app
    echo "Installing app..."
    if ! adb -s "$EMULATOR_ID" install "$APK_PATH"; then
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
    PACKAGE_CHECK=$(adb -s "$EMULATOR_ID" shell pm list packages | grep "$ACTUAL_PACKAGE" || echo "")
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
            PARTIAL_RESULT=$(adb -s "$EMULATOR_ID" shell pm list packages | grep "$PARTIAL" || echo "")
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
    adb -s "$EMULATOR_ID" shell am start -n "$ACTUAL_PACKAGE/.MainActivity" || {
        log_warning "Direct app launch test failed - this might be expected if the main activity name is different"
    }
}

# Main platform runners
run_ios_tests() {
    echo "🍎 Starting local iOS e2e testing..."

    check_metro_running
    setup_ios_environment
    setup_ios_simulator
    build_ios_app
    install_ios_app
    run_maestro_tests

    log_success "Local iOS e2e testing completed successfully!"
}

run_android_tests() {
    echo "🤖 Starting local Android e2e testing..."

    check_metro_running
    setup_android_environment
    build_android_app
    install_android_app
    run_maestro_tests

    log_success "Local Android e2e testing completed successfully!"
}

# Main execution
main() {
    check_directory

    if [ -z "$PLATFORM" ]; then
        print_usage
        exit 1
    fi

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
main
