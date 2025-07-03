fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

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

# GitHub Actions Workflow

The mobile deployment pipeline is configured to run **manually only**. To trigger a deployment:

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. Select **Mobile App Deployments** from the workflows list
4. Click **Run workflow** button
5. Choose your platform (iOS, Android, or both)
6. Click **Run workflow**

**What happens when you deploy:**
- **iOS**: Uploads to App Store Connect and makes available in TestFlight for testing. You can manually release to the App Store later.
- **Android**: Uploads to Google Play Internal Testing. You can manually promote to production later.

**No automatic deployments!** You have full control over when builds are created and when they're released to production.

Before running these lanes or triggering the GitHub Actions workflow, bump the
project version with the `yarn bump-version:*` scripts and manually increment
the native build numbers in `ios` and `android`.

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
