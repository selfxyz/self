# Fastlane & CI/CD Development Guide 🚀

This document outlines how to work with the Fastlane setup and the GitHub Actions CI/CD pipeline for this mobile application.

## Prerequisites 🛠️

Before working with this setup, ensure you have the following installed:

* **Ruby** - Fastlane requires Ruby (version 2.6.0 or higher recommended)
* **Bundler** - For managing Ruby dependencies
* **Xcode** - For iOS development (latest stable version recommended)
* **Android Studio** - For Android development
* **Node.js & Yarn** - For JavaScript dependencies

### Local Fastlane Setup ⚙️

1. Install Fastlane via Bundler:
   ```bash
   cd app
   bundle install
   ```

2. Verify installation:
   ```bash
   bundle exec fastlane --version
   ```

## GitHub Actions CI/CD (`mobile-deploy.yml`) 🔄

The primary CI/CD workflow is defined in `.github/workflows/mobile-deploy.yml`. It automates the build and deployment process based on repository events.

### Triggers 🎯

* **Push Events:** 
  * Automatically runs when code is pushed to the `dev` or `main` branches
  * Only triggers if changes occur within the `app/` directory or the workflow file itself

* **Pull Request Events:** 
  * Automatically runs when a pull request is opened or updated that targets the `dev` or `main` branches
  * Only triggers if changes occur in `app/` or the workflow file

### Environment Variables (`env`) 🔧

* `IS_PR`: True if the trigger is a pull request
* `STAGING_BRANCH` / `MAIN_BRANCH`: Defines the names of key branches (`dev`, `main`)
* Version variables (`NODE_VERSION`, `RUBY_VERSION`, etc.): Ensure consistent build environments
* Path variables (`WORKSPACE`, `APP_PATH`, certificate/key paths): Standardize file locations within the runner
* `ACT`: Set automatically by `act` when running locally, allowing steps to be skipped (e.g., code signing, uploads)

### Permissions 🔐

Grants necessary permissions (`contents: write`, `pull-requests: write`) for actions like checking out code and potentially committing version bumps (though this is currently disabled).

### Jobs 👷

The workflow consists of parallel jobs for each platform:

#### `build-ios` (runs on `macos-latest`) 🍏

1. **Checkout Code:** Gets the repository files
2. **Install Mobile Dependencies:** Sets up Node.js, Ruby (with Bundler for Fastlane), Yarn dependencies, and CocoaPods
3. **Verify & Decode Secrets:** Processes iOS secrets (certificates, API keys) stored as GitHub Actions Secrets
4. **Install Certificate & Provisioning Profile:** Prepares the build environment for code signing
5. **Run Fastlane:**
   * Executes `bundle exec fastlane ios deploy --verbose` for pushes to `main` branch
   * Executes `bundle exec fastlane ios internal_test --verbose` for pushes to `dev` or pull requests

#### `build-android` (runs on `ubuntu-latest`) 🤖

1. **Checkout Code:** Gets the repository files
2. **Install Mobile Dependencies & SDK:** Sets up Node.js, Java, Android SDK and NDK
3. **Decode & Verify Secrets:** Processes Android keystore and Play Store JSON key
4. **Run Fastlane:**
   * Executes `bundle exec fastlane android deploy --verbose` for pushes to `main` branch
   * Executes `bundle exec fastlane android internal_test --verbose` for pushes to `dev` or pull requests

### Deployment Summary 📦

* **Internal Testing:** 
  * Builds are automatically uploaded to TestFlight (iOS) and Google Play Internal Testing (Android)
  * Triggered on every push to the `dev` branch and for pull requests targeting `dev` or `main`

* **Production:** 
  * Builds are automatically uploaded to the App Store (iOS, ready for submission) and Google Play Production track (Android)
  * Triggered on every push to the `main` branch

## Fastlane Lanes Overview 🛣️

The project uses several custom Fastlane lanes to handle different build and deployment scenarios:

### iOS Lanes

| Lane | Description | Usage |
|------|-------------|-------|
| `internal_test` | Builds a beta version and uploads to TestFlight | `bundle exec fastlane ios internal_test` |
| `deploy` | Builds a production version and uploads to App Store Connect | `bundle exec fastlane ios deploy` |
| `sync_version` | Syncs version from package.json to Info.plist | `bundle exec fastlane ios sync_version` |

### Android Lanes

| Lane | Description | Usage |
|------|-------------|-------|
| `internal_test` | Builds a beta version and uploads to Google Play Internal Testing | `bundle exec fastlane android internal_test` |
| `deploy` | Builds a production version and uploads to Google Play Production | `bundle exec fastlane android deploy` |
| `sync_version` | Syncs version from package.json to build.gradle | `bundle exec fastlane android sync_version` |

## Secrets Management (`.env.secrets`) 🔑

Fastlane requires various secrets (API keys, certificates, passwords) to interact with Apple App Store Connect and Google Play Store, and to sign the applications.

1. **Template File:** A template file `app/fastlane/.env.secrets.example` lists all the required environment variables.

2. **Create Your Local Secrets File:** Copy the example file to `app/fastlane/.env.secrets`:
   
   ```bash
   cp app/fastlane/.env.secrets.example app/fastlane/.env.secrets
   ```

3. **Populate Values:** Fill in the values in your newly created `.env.secrets` file. Obtain these credentials from the appropriate platform developer portals or your team's administrator.

4. **`.gitignore`:** The `.env.secrets` file is included in the project's `.gitignore` and **must not** be committed to the repository.

5. **CI/CD:** For the GitHub Actions workflow, these same secrets must be configured as [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in the repository settings.

### Environment Secrets Reference 📝

Below is a reference for all the environment secrets in the `.env.secrets` file:

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

## `package.json` Scripts 📜

Several scripts in `app/package.json` facilitate common Fastlane and versioning tasks:

### Debug Builds 🐞

**`yarn ios:fastlane-debug`** / **`yarn android:fastlane-debug`**

* Executes the `internal_test` Fastlane lane for the respective platforms
  ```
  bundle exec fastlane ios internal_test
  bundle exec fastlane android internal_test
  ```
* Builds the app in a debug configuration for internal testing
* Uploads to TestFlight (iOS) or Google Play Internal Testing (Android)
* Cleans build directories (`ios/build`, `android/app/build`) before running

### Forced Local Deployment 🚀

**`yarn force-local-upload-deploy`**  
**`yarn force-local-upload-deploy:ios`**  
**`yarn force-local-upload-deploy:android`**

* Runs the `deploy` Fastlane lane with local development settings
  ```
  FORCE_UPLOAD_LOCAL_DEV=true
  ```
* Useful for testing deployment process locally or manual deploys
* Bypasses some CI checks - use with caution!
* Cleans build directories first

### Forced Local Testing 🧪

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

* Synchronizes the version from `package.json` to native files:
  ```
  bundle exec fastlane ios sync_version
  bundle exec fastlane android sync_version
  ```
* Updates iOS `Info.plist` and Android `build.gradle`
* Ensures consistency across JS bundle and native app wrappers

## Local Testing with `act` 🧰

You can test the GitHub Actions workflow locally using [`act`](https://github.com/nektos/act). This requires Docker to be installed and running.

1. **Install `act`:** Follow the installation instructions in the `act` repository.

2. **Run Jobs:** From the *root* of the project repository:

   * Test the Android build:
     ```bash
     act -j build-android
     ```

   * Test the iOS build:
     ```bash
     act -j build-ios
     ```

3. **Notes:**
   * macOS-specific jobs might have limitations when not running on macOS
   * `act` will prompt for secrets unless provided via `-s KEY=VALUE` or `--secret-file`
   * For basic build tests, you might be able to skip some secrets

## Troubleshooting 🔍

### Common Issues and Solutions

#### iOS Build Issues

1. **Certificate/Provisioning Profile Errors**
   * Ensure your certificate and provisioning profile are valid and not expired
   * Verify that the correct team ID is being used
   * Try using `fastlane match` to manage certificates and profiles

2. **TestFlight Upload Failures**
   * Check that your App Store Connect API key has sufficient permissions
   * Verify your app's version and build numbers are incremented properly
   * Ensure binary is properly signed with distribution certificate

#### Android Build Issues

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
