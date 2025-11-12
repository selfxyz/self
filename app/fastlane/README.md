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

Sync ios version (DEPRECATED)

### ios internal_test

```sh
[bundle exec] fastlane ios internal_test
```

Push a new build to TestFlight Internal Testing

### ios deploy_auto

```sh
[bundle exec] fastlane ios deploy_auto
```

Deploy iOS app with automatic version management

----


## Android

### android sync_version

```sh
[bundle exec] fastlane android sync_version
```

Sync android version (DEPRECATED)

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

### android build_only

```sh
[bundle exec] fastlane android build_only
```

Build Android app without uploading

### android deploy_auto

```sh
[bundle exec] fastlane android deploy_auto
```

Deploy Android app with automatic version management

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
