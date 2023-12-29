cd ../android

./gradlew clean
./gradlew cargoBuild

cd ..

mkdir -p android/react-native-passport-reader/android/src/main/jniLibs/arm64/
  cp ark-circom-passport/target/aarch64-linux-android/release/libark_circom_passport.so android/react-native-passport-reader/android/src/main/jniLibs/arm64/
  echo copied release version