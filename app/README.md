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
Then, place `passport.r1cs` and `passport.wasm` in `ark-circom-passport/passport/`

#### Build native lib

In `/script`, run:
```
./build_rust.sh
```
This will build the `libhalo2_circom_passport.so` lib and copy it to the desired place to be used by the app.
The config used is in `android/react-native-passport-reader/android/build.gradle`.
You can go there to change the profile (`debug` or `release`)


You'll potentially need to set the rust-toolchain rust version as global default. Example:
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
