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

#### Add google-services.json

You need to download mlkit from firebase when building the app for text recognition.
This requires to download from firebase google-services.json file and save it at app/android/android-passport-reader/app/google-services.json
You have to follow Steps 1 to 3 from firebase documentation :https://firebase.google.com/docs/android/setup

# Step 1: Create a Firebase project

Before you can add Firebase to your Android app, you need to create a Firebase project to connect to your Android app. Visit Understand Firebase Projects to learn more about Firebase projects.

# Step 2: Register your app with Firebase

Go to the Firebase console.

In the center of the project overview page, click the Android icon (plat_android) or Add app to launch the setup workflow.

Enter your app's package name in the Android package name field, here it's **example.jllarraz.com.passportreader**

Click Register app

# Step 3: Add a Firebase configuration file

Download and then add the Firebase Android configuration file (google-services.json) to **app/android/android-passport-reader/app/google-services.json**

#### Build native lib

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

#### Run the server

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
