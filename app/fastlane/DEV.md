# Fastlane & CI/CD Development Guide

This document outlines how to work with the Fastlane setup and the GitHub Actions CI/CD pipeline for this mobile application.

## Secrets Management (`.env.secrets`)

Fastlane requires various secrets (API keys, certificates, passwords) to interact with Apple App Store Connect and Google Play Store, and to sign the applications.

1. **Template File:** A template file `app/fastlane/.env.secrets.example` lists all the required environment variables.
2. **Create Your Local Secrets File:** Copy the example file to `app/fastlane/.env.secrets`:
   
   ```bash
   cp app/fastlane/.env.secrets.example app/fastlane/.env.secrets
   ```
3. **Populate Values:** Fill in the values in your newly created `.env.secrets` file. Obtain these credentials from the appropriate platform developer portals or your team's administrator.
4. **`.gitignore`:** The `.env.secrets` file is included in the project's `.gitignore` and **must not** be committed to the repository.
5. **CI/CD:** For the GitHub Actions workflow (`.github/workflows/mobile-deploy.yml`), these same secrets must be configured as [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in the repository settings. The workflow automatically decodes and uses these secrets during builds and deployments.

## `package.json` Scripts

Several scripts in `app/package.json` facilitate common Fastlane and versioning tasks:

* **`yarn ios:fastlane-debug` / `yarn android:fastlane-debug`**:
  
  * These scripts execute the `internal_test` Fastlane lane for the respective platforms (`bundle exec fastlane ios internal_test` and `bundle exec fastlane android internal_test`).
  * They typically build the app in a debug or internal testing configuration and upload it to TestFlight (for iOS) or Google Play Internal Testing (for Android).
  * They clean the respective build directories (`ios/build`, `android/app/build`) before running Fastlane.

* **`yarn force-local-upload-deploy` / `yarn force-local-upload-deploy:ios` / `yarn force-local-upload-deploy:android`**:
  
  * These scripts run the `deploy` Fastlane lane, forcing the use of local development settings (`FORCE_UPLOAD_LOCAL_DEV=true`).
  * This is useful for testing the deployment process locally or manually deploying builds using local secrets, potentially bypassing some CI checks. Use with caution.
  * They also clean build directories first.

* **`yarn force-local-upload-test` / `yarn force-local-upload-test:ios` / `yarn force-local-upload-test:android`**:
  
  * Similar to the `deploy` versions, but these run the `internal_test` Fastlane lane with `FORCE_UPLOAD_LOCAL_DEV=true`.
  * Useful for testing the internal distribution process locally.

* **`yarn bump-version:major|minor|patch`**:
  
  * Uses `npm version` to increment the version number in `package.json` according to semantic versioning rules (major, minor, or patch).
  * Automatically creates a version commit and tag.
  * Calls `sync-versions` afterwards.

* **`yarn sync-versions`**:
  
  * Executes Fastlane lanes (`bundle exec fastlane ios sync_version` and `bundle exec fastlane android sync_version`).
  * These lanes synchronize the `version` from `package.json` to the native project files (e.g., `Info.plist` for iOS, `build.gradle` for Android). This ensures consistency across the JS bundle and native app wrappers.

## Fastlane Structure (`Fastfile` & `helpers.rb`)

The core Fastlane logic resides in two files within the `app/fastlane/` directory:

* **`Fastfile`**: This Ruby file defines the main automation lanes for iOS and Android.
  
  * **Platforms:** It's organized by `platform :ios do ... end` and `platform :android do ... end`.
  * **Public Lanes:** These are the primary entry points for tasks:
    * `sync_version`: Updates native project version files (`Info.plist`, `build.gradle`) to match `package.json`. Called by `yarn sync-versions`.
    * `internal_test`: Prepares and uploads a build to internal testing tracks (TestFlight, Google Play Internal Testing). Called by `yarn ios:fastlane-debug`/`yarn android:fastlane-debug` and by the CI workflow for `dev` branch builds/PRs.
    * `deploy`: Prepares and uploads a build for production release (App Store, Google Play Production). Called by the CI workflow for `main` branch builds.
  * **Private Lanes:** These contain shared logic used by the public lanes:
    * `prepare_ios_build`: Handles common iOS build steps like dependency installation (CocoaPods), environment setup (API keys, certificates, profiles for local dev or CI), version checking/incrementing, and running the actual `build_app` action.
    * `upload_android_build`: Handles common Android build steps like environment setup (keystore, Play Store key for local dev or CI), version checking/incrementing, running the `gradle` build task, and uploading via `upload_to_play_store`.
  * **Environment Handling:** The `Fastfile` checks `ENV['CI']`, `ENV['ACT']`, and `ENV['FORCE_UPLOAD_LOCAL_DEV']` to adjust behavior for CI vs. local development environments (e.g., loading `.env.secrets`, setting up signing differently).

* **`helpers.rb`**: This Ruby module contains reusable helper functions called by the `Fastfile` to keep the lanes cleaner and encapsulate logic.
  
  * **Environment & Setup:** `verify_env_vars`, `should_upload_app`, `confirm_force_upload`, `ios_dev_setup_*` (certificate, profile, API key), `android_create_*` (keystore, Play Store key). These handle checking secrets, determining if an upload should happen, and setting up the necessary credentials, especially for local development.
  * **Versioning:** `ios_increment_build_number`, `android_increment_version_code`, `ios_verify_app_store_build_number`. These manage fetching the latest build numbers and incrementing/verifying them.
  * **Utilities:** `report_error`, `report_success`, `with_retry`. Standardized methods for logging and handling retries.

## GitHub Actions CI/CD (`mobile-deploy.yml`) - In Depth

The primary CI/CD workflow is defined in `.github/workflows/mobile-deploy.yml`. It automates the build and deployment process based on repository events.

* **Triggers:** The workflow is initiated by:
  
  * **Push Events:** Automatically runs when code is pushed to the `dev` or `main` branches, specifically if changes occur within the `app/` directory or the workflow file itself.
  * **Pull Request Events:** Automatically runs when a pull request is opened or updated that targets the `dev` or `main` branches, again checking for changes in `app/` or the workflow file.

* **Environment Variables (`env`):** Defines crucial variables used across jobs:
  
  * `IS_PR`: True if the trigger is a pull request.
  * `STAGING_BRANCH` / `MAIN_BRANCH`: Defines the names of key branches (`dev`, `main`).
  * Version variables (`NODE_VERSION`, `RUBY_VERSION`, etc.): Ensure consistent build environments.
  * Path variables (`WORKSPACE`, `APP_PATH`, certificate/key paths): Standardize file locations within the runner.
  * `ACT`: Set automatically by `act` when running locally, allowing steps to be skipped (e.g., code signing, uploads).

* **Permissions:** Grants necessary permissions (`contents: write`, `pull-requests: write`) for actions like checking out code and potentially committing version bumps (though this is currently disabled).

* **Jobs:** The workflow consists of parallel jobs for each platform:
  
  * **`build-ios` (runs on `macos-latest`)**
    
    1. **Checkout Code:** Gets the repository files.
    2. **Install Mobile Dependencies:** Uses the custom composite action `.github/actions/mobile-setup` to set up Node.js, Ruby (with Bundler for Fastlane), Yarn dependencies, and CocoaPods.
    3. **Verify Secrets:** Checks that required iOS secrets (like `IOS_CONNECT_API_KEY_BASE64`, `IOS_DIST_CERT_BASE64`, etc., stored as GitHub Actions Secrets) are present and have the correct basic format.
    4. **Decode Secrets:** Decodes the Base64 encoded secrets and writes them to the file paths specified in the `env` section (e.g., `${{ env.APP_PATH }}${{ env.IOS_DIST_CERT_PATH }}`).
    5. **Verify Certificate/Environment (CI Only):** Performs checks on the decoded certificate file (existence, permissions, size) and keychain access. Skipped if `env.ACT` is true.
    6. **Install Certificate (CI Only - Currently Disabled):** Imports the distribution certificate into a temporary keychain (`build.keychain`). Skipped if `env.ACT` is true. *Note: This step seems currently disabled in the YML.*
    7. **Install Provisioning Profile (CI Only):** Copies the decoded provisioning profile (`profile.mobileprovision`) into the standard system location (`~/Library/MobileDevice/Provisioning Profiles/`) so Xcode/Fastlane can find it. Skipped if `env.ACT` is true.
    8. **Run Fastlane:**
       * Navigates to the `app` directory.
       * Executes `bundle exec fastlane ios deploy --verbose` if the trigger was a push to the `main` branch.
       * Executes `bundle exec fastlane ios internal_test --verbose` for pushes to `dev` or pull requests.
       * The corresponding Fastlane lane (`deploy` or `internal_test`) handles the build (`build_app`) and upload (`upload_to_app_store` or `upload_to_testflight`) logic. Secrets needed by Fastlane are passed via environment variables (e.g., `IOS_CONNECT_ISSUER_ID`).
    9. **Versioning Steps (Currently Disabled):** Includes steps to get the version from `package.json` and commit/push the updated native project files after a build number increment. These appear disabled (`if: false`).
  
  * **`build-android` (runs on `ubuntu-latest`)**
    
    1. **Checkout Code:** Gets the repository files.
    2. **Install Mobile Dependencies:** Uses the `.github/actions/mobile-setup` action.
    3. **Setup Java/Android SDK/NDK:** Installs the required Java, Android SDK, and NDK versions using standard GitHub Actions (`actions/setup-java`, `android-actions/setup-android`) and `sdkmanager`. Includes retry logic for NDK installation.
    4. **Set Gradle JVM Options (Local `act` only):** Adds Gradle JVM arguments to `gradle.properties` if running via `act` to prevent potential memory issues.
    5. **Decode Secrets:** Decodes `ANDROID_KEYSTORE` and `ANDROID_PLAY_STORE_JSON_KEY_BASE64` secrets into their respective file paths.
    6. **Verify Secrets:** Checks the decoded keystore (using `keytool` with provided passwords/alias) and the Play Store JSON key.
    7. **Run Fastlane:**
       * Navigates to the `app` directory.
       * Executes `bundle exec fastlane android deploy --verbose` if the trigger was a push to the `main` branch.
       * Executes `bundle exec fastlane android internal_test --verbose` for pushes to `dev` or pull requests.
       * The corresponding Fastlane lane (`deploy` or `internal_test`) handles the Gradle build (`gradle task: "clean bundleRelease"`) and upload (`upload_to_play_store`) logic. Signing configuration is passed to Gradle via properties.
    8. **Versioning Steps (Currently Disabled):** Similar to iOS, includes disabled steps for committing version changes.

* **Deployment Summary:**
  
  * **Internal Testing:** Builds are automatically uploaded to TestFlight (iOS) and Google Play Internal Testing (Android) on every push to the `dev` branch and for pull requests targeting `dev` or `main`.
  * **Production:** Builds are automatically uploaded to the App Store (iOS, ready for submission) and Google Play Production track (Android) on every push to the `main` branch.

## Local Testing with `act`

You can test the GitHub Actions workflow locally using [`act`](https://github.com/nektos/act). This requires Docker to be installed and running.

1. **Install `act`:** Follow the installation instructions in the `act` repository.
2. **Run Jobs:** From the *root* of the project repository, you can execute specific jobs from the workflow file:
   * Test the Android build:
     
     ```bash
     act -j build-android
     ```
   * Test the iOS build:
     
     ```bash
     act -j build-ios
     ```
   * **Note:** Running jobs that require macOS-specific runners (like `build-ios` or anything involving code signing/TestFlight uploads) might have limitations or require specific configurations with `act`, especially if you are not on a macOS host. The `build-android` job is generally easier to test cross-platform. Consult the `act` documentation for advanced usage.
   * **Secrets:** `act` will prompt you for secrets unless you provide them via a secrets file (`-s KEY=VALUE` or `--secret-file`). For basic build tests that don't involve signing/uploading, you might be able to skip some secrets.
