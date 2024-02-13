# Proof of Passport App

### Requirements

Install `nodejs v18`, [circom](https://docs.circom.io/) and [snarkjs](https://github.com/iden3/snarkjs)

For android, install java, android studio and the android sdk

For ios, install Xcode and [cocoapods](https://cocoapods.org/)

### Installation

```bash
yarn
```

In `/common`, also run:
```bash
yarn
```

### Build the app

Go to the `circuit` folder of the monorepo and build the circuit.

#### Build the android native module

Run:
```
./scripts/build_android_module.sh
```

You might need to set the rust-toolchain rust version as global default. Example:
```
rustup default 1.67.0
```

For macOs users you might also need to set-up the path to sdk:
in /app/android create local.properties

Add the following line:
sdk.dir=/Users/<user>/Library/Android/sdk or any relevant path to your sdk

This you modify the circuits, you might have to modify `ark-circom-passport/src/passport.rs` too.

#### Build the iOS native module

Run:
```
./scripts/build_ios_module.sh
```

Now:
```
cd ios
pod install
./post_install.sh
cd ..
```

#### Run the server

To run the server, first connect your phone to your computer, allow access, then:
```
yarn start
```
Then press `a` for android or `i` for iOS

If you want to see the logs and have a better ios developer experience, open `/ios` in Xcode and launch the app from there instead.

> :warning: Due to the current limitations of mopro, see [#51](https://github.com/zk-passport/proof-of-passport/issues/51), the proving on iOS only works when the app is run on Xcode. It will not work with the react native server or in a .ipa build. We are working on fixing that.

To see the android logs you'll have to use the Android Studio Logcat.

To export an apk:
```
cd android
./gradlew assembleRelease
```
The built apk it located at `android/app/build/outputs/apk/release/app-release.apk`

#### Download zkey
If you want to mint a proof of passport SBT, instead of building the circuit yourself, run:
```
./scripts/download_current_zkey.sh
```

This will download the zkey currently deployed onchain in the proof of passport contract and place it in `circuits/build``
Then, build the android or iOS native module and run the app.
