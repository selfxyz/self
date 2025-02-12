#!/bin/bash

SRC_DIR="../../contracts/artifacts"
DEST_DIR="./src/abi"

mkdir -p "$DEST_DIR"

find "$SRC_DIR" -type f -name "*.json" ! -name "*.dbg.json" -exec cp {} "$DEST_DIR" \;

echo "Copied ABI files to $DEST_DIR"
