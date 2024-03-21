#!/bin/bash

DEVICE_TYPE="arm64"
BUILD_MODE="release"

# Determine the architecture and folder based on device type
case $DEVICE_TYPE in
    "x86_64")
        ARCHITECTURE="x86_64-linux-android"
        FOLDER="x86_64"
        ;;
    "x86")
        ARCHITECTURE="i686-linux-android"
        FOLDER="x86"
        ;;
    "arm")
        ARCHITECTURE="armv7-linux-androideabi"
        FOLDER="armeabi-v7a"
        ;;
    "arm64")
        ARCHITECTURE="aarch64-linux-android"
        FOLDER="arm64-v8a"
        ;;
    *)
        echo -e "${RED}Error: Invalid device type specified in config: $DEVICE_TYPE${DEFAULT}"
        exit 1
        ;;
esac

# Determine the library directory and build command based on build mode
case $BUILD_MODE in
    "debug")
        LIB_DIR="debug"
        COMMAND=""
        ;;
    "release")
        LIB_DIR="release"
        COMMAND="--release"
        ;;
    *)
        echo -e "${RED}Error: Invalid build mode specified in config: $BUILD_MODE${DEFAULT}"
        exit 1
        ;;
esac

PROJECT_DIR=$(pwd)

cd ${PROJECT_DIR}/mopro-ffi

echo "[android] Install cargo-ndk"
cargo install cargo-ndk

# Print appropriate message based on device type
echo "Using $ARCHITECTURE libmopro_ffi.a ($LIB_DIR) static library..."
print_warning "This only works on $FOLDER devices!"

echo "[android] Build target in $BUILD_MODE mode"
cargo ndk -t ${ARCHITECTURE} build --lib ${COMMAND} 

echo "[android] Copy files in mopro-android/Example/jniLibs/"
for binary in ${PROJECT_DIR}/mopro-ffi/target/*/*/libmopro_ffi.so; do file $binary; done

mkdir -p jniLibs/${FOLDER}/ && \
cp ${PROJECT_DIR}/mopro-ffi/target/${ARCHITECTURE}/${LIB_DIR}/libmopro_ffi.so jniLibs/${FOLDER}/libuniffi_mopro.so

echo "[android] Generating Kotlin bindings in $BUILD_MODE mode..."
cargo run --features=uniffi/cli ${COMMAND} \
--bin uniffi-bindgen \
generate src/mopro.udl \
--language kotlin

echo "[android] Copy Kotlin bindings to android app"
cp -r ${PROJECT_DIR}/mopro-ffi/jniLibs/ ${PROJECT_DIR}/android/app/src/main/jniLibs/
cp -r ${PROJECT_DIR}/mopro-ffi/src/uniffi/ ${PROJECT_DIR}/android/app/src/main/java/uniffi/