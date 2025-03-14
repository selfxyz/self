# Fastlane Setup for Mobile Deployment

This directory contains the Fastlane configuration for automating the build and deployment process for both iOS and Android platforms.

## Prerequisites

- Ruby 3.0 or higher
- Bundler (`gem install bundler`)
- Fastlane (`bundle install`)

## GitHub Secrets Required

### iOS
- `APP_STORE_CONNECT_API_KEY`: The App Store Connect API key (base64 encoded)
- `APP_STORE_CONNECT_ISSUER_ID`: The issuer ID for the App Store Connect API key
- `APP_STORE_CONNECT_KEY_ID`: The key ID for the App Store Connect API key

### Android
- `ANDROID_KEYSTORE`: Base64 encoded Android keystore file
- `ANDROID_KEYSTORE_PASSWORD`: Password for the Android keystore
- `ANDROID_KEY_ALIAS`: Key alias for the Android signing key
- `ANDROID_KEY_PASSWORD`: Password for the Android signing key
- `PLAY_STORE_JSON_KEY`: Google Play Store service account JSON key (base64 encoded)

## Available Lanes

### iOS
```bash
bundle exec fastlane ios internal_test
```
This lane builds the iOS app and uploads it to TestFlight for internal testing.

### Android
```bash
bundle exec fastlane android internal_test
```
This lane builds the Android app and uploads it to Google Play Store for internal testing.

## Customization

Before using this setup, make sure to update the following:

1. In `Appfile`:
   - Update `app_identifier` with your iOS app bundle identifier
   - Update `apple_id` with your Apple developer email
   - Update `package_name` with your Android package name

2. In `Fastfile`:
   - Update iOS workspace and scheme names
   - Adjust any build settings as needed for your project

## Manual Testing

To test the lanes locally before pushing to GitHub:

1. Set up the required environment variables
2. Run the lanes manually using the commands above 