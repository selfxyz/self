mkdir -p ark-circom-passport/passport
cp ../circuits/build/proof_of_passport_final.zkey ark-circom-passport/passport/
echo "copied proof_of_passport_final.zkey to ark-circom-passport"

ARCHITECTURE="aarch64-linux-android"

# Check for target support
check_target_support() {
    rustup target list | grep installed | grep -q "$1"
}

# check target is installed
if ! check_target_support $ARCHITECTURE; then
    rustup target add $ARCHITECTURE
else
    echo "Target $ARCHITECTURE already installed, skipping."
fi

cd android
./gradlew clean
./gradlew cargoBuild
cd ..

mkdir -p android/react-native-passport-reader/android/src/main/jniLibs/arm64-v8a/
  cp ark-circom-passport/target/aarch64-linux-android/release/libark_circom_passport.so android/react-native-passport-reader/android/src/main/jniLibs/arm64-v8a/
  echo copied release version of android lib to android/