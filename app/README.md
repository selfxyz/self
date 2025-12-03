# OpenPassport App

## Requirements

| Requirement | Version  | Installation Guide                                                       |
| ----------- | -------- | ------------------------------------------------------------------------ |
| nodejs      | >= 22    | [Install nodejs](https://nodejs.org/)                                    |
| ruby        | >= 3.1.0 | [Install ruby](https://www.ruby-lang.org/en/documentation/installation/) |
| circom      | Latest   | [Install circom](https://docs.circom.io/)                                |
| snarkjs     | Latest   | [Install snarkjs](https://github.com/iden3/snarkjs)                      |
| watchman    | Latest   | [Install watchman](https://facebook.github.io/watchman/)                 |

### Android

| Requirement                 | Version       | Installation Guide                                                                   |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| Java                        | 17            | [Install Java](https://www.oracle.com/java/technologies/javase-jdk17-downloads.html) |
| Android Studio (Optional)\* | Latest        | [Install Android Studio](https://developer.android.com/studio)                       |
| Android SDK                 | Latest        | See instructions for Android below                                                   |
| Android NDK                 | 27.0.12077973 | See instructions for Android below                                                   |

\* To facilitate the installation of the SDK and the NDK, and to pair with development devices with a conventient QR code, you can use Android Studio.

### iOS

| Requirement | Version | Installation Guide                                  |
| ----------- | ------- | --------------------------------------------------- |
| Xcode       | Latest  | [Install Xcode](https://developer.apple.com/xcode/) |
| cocoapods   | Latest  | [Install cocoapods](https://cocoapods.org/)         |

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

#### Using Android Studio

In Android Studio, go to **Tools** > **SDK Manager** in the menu

Under **SDK Platforms**, install the platform with the highest API number

Under **SDK Tools**, check the **Show Package Details** checkbox, expand **NDK (Side by side)**, select version **27.0.12077973** and install.

#### Using sdkmanager via CLI

Create a directory for the Android SDK. For example `~/android_sdk`. Define the environment variable `ANDROID_HOME` to point that directory.

Install sdkmanager under `ANDROID_HOME` according to the instructions on https://developer.android.com/tools/sdkmanager

List available SDK platforms

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --list | grep platforms
```

In the list of platforms, find the latest version and install it. (Replace _NN_ with the latest version number)

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "platforms;android-NN"
```

Install the NDK

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "ndk;27.0.12077973"
```

Define the environment variable `ANDROID_NDK_VERSION` to `27.0.12077973` and `ANDROID_NDK` to `$ANDROID_HOME/ndk/27.0.12077973`

Install Platform Tools, needed for the `adb` tool

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install platform-tools
```

Add `$ANDROID_HOME/platform-tools` to your `$PATH` variable

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

Open the ios project on Xcode and add your provisioning profile in Targets > OpenPassport > Signing and Capabilities

Then, install pods:

```
cd ios
pod install
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
