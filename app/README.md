# Proof of Passport App

Only Android right now, under heavy development

#### Requirements

Install `nodejs v18`

#### Installation

```bash
yarn
```

In `/common`, also run:
```bash
yarn
```

#### Add circuit build

Go to the `circuit` folder of the monorepo and build the circuit.

#### Build on Android

In `/script`, run:
```
./build_rust.sh
```
This will build the `libhalo2_circom_passport.so` lib and copy it to the desired place to be used by the app.
The config used is in `android/react-native-passport-reader/android/build.gradle`.
You can go there to change the profile (`debug` or `release`)

You might need to set the rust-toolchain rust version as global default. Example:
```
rustup default 1.67.0
```
And install the targets like this:
```
rustup target add aarch64-linux-android
```

To run the server, first connect your phone to your computer, allow access, then:
```
yarn start
```
Then press `a` for android or `i` for iOS

To export an apk:
```
cd android
./gradlew assembleRelease
```
The built apk it located at `android/app/build/outputs/apk/release/app-release.apk`

#### Build on iOS

The iOS app uses [mopro](https://github.com/oskarth/mopro), which is under development.
It does not provide a pod/cli right now, so we will pull it and build it. Make sure you have space on your disk.

Go to [our fork](https://github.com/0xturboblitz/mopro) of mopro and follow the build instructions.
Once you have built `mopro/mopro-ffi/target/${ARCHITECTURE}/${LIB_DIR}/libmopro_ffi.a` copy it here to `app/ios/MoproKit/Libs`

Now:
```
cd ios
pod install
./post_install.sh
```



