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
- [Troubleshooting](#troubleshooting-)
- [Additional Resources](#additional-resources-)

## Prerequisites 🛠️

Before working with this setup, ensure you have the following installed:

* **Ruby** - Fastlane requires Ruby (version 2.6.0 or higher recommended)
* **Bundler** - For managing Ruby dependencies
* **Xcode** - For iOS development (latest stable version recommended)
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

#### Android Secrets 🤖

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE` | Path to keystore file used for signing Android apps |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the Android keystore |
| `ANDROID_KEY_ALIAS` | Alias of the key in the keystore |
| `ANDROID_KEY_PASSWORD` | Password for the specified key |
| `ANDROID_PACKAGE_NAME` | Package name/application ID of the Android app |
| `ANDROID_PLAY_STORE_JSON_KEY_BASE64` | Base64 encoded Google Play Store service account JSON key file for API access |

#### iOS Secrets 🍏

| Secret | Description |
|--------|-------------|
| `IOS_APP_IDENTIFIER` | Bundle identifier for the iOS app |
| `IOS_CONNECT_API_KEY_BASE64` | Base64 encoded App Store Connect API key for authentication |
| `IOS_CONNECT_ISSUER_ID` | App Store Connect issuer ID associated with the API key |
| `IOS_CONNECT_KEY_ID` | App Store Connect key ID for API access |
| `IOS_DIST_CERT_BASE64` | Base64 encoded iOS distribution certificate for code signing |
| `IOS_PROV_PROFILE_BASE64` | Base64 encoded provisioning profile for the app |
| `IOS_PROV_PROFILE_NAME` | Name of the provisioning profile |
| `IOS_P12_PASSWORD` | Password for the p12 certificate file |
| `IOS_TEAM_ID` | Apple Developer Team ID |
| `IOS_TEAM_NAME` | Apple Developer Team name |
| `IOS_TESTFLIGHT_GROUPS` | Comma-separated list of TestFlight groups to distribute the app to |

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
3. **Auto Build Numbers**: System automatically increments build numbers
4. **Upload**: Artifacts are uploaded to respective app stores
5. **Notification**: Slack notifications sent upon successful builds

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

## Auto Build Number Incrementing 🔢

The CI/CD pipeline automatically manages build numbers/version codes:

### iOS Build Numbers

1. **Automatic Fetching:**
   * The pipeline fetches the latest build number from TestFlight via the App Store Connect API
   * Increments by 1 for the new build

2. **Implementation:**
   ```ruby
   latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
     api_key: api_key,
     app_identifier: ENV["IOS_APP_IDENTIFIER"],
     platform: "ios",
   )
   new_build_number = latest_build + 1
   ```

3. **Commit Back to Repository:**
   * After incrementing, changes are automatically committed back to the branch
   * Files affected: `./app/ios/OpenPassport/Info.plist` and `./app/ios/Self.xcodeproj/project.pbxproj`

### Android Version Code

1. **Local Incrementing:**
   * The pipeline increments the version code in the Gradle file
   * Cannot verify against Google Play due to permission issues (see Android Caveats)

2. **Commit Back to Repository:**
   * After building, the workflow commits the incremented version code
   * File affected: `./app/android/app/build.gradle`

## Slack Notifications 💬

The CI/CD pipeline sends notifications to Slack after successful builds:

1. **Configuration:**
   * Set `SLACK_API_TOKEN` and `SLACK_ANNOUNCE_CHANNEL_NAME` in your `.env.secrets` file
   * For CI, add these as GitHub Actions Secrets

2. **Notification Content:**
   * iOS: `🍎 iOS v{version} (Build {build_number}) deployed to TestFlight/App Store Connect`
   * Android: `🤖 Android v{version} (Build {version_code}) deployed to Internal Testing/Google Play`
   * Includes the built artifact (IPA/AAB) as an attachment

3. **Testing Notifications:**
   * You can test Slack notifications locally with the `force-local-upload-test` scripts
   * Requires a valid Slack API token with proper permissions

## Platform-Specific Notes 📱

### Android Deployment Caveats ⚠️

There are important limitations when working with Android deployments:

1. **Google Play Store Permission Limitations:**
   * The pipeline currently **lacks permissions** to directly upload builds to the Google Play Store
   * The `android_has_permissions` flag in helpers.rb is set to false, preventing direct uploads

2. **Manual Upload Process Required:**
   * After the Android build job finishes, you must:
     1. Download the AAB artifact from the GitHub Actions run
     2. Manually upload the AAB file to the Google Play Console
     3. Complete the release process in the Play Console UI

3. **Version Code Management:**
   * Unlike iOS, we cannot automatically fetch the current Android build number (version code)
   * After building, you need to manually commit the updated version number

4. **For Local Developers:**
   * When testing Android deployment locally:
     ```bash
     yarn android:build-release # Build the AAB
     # The AAB will be in android/app/build/outputs/bundle/release/app-release.aab
     ```
   * Note that the `force-local-upload-deploy:android` script will attempt to deploy but will fail due to permission issues

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
   * Ensure your certificate and provisioning profile are valid and not expired
   * Verify that the correct team ID is being used
   * Try using `fastlane match` to manage certificates and profiles

2. **TestFlight Upload Failures**
   * Check that your App Store Connect API key has sufficient permissions
   * Verify your app's version and build numbers are incremented properly
   * Ensure binary is properly signed with distribution certificate

### Android Build Issues

1. **Keystore Issues**
   * Verify keystore path, password, and key alias are correct
   * Check file permissions on the keystore file
   * Ensure you're using the correct signing configuration in Gradle

2. **Google Play Upload Failures**
   * Verify the service account has proper permissions in the Google Play Console
   * Check that the app's version code has been incremented
   * Ensure the JSON key file is valid and not expired

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
