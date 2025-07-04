fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Quick Start

**🚀 To deploy a mobile build, use these yarn commands:**

```sh
yarn mobile-deploy              # Deploy to both iOS and Android
yarn mobile-deploy:ios          # Deploy to iOS TestFlight only
yarn mobile-deploy:android      # Deploy to Android Internal Testing only
```

These commands will show you a confirmation dialog with deployment details before proceeding.

# Deployment

## ✅ Preferred Method: Yarn Commands

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

## Direct Fastlane Commands (Not Recommended)

⚠️ **Use the confirmation script above instead of these direct commands.**

# Available Actions

## iOS

### ios sync_version

```sh
[bundle exec] fastlane ios sync_version
```

Sync ios version

### ios internal_test

```sh
[bundle exec] fastlane ios internal_test
```

Push a new build to TestFlight Internal Testing

### ios deploy

```sh
[bundle exec] fastlane ios deploy
```

Prepare a new build for App Store submission

----


## Android

### android sync_version

```sh
[bundle exec] fastlane android sync_version
```

Sync android version

### android internal_test

```sh
[bundle exec] fastlane android internal_test
```

Push a new build to Google Play Internal Testing

### android deploy

```sh
[bundle exec] fastlane android deploy
```

Push a new build to Google Play Store

----

# Deployment Status

After deployment, you can check the status:

- **GitHub Runner:** Check [GitHub Actions](https://github.com/YOUR_ORG/YOUR_REPO/actions) for build progress
- **Local Fastlane:** Check the terminal output and app store dashboards directly
- **iOS:** Check [App Store Connect](https://appstoreconnect.apple.com) for TestFlight builds
- **Android:** Check [Google Play Console](https://play.google.com/console) for Internal Testing builds

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
