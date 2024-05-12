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

Then, install pods:
```
cd ios
pod install
```

And run the app in Xcode.

## Modify the circuits

If you want to modify the circuits, you'll have to adapt a few things.

First, go to the `circuit` folder of the monorepo, modify the circuits and build them.

Then, upload the zipped zkeys built at publicly available urls and replace the urls in `app/src/utils/zkeyDownload.ts`. Be sure the zkey is named `<circuit_name>.zkey` before you zip it, and the zip is then named `<circuit_name>.zkey.zip`.

Adapt the inputs you pass in `app/src/utils/prover.ts`, and adapt and redeploy the contracts.

Run the common init script:
```
./scripts/common.sh
```

### Android

Find your android ndk path. It should be something like `/Users/<your-user-name>/Library/Android/sdk/ndk/23.1.7779620`
Build the android native module:
```
export ANDROID_NDK="<your-android-ndk-path>"
./scripts/build_android_module.sh
```

### iOS

Find your [development team id](https://chat.openai.com/share/9d52c37f-d9da-4a62-acb9-9e4ee8179f95) and run:
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

Don't forget to bump `versionCode` in `android/app/build.gradle`.

### iOS

In Xcode, go to `Product>Archive` then follow the flow.

Don't forget to bump the build number.

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