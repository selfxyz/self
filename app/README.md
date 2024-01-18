# Proof of Passport App

### Requirements

Install `nodejs v18`, [circom](https://docs.circom.io/) and [snarkjs](https://github.com/iden3/snarkjs)
For android, install java and the android sdk
For ios, install [cocoapods](https://cocoapods.org/)

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

#### Run the app

To run the server, first connect your phone to your computer, allow access, then:
```
yarn start
```
Then press `a` for android or `i` for iOS

If you want to see the logs and have a better ios developer exprience, open `/ios` in Xcode and launch the app from there instead
To see the android logs you'll have to use the Android Studio Logcat

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