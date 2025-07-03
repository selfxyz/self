# Fastlane & CI/CD Development Guide 🚀

This document outlines how to work with the Fastlane setup and the GitHub Actions CI/CD pipeline for this mobile application.

## Table of Contents
- [Prerequisites](#prerequisites-)
- [Setup](#setup-)
- [Workflow Overview](#workflow-overview-)
- [Local Development](#local-development-)
- [CI/CD Pipeline](#cicd-pipeline-)
- [Version Management](#version-management-)
- [Platform-Specific Notes](#platform-specific-notes-)
- [Advanced Features](#advanced-features-)
- [Troubleshooting](#troubleshooting-)
- [Additional Resources](#additional-resources-)

## Prerequisites 🛠️

Before working with this setup, ensure you have the following installed:

* **Ruby** - Fastlane requires Ruby (version 2.6.0 or higher recommended)
* **Bundler** - For managing Ruby dependencies
* **Xcode** - For iOS development (Note: Local development currently requires Xcode 16.2 due to compatibility issues with 16.3)
* **Android Studio** - For Android development
* **Node.js & Yarn** - For JavaScript dependencies
* **Docker** - Optional, required for local testing with `act`

## Setup ⚙️

### Local Fastlane Setup

1. Install Fastlane via Bundler:
   ```bash
   cd app
   bundle install
   ```

2. Verify installation:
   ```bash
   bundle exec fastlane --version
   ```

### Secrets Management (`.env.secrets`) 🔑

Fastlane requires various secrets to interact with the app stores and sign applications:

1. **Create Your Local Secrets File:** Copy the template file to create your secrets file:

   ```bash
   cp app/fastlane/.env.secrets.example app/fastlane/.env.secrets
   ```

2. **Populate Values:** Fill in the values in your newly created `.env.secrets` file. Obtain these credentials from the appropriate platform developer portals or your team's administrator.

3. **Keep it Private:** The `.env.secrets` file is included in the project's `.gitignore` and **must not** be committed to the repository.

4. **CI/CD Setup:** For the GitHub Actions workflow, these same secrets must be configured as [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in the repository settings.

### Environment Secrets Reference 📝

#### Core Project Secrets 🔧

| Secret | Description |
|--------|-------------|
| `IOS_PROJECT_NAME` | iOS project name (used for workspace and scheme references) |
| `IOS_PROJECT_SCHEME` | iOS project scheme name for building |
| `IOS_SIGNING_CERTIFICATE` | iOS signing certificate identifier |

#### Android Secrets 🤖

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE` | Base64 encoded keystore file for signing Android apps |
| `ANDROID_KEYSTORE_PATH` | Path where keystore will be written (auto-generated for local dev) |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the Android keystore |
| `ANDROID_KEY_ALIAS` | Alias of the key in the keystore |
| `ANDROID_KEY_PASSWORD` | Password for the specified key |
| `ANDROID_PACKAGE_NAME` | Package name/application ID of the Android app |
| `ANDROID_PLAY_STORE_JSON_KEY_BASE64` | Base64 encoded Google Play Store service account JSON key file for API access |
| `ANDROID_PLAY_STORE_JSON_KEY_PATH` | Path where JSON key will be written (auto-generated for local dev) |

#### iOS Secrets 🍏

| Secret | Description |
|--------|-------------|
| `IOS_APP_IDENTIFIER` | Bundle identifier for the iOS app |
| `IOS_CONNECT_API_KEY_BASE64` | Base64 encoded App Store Connect API key for authentication |
| `IOS_CONNECT_API_KEY_PATH` | Path where API key will be written (auto-generated for local dev) |
| `IOS_CONNECT_ISSUER_ID` | App Store Connect issuer ID associated with the API key |
| `IOS_CONNECT_KEY_ID` | App Store Connect key ID for API access |
| `IOS_DIST_CERT_BASE64` | Base64 encoded iOS distribution certificate (.p12 file) for code signing |
| `IOS_PROV_PROFILE_BASE64` | Base64 encoded provisioning profile for the app |
| `IOS_PROV_PROFILE_NAME` | Name of the provisioning profile |
| `IOS_PROV_PROFILE_PATH` | Path where provisioning profile will be installed (auto-generated for local dev) |
| `IOS_P12_PASSWORD` | Password for the p12 certificate file |
| `IOS_TEAM_ID` | Apple Developer Team ID |
| `IOS_TEAM_NAME` | Apple Developer Team name |
| `IOS_TESTFLIGHT_GROUPS` | Comma-separated list of TestFlight groups to distribute the app to |

#### Slack Integration Secrets 📱

| Secret | Description |
|--------|-------------|
| `SLACK_API_TOKEN` | Slack bot token for uploading build artifacts |
| `SLACK_CHANNEL_ID` | Slack channel ID where build notifications will be sent |
| `SLACK_ANNOUNCE_CHANNEL_NAME` | Channel name for announcements (defaults to "deploy-mobile") |

## Workflow Overview 🔄

### Fastlane Lanes

The project uses several custom Fastlane lanes to handle different build and deployment scenarios:

#### iOS Lanes

| Lane | Description | Usage |
|------|-------------|-------|
| `internal_test` | Builds a beta version and uploads to TestFlight | `bundle exec fastlane ios internal_test` |
| `deploy` | Builds a production version and uploads to App Store Connect | `bundle exec fastlane ios deploy` |
| `sync_version` | Syncs version from package.json to Info.plist | `bundle exec fastlane ios sync_version` |

#### Android Lanes

| Lane | Description | Usage |
|------|-------------|-------|
| `internal_test` | Builds a beta version and uploads to Google Play Internal Testing | `bundle exec fastlane android internal_test` |
| `deploy` | Builds a production version and uploads to Google Play Production | `bundle exec fastlane android deploy` |
| `sync_version` | Syncs version from package.json to build.gradle | `bundle exec fastlane android sync_version` |

### Deployment Flow

1. **Version Management**: Update version in package.json using bump scripts
2. **Build Process**: Run the appropriate lane for internal testing or production
3. **Auto Build Numbers**: System automatically fetches latest build number from stores and increments
4. **Upload**: Artifacts are uploaded to respective app stores (subject to permissions)
5. **Notification**: Slack notifications sent with build artifacts upon successful builds

## Local Development 💻

### Package Scripts

Several scripts in `app/package.json` facilitate common Fastlane and versioning tasks:

#### Debug Builds 🐞

**`yarn ios:fastlane-debug`** / **`yarn android:fastlane-debug`**

* Executes the `internal_test` Fastlane lane for the respective platforms
* Builds the app in a debug configuration for internal testing
* Uploads to TestFlight (iOS) or Google Play Internal Testing (Android) if permissions allow
* Cleans build directories (`ios/build`, `android/app/build`) before running

#### Forced Local Deployment 🚀

**`yarn force-local-upload-deploy`**
**`yarn force-local-upload-deploy:ios`**
**`yarn force-local-upload-deploy:android`**

* Runs the `deploy` Fastlane lane with local development settings
* Uses `FORCE_UPLOAD_LOCAL_DEV=true` to bypass CI checks
* Useful for testing deployment process locally or manual deploys
* Cleans build directories first
* **Use with caution!** Will attempt to upload to production if you have permissions

#### Forced Local Testing 🧪

**`yarn force-local-upload-test`**
**`yarn force-local-upload-test:ios`**
**`yarn force-local-upload-test:android`**

* Similar to deploy version, but runs `internal_test` lane locally
* Useful for testing the internal distribution process
* Uses `FORCE_UPLOAD_LOCAL_DEV=true` flag

### Version Management 🏷️

**`yarn bump-version:major|minor|patch`**

* Increments version in `package.json` according to semantic versioning
* Creates version commit and tag automatically
* Calls `sync-versions` afterwards

**`yarn sync-versions`**

* Synchronizes the version from `package.json` to native files
* Updates iOS `Info.plist` and Android `build.gradle`
* Ensures consistency across JS bundle and native app wrappers

### Local Testing with `act` 🧰

You can test the GitHub Actions workflow locally using [`act`](https://github.com/nektos/act):

1. **Install `act`:** Follow the installation instructions in the `act` repository.

2. **Run Jobs:** From the *root* of the project repository:

   ```bash
   # Test the Android build
   act -j build-android --secret-file app/fastlane/.env.secrets

   # Test the iOS build (limited functionality on non-macOS systems)
   act -j build-ios --secret-file app/fastlane/.env.secrets
   ```

3. **Advanced Usage:**
   * When running with `act`, the environment variable `ACT=true` is set automatically
   * This causes certain steps to be skipped, like code signing and store uploads
   * You can modify the workflow file locally to focus on specific steps by adding `if: false` to steps you want to skip

4. **Limitations:**
   * iOS builds require macOS-specific tools not available in Docker
   * Certificate/provisioning profile handling may not work as expected
   * Network access to Apple/Google services may be limited

## CI/CD Pipeline 🔄

The primary CI/CD workflow is defined in `.github/workflows/mobile-deploy.yml`. It automates the build and deployment process.

### Triggers

* **Push Events:** Runs on pushes to `dev` or `main` branches that change files in `app/` or the workflow file
* **Pull Request Events:** Runs on PRs to `dev` or `main` branches that change files in `app/` or the workflow file

### Manual Deployments

From the GitHub Actions page select **Mobile App Deployments** and use the
**Run workflow** button. Choose the desired platform (`ios`, `android`, or
`both`) to start the build jobs on demand.

### Jobs

The workflow consists of parallel jobs for each platform:

#### `build-ios` Job

Runs on `macos-latest` and performs the following steps:
1. Sets up the environment (Node.js, Ruby, CocoaPods)
2. Processes iOS secrets and certificates
3. Runs appropriate Fastlane lane based on branch
4. Commits updated build numbers back to the repository

#### `build-android` Job

Runs on `ubuntu-latest` and performs the following steps:
1. Sets up the environment (Node.js, Java, Android SDK)
2. Processes Android secrets
3. Runs appropriate Fastlane lane based on branch
4. Commits updated version code back to the repository

### Deployment Destinations

* **Internal Testing:**
  * iOS: TestFlight
  * Android: Google Play Internal Testing track
  * Triggered on pushes to `dev` branch and pull requests

* **Production:**
  * iOS: App Store Connect (ready for submission)
  * Android: Google Play Production track
  * Triggered on pushes to `main` branch

## Auto Build Number Management 🔢

The CI/CD pipeline automatically manages build numbers/version codes with sophisticated logic:

### iOS Build Numbers

1. **Automatic Fetching:**
   * The pipeline fetches the latest build number from TestFlight via the App Store Connect API
   * Increments by 1 for the new build
   * Includes verification to ensure the new build number is higher than the current TestFlight version

2. **Implementation:**
   ```ruby
   latest = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
     api_key: api_key,
     app_identifier: ENV["IOS_APP_IDENTIFIER"],
     platform: "ios"
   )
   new_build_number = latest + 1
   ```

3. **Commit Back to Repository:**
   * After incrementing, changes are automatically committed back to the branch
   * Files affected: `./app/ios/OpenPassport/Info.plist` and `./app/ios/Self.xcodeproj/project.pbxproj`

### Android Version Code

1. **Local Incrementing:**
   * The pipeline increments the version code in the Gradle file locally
   * **Note:** Cannot verify against Google Play due to permission limitations (see Android Caveats)
   * Uses sophisticated logic to parse and update the `versionCode` field

2. **Implementation:**
   ```ruby
   # Parses current version code from build.gradle
   current = content.match(/versionCode\s+(\d+)/)[1].to_i
   new_version = current + 1
   ```

3. **Commit Back to Repository:**
   * After building, the workflow commits the incremented version code
   * File affected: `./app/android/app/build.gradle`

## Platform-Specific Notes 📱

### Android Deployment Caveats ⚠️

**Critical:** The Android deployment system has important limitations:

1. **Google Play Store Permission Limitations:**
   * The pipeline currently **lacks permissions** to directly upload builds to the Google Play Store
   * The `android_has_permissions` flag in the Fastfile is set to `false`, preventing direct uploads
   * This is a hardcoded limitation in the current implementation

2. **Manual Upload Process Required:**
   * After the Android build job finishes, you must:
     1. Download the `app-release.aab` artifact from the GitHub Actions run
        (under **Artifacts** on the workflow summary page)
     2. Sign in to the Google Play Console and create a new release
     3. Upload the downloaded AAB file and follow the console prompts
     4. Complete the release process in the Play Console UI

3. **Version Code Management:**
   * The system increments version codes locally but cannot verify against Google Play
   * The `android_verify_version_code` function exists but is commented out due to permission issues
   * Version codes are still properly incremented and committed back to the repository

4. **For Local Developers:**
   * When testing Android deployment locally, the AAB file will be generated but upload will be skipped
   * The system will still send Slack notifications with the built artifact

### iOS Development Notes 🍏

1. **Xcode Version Compatibility:**
   * Local development currently requires Xcode 16.2 due to compatibility issues with 16.3
   * The Fastfile includes `xcode_select "/Applications/Xcode-16-2.app"` for local builds

2. **Code Signing:**
   * The system automatically sets up manual code signing for consistency
   * Certificates and provisioning profiles are automatically decoded and installed for local development

3. **Build Configuration:**
   * Uses Apple Generic Versioning system for build number management
   * Automatically configures export options for App Store distribution

## Advanced Features 🔧

### Error Handling and Retry Logic

The helpers include sophisticated error handling:

1. **Retry Logic:**
   ```ruby
   with_retry(max_retries: 3, delay: 5) do
     # Operation that might fail
   end
   ```

2. **Standardized Error Reporting:**
   * `report_error(message, suggestion, abort_message)` - Displays error and aborts
   * `report_success(message)` - Displays success message with checkmark
   * All critical operations use consistent error reporting

3. **Environment Variable Verification:**
   * Automatic verification of required environment variables before build
   * Clear error messages indicating missing variables

### Slack Integration

The Slack integration is sophisticated and handles file uploads:

1. **File Upload Process:**
   * Uses Slack's three-step upload process (getUploadURL → upload → completeUpload)
   * Includes retry logic for network failures
   * Uploads actual build artifacts (IPA/AAB files) to Slack channels

2. **Notification Format:**
   * iOS: `🍎 iOS v{version} (Build {build_number}) deployed to TestFlight/App Store Connect`
   * Android: `🤖 Android v{version} (Build {version_code}) deployed to Internal Testing/Google Play`

3. **Configuration:**
   * Requires `SLACK_API_TOKEN` and `SLACK_CHANNEL_ID`
   * Fallback to `SLACK_ANNOUNCE_CHANNEL_NAME` for channel configuration

### Local Development Helpers

The system includes extensive helpers for local development:

1. **iOS Certificate Management:**
   * Automatically decodes and installs certificates from base64 environment variables
   * Handles provisioning profile installation and UUID extraction
   * Includes keychain diagnostics for troubleshooting

2. **Android Keystore Management:**
   * Automatically creates keystore files from base64 environment variables
   * Handles Play Store JSON key setup for local development

3. **CI Detection:**
   * Automatically detects CI environment vs local development
   * Skips certain operations when running in `act` (local CI testing)
   * Handles forced uploads with confirmation prompts

## Troubleshooting 🔍

### Version Syncing Issues

If you encounter issues with version syncing between `package.json` and native projects:

1. **Manual Sync:**
   ```bash
   yarn sync-versions
   ```
   This runs the Fastlane lanes to sync versions without building or deploying.

2. **Version Mismatch Checking:**
   ```bash
   # Check version in Info.plist
   /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" app/ios/OpenPassport/Info.plist

   # Check version in build.gradle
   grep "versionName" app/android/app/build.gradle
   ```

3. **Fixing Discrepancies:**
   * Always update `package.json` version first using the `bump-version` scripts
   * Then run `sync-versions` to update native files
   * For manual fixes, edit the version in each file and commit the changes

### iOS Build Issues

1. **Certificate/Provisioning Profile Errors**
   * Verify certificates are not expired and have proper base64 encoding
   * Check that the correct team ID is being used
   * Ensure provisioning profile matches the app identifier and certificates
   * Use the built-in keychain diagnostics for troubleshooting

2. **TestFlight Upload Failures**
   * Check that your App Store Connect API key has sufficient permissions
   * Verify build number increment logic is working correctly
   * Ensure binary is properly signed with distribution certificate

3. **Xcode Version Issues**
   * Ensure you're using Xcode 16.2 for local development
   * Check that the correct Xcode version is selected with `xcode-select`

### Android Build Issues

1. **Keystore Issues**
   * Verify keystore is properly base64 encoded in environment variables
   * Check that keystore password, key alias, and key password are correct
   * Ensure the keystore file is being created properly by the helper

2. **Google Play Upload Limitations**
   * Remember that uploads are currently disabled due to permission limitations
   * Manual upload via Google Play Console is required
   * Version codes are still properly incremented for manual uploads

3. **Build Failures**
   * Check that all required environment variables are set
   * Verify Gradle build is working with the correct signing configuration
   * Use the retry logic for transient network issues

### Common Issues

1. **Environment Variable Issues**
   * Use `verify_env_vars` function to check all required variables
   * Ensure base64 encoding is correct for certificate/key files
   * Check that secrets are properly configured in CI/CD

2. **Network and Permission Issues**
   * Most operations include retry logic with exponential backoff
   * Check API permissions for App Store Connect and Google Play
   * Verify Slack bot permissions for file uploads

3. **Local Development Setup**
   * Ensure `.env.secrets` file is properly configured
   * Use the force upload confirmation prompts carefully
   * Check that all required development tools are installed

## Additional Resources 📚

### Official Documentation

* [Fastlane Documentation](https://docs.fastlane.tools/)
* [GitHub Actions Documentation](https://docs.github.com/en/actions)
* [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
* [Google Play Developer API](https://developers.google.com/android-publisher)

### Helpful Tools

* [Match](https://docs.fastlane.tools/actions/match/) - Fastlane tool for iOS code signing
* [Supply](https://docs.fastlane.tools/actions/supply/) - Fastlane tool for Android app deployment
* [Gym](https://docs.fastlane.tools/actions/gym/) - Fastlane tool for building iOS apps
* [Slack API Documentation](https://api.slack.com/) - For setting up Slack integration

### Internal Helper Documentation

The project includes several custom helper modules:

* `helpers/common.rb` - Core utilities, error handling, and retry logic
* `helpers/ios.rb` - iOS-specific build number management and certificate handling
* `helpers/android.rb` - Android-specific version code management and keystore handling
* `helpers/slack.rb` - Slack integration for build notifications and file uploads
