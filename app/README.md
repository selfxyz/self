# Self.xyz Mobile App

## Quick Start

Run the interactive setup script to check and install all dependencies:

```bash
./scripts/setup-macos.sh
```

The script will prompt you to choose between:
1. **Check only** - Just show what's installed/missing
2. **Interactive setup** - Check and confirm before installing (recommended)
3. **Auto-install** - Install everything without prompts

You can also pass flags directly: `--check-only` or `--yes`

## Requirements

### macOS Setup

#### Core Dependencies

```bash
# Node.js 22+ (via nvm)
nvm install 22
nvm use 22

# Watchman
brew install watchman

# Ruby (via rbenv) - version specified in .ruby-version
brew install rbenv
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc
rbenv install   # Reads version from .ruby-version
rbenv rehash

# Ruby gems
gem install cocoapods bundler

# circom and snarkjs (for ZK circuits)
# Follow: https://docs.circom.io/ and https://github.com/iden3/snarkjs
```

#### Android Dependencies

```bash
# Java 17
brew install openjdk@17
```

Then install [Android Studio](https://developer.android.com/studio) and configure SDK/NDK (see [Android Setup](#android) below).

#### iOS Dependencies

Install [Xcode](https://developer.apple.com/xcode/) from the App Store (includes Command Line Tools).

### Shell Configuration

Add the following to your `~/.zshrc` (or `~/.bashrc`):

```bash
# Java
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Android
export ANDROID_HOME=~/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

Then reload your shell:

```bash
source ~/.zshrc
```

## Installation

> All of the commands in this guide are run from the `app` directory

Install dependencies + build

```bash
yarn install-app

```

If you encounter any nokogiri build issues try running these commands first:

```bash
brew install libxml2 libxslt

bundle config build.nokogiri --use-system-libraries \
    --with-xml2-include=$(brew --prefix libxml2)/include/libxml2

bundle install
```

and rerun the command.

### Android

#### Using Android Studio (Recommended)

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → **Settings** (or **Preferences** on macOS) → **SDK Manager**
3. Under **SDK Platforms**, install the platform with the highest API number
4. Under **SDK Tools**, check **Show Package Details**, expand **NDK (Side by side)**, select version **27.0.12077973** and install
5. Enable **USB debugging** on your Android device (Settings → Developer options → USB debugging)

#### Using sdkmanager via CLI (Alternative)

If you prefer not to use Android Studio, you can install the SDK via command line:

1. Create a directory for the Android SDK (e.g., `~/android_sdk`) and set `ANDROID_HOME` to point to it
2. Install sdkmanager according to the [official instructions](https://developer.android.com/tools/sdkmanager)

```bash
# List available SDK platforms
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list | grep platforms

# Install the latest platform (replace NN with version number)
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "platforms;android-NN"

# Install the NDK
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "ndk;27.0.12077973"

# Install Platform Tools (for adb)
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install platform-tools
```

Set additional environment variables:

```bash
export ANDROID_NDK_VERSION=27.0.12077973
export ANDROID_NDK=$ANDROID_HOME/ndk/27.0.12077973
```

## Run the app

### Android

#### Pair and connect to the phone

##### Using Android Studio

In Android Studio, use Device Manager to pair with and connect to your phone.

##### Using adb

In your phone's developer settings, select **Wireless debugging** > **Pair the device using a pairing code**. Using the displayed information, run

```
adb pair PHONE_IP:PAIRING_PORT PAIRING_CODE
```

To connect to the device, find the IP number and port (different port than in the pairing step) directly under Wireless debugging, and run

```
adb connect PHONE_IP:DEVELOPMENT_PORT
```

#### Run the app

Create the file `android/local.properties` specifying the SDK directory, for example:

```
sdk.dir=/path/to/your/android/sdk
```

or create it with

```bash
echo sdk.dir=$ANDROID_HOME > android/local.properties
```

Launch the React Native server:

```bash
yarn start
```

Press `a` to open the app on Android.

To view the Android logs, use the Logcat feature in Android Studio, or use the `adb logcat` command-line tool.

### iOS

> :warning: To run the app on iOS, you will need a paying Apple Developer account. Free accounts can't run apps that use NFC reading.<br/>
> Contact us if you need it to contribute.

Open the ios project in Xcode and add your provisioning profile in Targets > OpenPassport > Signing and Capabilities.

Then, install Ruby dependencies and CocoaPods:

```bash
cd ios
bundle install
bundle exec pod install
```

And run the app in Xcode.

#### Simulator Build

> **Note:** iOS Simulator on Apple Silicon Macs requires Rosetta (x86_64) mode due to simulator architecture compatibility. If you're using a Silicon Mac (M1/M2/M3/M4), you may find that the Rosetta simulator build option is not available by default in Xcode.

To enable it, open Xcode and go to **Product > Destination > Show All Run Destinations**. This will unlock the ability to select the Rosetta build simulator, allowing you to run the app in the iOS Simulator.

> **Note:** This is a simulator-specific issue - the app itself runs natively on ARM64 devices and builds without issues.

## 🚀 Deployment & Release

### Quick Commands

```bash
# View current version info
node scripts/version.cjs status

# Create a new release (interactive)
yarn release              # Patch release (1.0.0 → 1.0.1)
yarn release:minor        # Minor release (1.0.0 → 1.1.0)
yarn release:major        # Major release (1.0.0 → 2.0.0)

# Deploy manually (with prompts)
yarn mobile-deploy        # Deploy both platforms
yarn mobile-deploy:ios    # Deploy iOS only
yarn mobile-deploy:android # Deploy Android only

# Version management
node scripts/version.cjs bump patch    # Bump version
node scripts/version.cjs bump-build ios # Increment iOS build
node scripts/version.cjs bump-build android # Increment Android build
```

### Automated Deployments

Deployments happen automatically when you merge PRs:

1. **Merge to `dev`** → Deploys to internal testing
2. **Merge to `main`** → Deploys to production

To control versions with PR labels:

- `version:major` - Major version bump
- `version:minor` - Minor version bump
- `version:patch` - Patch version bump (default for main)
- `no-deploy` - Skip deployment

See [CI/CD Documentation](./docs/MOBILE_DEPLOYMENT.md) for details.

### Manual Release Process

For hotfixes or manual releases:

```bash
# 1. Create a release (bumps version, creates tag, generates changelog)
yarn release:patch

# 2. Push to remote
git push && git push --tags

# 3. Deploy via GitHub Actions (happens automatically on merge to main)
```

The release script will:

- Check for uncommitted changes
- Bump the version in package.json
- Update iOS and Android native versions
- Generate a changelog
- Create a git tag
- Optionally push everything to remote

### Version Management

Versions are tracked in multiple places:

1. **`package.json`** - Semantic version (e.g., "2.5.5")
2. **`version.json`** - Platform build numbers:
   ```json
   {
     "ios": { "build": 148 },
     "android": { "build": 82 }
   }
   ```
3. **Native files** - Auto-synced during build:
   - iOS: `Info.plist`, `project.pbxproj`
   - Android: `build.gradle`

### Local Testing

#### Android Release Build

```bash
# Build release APK
cd android && ./gradlew assembleRelease

# Or build AAB for Play Store
cd android && ./gradlew bundleRelease

# Test release build on device
yarn android --mode release
```

#### iOS Release Build

```bash
# Using Fastlane (recommended)
bundle exec fastlane ios build_local

# Or using Xcode
# 1. Open ios/OpenPassport.xcworkspace
# 2. Product → Archive
# 3. Follow the wizard
```

### Troubleshooting Deployments

#### Version Already Exists

The build system auto-increments build numbers. If you get version conflicts:

```bash
# Check current versions
node scripts/version.cjs status

# Force bump build numbers
node scripts/version.cjs bump-build ios
node scripts/version.cjs bump-build android
```

#### Certificate Issues (iOS)

```bash
# Check certificate validity
bundle exec fastlane ios check_certs

# For local development, ensure you have:
# - Valid Apple Developer account
# - Certificates in Keychain
# - Correct provisioning profiles
```

#### Play Store Upload Issues

If automated upload fails, the AAB is saved locally:

- Location: `android/app/build/outputs/bundle/release/app-release.aab`
- Upload manually via Play Console

### Build Optimization

The CI/CD pipeline uses extensive caching:

- **iOS builds**: ~15 minutes (with cache)
- **Android builds**: ~10 minutes (with cache)
- **First build**: ~25 minutes (no cache)

To speed up local builds:

```bash
# Clean only what's necessary
yarn clean:build  # Clean build artifacts only
yarn clean        # Full clean (use sparingly)

# Use Fastlane for consistent builds
bundle exec fastlane ios internal_test test_mode:true
bundle exec fastlane android internal_test test_mode:true
```

### Maestro end-to-end tests

Install the Maestro CLI locally using curl or Homebrew:

```bash
curl -Ls https://get.maestro.mobile.dev | bash
# or
brew install maestro
```

Then build the app and run the flow:

```bash
yarn test:e2e:android  # Android
yarn test:e2e:ios      # iOS
```

The flow definition for Android is in [`tests/e2e/launch.android.flow.yaml`](tests/e2e/launch.android.flow.yaml) and for iOS is in [`tests/e2e/launch.ios.flow.yaml`](tests/e2e/launch.ios.flow.yaml).

## FAQ

If you get something like this:

```
'std::__1::system_error: open: /openpassport/app: Operation not permitted'
```

You might want to try [this](https://stackoverflow.com/questions/49443341/watchman-crawl-failed-retrying-once-with-node-crawler):

```
watchman watch-del-all
watchman shutdown-server
```

### Note on `yarn reinstall`

The `yarn reinstall` command deletes your `yarn.lock` and `package-lock.json` files and re-installs all dependencies from scratch. **This means you may get newer versions of packages than before, even if your `package.json` specifies loose version ranges.** This can sometimes introduce breaking changes or incompatibilities.

If you run into unexpected build failures after a reinstall, check for updated dependencies and consider pinning versions or restoring your previous lockfile.

**Tip:** After running `yarn reinstall`, if you encounter new build issues, compare your new `yarn.lock` (or `package-lock.json`) with the previous version. Look for any package version changes, especially for critical dependencies. Sometimes, a seemingly minor update can introduce breaking changes. If you find a problematic update, you may need to revert to the previous lockfile or explicitly pin the affected package version in your `package.json` to restore a working build.
