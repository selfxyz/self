# Local E2E Testing Script

This unified script allows you to run the same e2e tests locally that run in CI, without waiting for GitHub Actions.

## Quick Start

```bash
# Make sure you're in the app directory:
cd app

# Run iOS tests
./scripts/test-e2e-local.sh ios

# Run Android tests
./scripts/test-e2e-local.sh android
```

## Prerequisites

### iOS Testing
- **Xcode** installed with iOS Simulator
- **CocoaPods** (`gem install cocoapods`)
- **iPhone 15 simulator** (or modify script for your preferred device)

### Android Testing
- **Android SDK** installed
- **ANDROID_HOME** environment variable set
- **Android emulator running** (start from Android Studio or command line)

## Setup Instructions

### iOS Setup
1. Install Xcode from App Store
2. Install CocoaPods: `gem install cocoapods`
3. Create iPhone 15 simulator in Xcode (Window > Devices and Simulators)

### Android Setup
1. Install Android Studio
2. Set up environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```
3. Create and start an emulator:
   ```bash
   # List available AVDs
   emulator -list-avds

   # Start an emulator
   emulator -avd YOUR_AVD_NAME
   ```

## Script Overview

| Script | Purpose |
|--------|---------|
| `scripts/test-e2e-local.sh` | Unified e2e testing script for both iOS and Android |

## What the Script Does

1. **Check/Install Maestro** (smart detection - no reinstall if already present)
2. **Build dependencies** (`yarn build:deps`)
3. **Platform-specific setup**:
   - iOS: Pod install, simulator boot, xcodebuild
   - Android: Gradle build, APK installation
4. **Install app** on simulator/emulator with verification
5. **Run Maestro tests** (`e2e/launch.flow.yaml`)
6. **Generate results** (`maestro-results.xml`)

## Troubleshooting

### iOS Issues
- **"iPhone 15 simulator not found"**: Create the simulator or modify script to use available device
- **Build fails**: Check Xcode project configuration
- **App launch fails**: Check bundle ID and signing settings

### Android Issues
- **"No Android emulator detected"**: Start an emulator first
- **"Android SDK not found"**: Set ANDROID_HOME and PATH
- **"App package not found on device"**: The script now handles package name variations and will attempt to continue
- **Build fails**: Check Android project configuration

### Maestro Issues
- **Installation fails**: Check internet connection and retry
- **Device not detected**: Ensure simulator/emulator is running and accessible

## Advanced Usage

### Using Different Simulators
Edit the script to change device names:
```bash
# In the script, change:
xcrun simctl boot "iPhone 15"
# To:
xcrun simctl boot "iPhone 14 Pro"
```

### Custom Maestro Flows
Run different test flows:
```bash
maestro test path/to/your/custom.flow.yaml
```

### Debug Mode
Add debug flags to see more output:
```bash
# In the script, add -v or --debug to maestro commands
maestro test e2e/launch.flow.yaml --debug
```

## Script Features

- **🎨 Colored Output**: Clear visual indicators for success (green), warnings (yellow), errors (red), and info (blue)
- **🔧 Unified Logic**: Single script handles both iOS and Android with shared common functionality
- **🛡️ Robust Error Handling**: Comprehensive checks at each step with clear error messages
- **📦 Smart Maestro Install**: Only installs if not present, checks multiple locations
- **🔍 Package Detection**: Automatically detects actual package names from built artifacts
- **⚡ Fast Feedback**: Immediate visual feedback with emojis and colored status messages

## Benefits of Local Testing

- ⚡ **Faster feedback** (no CI queue time)
- 🔍 **Better debugging** (access to logs, breakpoints)
- 💰 **No CI costs** (save GitHub Actions minutes)
- 🧪 **Iterative development** (quick test cycles)
- 🔧 **Environment control** (use your preferred tools)
