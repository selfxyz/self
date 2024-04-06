# Proof of Passport App

## Requirements

Install `nodejs v18`, [circom](https://docs.circom.io/) and [snarkjs](https://github.com/iden3/snarkjs)

For Android, install Java, Android Studio and the Android SDK

For iOS, install Xcode and [cocoapods](https://cocoapods.org/)

## Installation

```bash
yarn
```

In `/common`, also run:
```bash
yarn
```

## Run the app

Let's run the app with the currently deployed zkey to mint the Proof of Passport SBT.

First, connect your phone to your computer and allow access.

### Android

Launch the react-native server:
```
yarn start
```

Press `a` to open the app on Android.

To see the Android logs you'll have to use the Android Studio Logcat.

### iOS

To run the app on iOS, you will need an Apple Developer account. Free accounts can't run apps that use NFC reading.

Open the ios project on Xcode and add your provisionning profile in Targets > ProofOfPassport > Signing and Capabilities

Then, run the app in Xcode.

## Modify the circuits

If you want to modify the circuits, you'll have to adapt a few things.

First, go to the `circuit` folder of the monorepo, modify the circuits and build them.

Then, upload the zkey and the arkzkey built at a publicly available url and replace the two urls in `common/src/constants/constants.ts`

Adapt the inputs you pass in `app/src/utils/prover.ts`.

### Android

Build the android native module:
```
./scripts/build_android_module.sh
```

You might need to set the rust-toolchain rust version as global default. Example:
```
rustup default 1.67.0
```

For macOS users you might also need to set-up the path to sdk:
in `/app/android` create `local.properties`

Add the following line:
`sdk.dir=/Users/<user>/Library/Android/sdk` or any relevant path to your sdk

### iOS

Run:
```
export DEVELOPMENT_TEAM="<your-development-team-id>"
./scripts/build_ios_module.sh
```

## Export a new release

### Android

#### Export as apk

```
cd android
./gradlew assembleRelease
```
The built apk it located at `android/app/build/outputs/apk/release/app-release.apk`

#### Publish on the Play Store
As explained [here](https://reactnative.dev/docs/signed-apk-android), first setup `android/app/my-upload-key.keystore` and the private vars in `~/.gradle/gradle.properties`, then run:
```
npx react-native build-android --mode=release
```
This builds `android/app/build/outputs/bundle/release/app-release.aab`.

Then to test the release on an android phone, delete the previous version of the app and run:
```
yarn android --mode release
```

### iOS

In Xcode, go to `Product>Archive` then follow the flow.

## FAQ

If you get something like this:
```
'std::__1::system_error: open: /proof-of-passport/app: Operation not permitted'
```
You might want to try [this](https://stackoverflow.com/questions/49443341/watchman-crawl-failed-retrying-once-with-node-crawler):
```
watchman watch-del-all
watchman shutdown-server
```