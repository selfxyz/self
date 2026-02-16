# Fastlane & CI/CD Development Guide 🚀

This document outlines how to work with the Fastlane setup and the GitHub Actions CI/CD pipeline for this mobile application.

> **⚠️ IMPORTANT - Manual Version Management Required**
>
> Build numbers are **manually managed** in this project. Before every deployment, you **must**:
> 1. Run `yarn bump-version:patch|minor|major` to increment the version
> 2. Run `yarn sync-versions` to update native files
> 3. Commit and push the changes
>
> **Deployments will fail** if version numbers are not manually incremented first.

## Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Workflow Overview](#workflow-overview)
- [Local Development](#local-development)
- [CI/CD Pipeline](#cicd-pipeline)
- [Version Management](#manual-build-number-management)
- [Platform-Specific Notes](#platform-specific-notes)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Quick Start 🚀

**⚠️ Important:** Before deploying, you must manually increment the build version:

```sh
# 1. First, bump the version (choose one)
yarn bump-version:patch         # For patch releases (1.0.0 → 1.0.1)
yarn bump-version:minor         # For minor releases (1.0.0 → 1.1.0)
yarn bump-version:major         # For major releases (1.0.0 → 2.0.0)

# 2. Sync version to native files
yarn sync-versions

# 3. Commit the changes
git add . && git commit -m "Bump version" && git push
```

**🚀 Then deploy with these yarn commands:**

```sh
yarn mobile-deploy              # Deploy to both iOS and Android
yarn mobile-deploy:ios          # Deploy to iOS TestFlight only
yarn mobile-deploy:android      # Deploy to Android Internal Testing only
```

These commands will show you a confirmation dialog with deployment details before proceeding.

### ✅ Preferred Method: Yarn Commands

**⚠️ Always use the yarn deployment commands instead of running fastlane directly.**

The yarn commands provide safety checks and handle both local and GitHub runner deployments:

```sh
# Deploy to both platforms (recommended)
yarn mobile-deploy

# Deploy to iOS TestFlight only
yarn mobile-deploy:ios

# Deploy to Android Internal Testing only
yarn mobile-deploy:android
```

### Alternative: Direct Script Usage

If you prefer to call the script directly:

```sh
# Deploy to iOS TestFlight
node scripts/mobile-deploy-confirm.cjs ios

# Deploy to Android Internal Testing
node scripts/mobile-deploy-confirm.cjs android

# Deploy to both platforms
node scripts/mobile-deploy-confirm.cjs both
```

### Deployment Methods

**GitHub Runner (Default):**
- Triggers GitHub Actions workflow
- Builds and uploads using GitHub infrastructure
- Requires repository secrets to be configured
- Recommended for most developers

**Local Fastlane:**
- Builds and uploads directly from your machine
- Requires local certificates and API keys
- Set `FORCE_UPLOAD_LOCAL_DEV=true` to enable
- Only use if you have local development setup

### Local Deployment (Advanced Users)

If you have local certificates and API keys set up, you can use local deployment:

```sh
# Deploy to internal testing using local fastlane (with confirmation)
yarn mobile-local-deploy          # Deploy to both platforms using local fastlane
yarn mobile-local-deploy:ios      # Deploy iOS to TestFlight Internal Testing
yarn mobile-local-deploy:android  # Deploy Android to Google Play Internal Testing
```

**Important Notes:**
- All `mobile-local-deploy` commands use the same confirmation script as regular deployment
- Local deployment goes to **internal testing** (TestFlight Internal Testing / Google Play Internal Testing)
- This is safer than the previous behavior which went directly to production stores
- For production deployment, use the GitHub runner method or call fastlane directly (not recommended)

**Why internal testing?** This provides the same safety as GitHub runner deployments while allowing you to use your local machine for building.

After running a local iOS deploy, reset the Xcode project to avoid committing build artifacts:

```bash
./scripts/cleanup-ios-build.sh
```

### Direct Fastlane Commands (Not Recommended)

⚠️ **Use the confirmation script above instead of these direct commands.**

The available fastlane lanes are documented in the auto-generated `README.md`, but you should prefer the yarn commands for safety and consistency.

### Deployment Status

After deployment, you can check the status:

- **GitHub Runner:** Check [GitHub Actions](https://github.com/YOUR_ORG/YOUR_REPO/actions) for build progress
- **Local Fastlane:** Check the terminal output and app store dashboards directly
- **iOS:** Check [App Store Connect](https://appstoreconnect.apple.com) for TestFlight builds
- **Android:** Check [Google Play Console](https://play.google.com/console) for Internal Testing builds

## Prerequisites 🛠️

Before working with this setup, ensure you have the following installed:

* **Node.js** - Version 22 or higher (for JavaScript dependencies and deployment scripts)
* **Yarn** - Package manager for JavaScript dependencies
* **Git** - Required for branch detection and status checking during deployments
* **GitHub CLI (`gh`)** - **Required** for GitHub runner deployments (default method)
  - Install from [https://cli.github.com/](https://cli.github.com/)
  - Authenticate with `gh auth login` after installation
  - Used to trigger GitHub Actions workflows for deployments
* **Ruby** - Fastlane requires Ruby (version 2.6.0 or higher recommended)
* **Bundler** - For managing Ruby dependencies
* **Xcode** - For iOS development (15+; local development currently uses Xcode 16.2 due to compatibility issues with 16.3)
* **Android Studio** - For Android development
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
| `IOS_TESTFLIGHT_GROUPS` | Comma-separated list of **external** TestFlight groups to distribute the app to |

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
2. **Version Sync**: Run sync-versions to update native files
3. **Commit Changes**: Commit version changes to repository
4. **Build Process**: Run the appropriate lane for internal testing or production
5. **Upload**: Artifacts are uploaded to respective app stores (subject to permissions)
6. **Notification**: Slack notifications sent with build artifacts upon successful builds

## Local Development 💻

### Package Scripts

Several scripts in `app/package.json` facilitate common Fastlane and versioning tasks:

#### Debug Builds 🐞

**`yarn ios:fastlane-debug`**

* Executes the `internal_test` Fastlane lane for iOS
* Builds the app in a debug configuration for internal testing
* Uploads to TestFlight if permissions allow
* Cleans build directories (`ios/build`) before running

**Direct Fastlane Commands**

For Android builds, use Fastlane directly:

* `bundle exec fastlane android internal_test` - Build and upload to Google Play Internal Testing
* `bundle exec fastlane android deploy` - Build and upload to Google Play Production

For iOS builds, you can also use Fastlane directly:

* `bundle exec fastlane ios internal_test` - Build and upload to TestFlight
* `bundle exec fastlane ios deploy` - Build and upload to App Store Connect

#### Local Deployment with Confirmation 🚀

**`yarn mobile-local-deploy`**
**`yarn mobile-local-deploy:ios`**
**`yarn mobile-local-deploy:android`**

* Runs the `internal_test` Fastlane lane with local development settings
* Uses `FORCE_UPLOAD_LOCAL_DEV=true` to bypass CI checks
* Shows confirmation dialog before proceeding
* Deploys to **internal testing** (TestFlight Internal Testing / Google Play Internal Testing)
* Requires local certificates and API keys to be configured
* **Use with caution!** Make sure you have proper local setup

**Alternative: Direct Fastlane Commands**

For more control, you can run Fastlane directly with local development settings:

* `FORCE_UPLOAD_LOCAL_DEV=true bundle exec fastlane ios internal_test` - Force local iOS testing
* `FORCE_UPLOAD_LOCAL_DEV=true bundle exec fastlane android internal_test` - Force local Android testing

### Version Management 🏷️

**⚠️ Required before every deployment:**

**`yarn bump-version:major|minor|patch`**

* Increments version in `package.json` according to semantic versioning
* Creates version commit and tag automatically
* **Must be run before deployment** to ensure unique version numbers

**`yarn sync-versions`**

* Synchronizes the version from `package.json` to native files
* Updates iOS `Info.plist` and Android `build.gradle`
* Ensures consistency across JS bundle and native app wrappers
* **Must be run after bump-version** and before deployment

**Complete Version Update Workflow:**

```bash
# 1. Bump version (choose appropriate level)
yarn bump-version:patch         # For bug fixes
yarn bump-version:minor         # For new features
yarn bump-version:major         # For breaking changes

# 2. Sync to native files
yarn sync-versions

# 3. Commit changes
git add .
git commit -m "Bump version to $(node -p "require('./package.json').version")"
git push

# 4. Now you can deploy
yarn mobile-deploy
```

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

Runs on `namespace-profile-apple-silicon-6cpu` and performs the following steps:
1. Sets up the environment (Node.js, Ruby, CocoaPods)
2. Processes iOS secrets and certificates
3. Runs appropriate Fastlane lane based on branch
4. Builds and deploys the application using the manually set version

#### `build-android` Job

Runs on `ubuntu-latest` and performs the following steps:
1. Sets up the environment (Node.js, Java, Android SDK)
2. Processes Android secrets
3. Runs appropriate Fastlane lane based on branch
4. Builds and deploys the application using the manually set version

### Deployment Destinations

* **Internal Testing:**
  * iOS: TestFlight
  * Android: Google Play Internal Testing track
  * Triggered on pushes to `dev` branch and pull requests

* **Production:**
  * iOS: App Store Connect (ready for submission)
  * Android: Google Play Production track
  * Triggered on pushes to `main` branch

## Manual Build Number Management 🔢

Build numbers and version codes must be manually incremented before deployment using the provided scripts:

### Prerequisites for Deployment

**⚠️ Important:** Before running any deployment commands, you must manually increment the build version using these steps:

1. **Update Version Number:**
   ```bash
   # Increment version in package.json (choose one)
   yarn bump-version:major    # For major releases (1.0.0 → 2.0.0)
   yarn bump-version:minor    # For minor releases (1.0.0 → 1.1.0)
   yarn bump-version:patch    # For patch releases (1.0.0 → 1.0.1)
   ```

2. **Sync to Native Files:**
   ```bash
   # Synchronize version from package.json to native files
   yarn sync-versions
   ```

3. **Commit Changes:**
   ```bash
   # Commit the version changes
   git add .
   git commit -m "Bump version to $(node -p "require('./package.json').version")"
   git push
   ```

### iOS Build Numbers

1. **Manual Management:**
   * Build numbers are managed through the version bump scripts
   * The `sync-versions` script updates `Info.plist` and Xcode project files
   * Each deployment requires a unique build number higher than the previous version

2. **Files Updated:**
   * `./app/ios/OpenPassport/Info.plist` - `CFBundleVersion`
   * `./app/ios/Self.xcodeproj/project.pbxproj` - `CURRENT_PROJECT_VERSION`

### Android Version Code

1. **Manual Management:**
   * Version codes are managed through the version bump scripts
   * The `sync-versions` script updates the `build.gradle` file
   * Each deployment requires a unique version code higher than the previous version

2. **Files Updated:**
   * `./app/android/app/build.gradle` - `versionCode` and `versionName`

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
   * The CI/CD pipeline uses `bundle exec fastlane android internal_test` directly

3. **Version Code Management:**
   * Version codes must be manually incremented using the `bump-version` scripts before deployment
   * The `sync-versions` script updates the version code in the Gradle file
   * Ensure version codes are properly incremented and committed before running deployment commands

4. **For Local Developers:**
   * When testing Android deployment locally, the AAB file will be generated but upload will be skipped
   * The system will still send Slack notifications with the built artifact

### iOS Development Notes 🍏

1. **Code Signing:**
   * The system automatically sets up manual code signing for consistency
   * Certificates and provisioning profiles are automatically decoded and installed for local development

2. **Build Configuration:**
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
   # Check version in package.json
   node -p "require('./package.json').version"

   # Check version in Info.plist
   /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" app/ios/OpenPassport/Info.plist

   # Check version in build.gradle
   grep "versionName" app/android/app/build.gradle
   ```

3. **Fixing Discrepancies:**
   * **Always update `package.json` version first** using the `bump-version` scripts:
     ```bash
     yarn bump-version:patch  # or minor/major
     ```
   * Then run `sync-versions` to update native files:
     ```bash
     yarn sync-versions
     ```
   * Commit all changes before deploying:
     ```bash
     git add .
     git commit -m "Bump version to $(node -p "require('./package.json').version")"
     git push
     ```
   * **Never manually edit version numbers** in native files - always use the scripts to prevent inconsistencies

### iOS Build Issues

1. **Certificate/Provisioning Profile Errors**
   * Verify certificates are not expired and have proper base64 encoding
   * Check that the correct team ID is being used
   * Ensure provisioning profile matches the app identifier and certificates
   * Use the built-in keychain diagnostics for troubleshooting

2. **TestFlight Upload Failures**
   * Check that your App Store Connect API key has sufficient permissions
   * Verify build number was manually incremented using bump-version scripts
   * Ensure binary is properly signed with distribution certificate

3. **Xcode Version Issues**
   * Ensure you're using Xcode 15+ for local development (currently tested with 16.2)
   * Check that the correct Xcode version is selected with `xcode-select`

### Android Build Issues

1. **Keystore Issues**
   * Verify keystore is properly base64 encoded in environment variables
   * Check that keystore password, key alias, and key password are correct
   * Ensure the keystore file is being created properly by the helper

2. **Google Play Upload Limitations**
   * Remember that uploads are currently disabled due to permission limitations
   * Manual upload via Google Play Console is required
   * Ensure version codes are manually incremented using bump-version scripts before building

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
