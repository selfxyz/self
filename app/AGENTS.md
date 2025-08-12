# AGENTS Instructions

## Prerequisites

- Node.js 22.x (`nvm use`), Yarn via Corepack (`corepack enable && corepack prepare yarn@stable --activate`)
- macOS/iOS:
  - Xcode and Command Line Tools, CocoaPods (Ruby installed)
  - From `app/ios`: `bundle install && bundle exec pod install` or from `app`: `npx pod-install`
- Android:
  - Android SDK + Emulator, ANDROID_HOME configured, JDK 17 (set JAVA_HOME)
- Helpful: Watchman (macOS), `yarn install` at repo root

## Recommended Workflow

```bash
# Fix formatting and linting issues
yarn nice

# Lint source files
yarn lint

# Check types
yarn types

# Run tests
yarn test
```

## Running the App

- `yarn ios` – run on the iOS simulator
  - One-time setup (from repo root):
    • `cd ios && bundle install && bundle exec pod install && cd ..`
    • (or) `npx pod-install`
  - Ensure Xcode Command-Line Tools are installed

- `yarn android` – run on the Android emulator
  - One-time setup:
    • Install JDK 17
    • Ensure ANDROID_HOME is set and `$ANDROID_HOME/emulator` is on your PATH
    • Start an Android emulator or connect a device

- `yarn web` – start the web version
