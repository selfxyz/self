#!/bin/bash
set -e

SOURCE_DIR="../../circuits/build"
TARGET_DIR="./src/circuits"
TARGET_ZKEY="$TARGET_DIR/zkey"
TARGET_VKEY="$TARGET_DIR/vkey"
TARGET_WASM="$TARGET_DIR/wasm"

mkdir -p "$TARGET_ZKEY" "$TARGET_VKEY" "$TARGET_WASM"

echo "Copying final.zkey files from $SOURCE_DIR to $TARGET_ZKEY..."
find "$SOURCE_DIR" -type f -name "*final.zkey" -exec cp {} "$TARGET_ZKEY" \;

echo "Copying vkey.json files from $SOURCE_DIR to $TARGET_VKEY..."
find "$SOURCE_DIR" -type f -name "*vkey.json" -exec cp {} "$TARGET_VKEY" \;

echo "Copying .wasm files from $SOURCE_DIR to $TARGET_WASM..."
find "$SOURCE_DIR" -type f -name "*.wasm" -exec cp {} "$TARGET_WASM" \;

echo "All circuit files copied successfully."
