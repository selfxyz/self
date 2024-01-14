#!/bin/bash

# Example usage:
# ./scripts/generate_arkzkey.sh multiplier2 multiplier2

# Assumes inside target directory

# Deal with errors
set -euo pipefail

# Check if arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <dir> <circuit-name>"
    exit 1
fi

DIR="$1"
CIRCUIT="$2"
ZKEY_PATH="${DIR}/target/${CIRCUIT}_final.zkey"
ARKZKEY_PATH="${DIR}/target/${CIRCUIT}_final.arkzkey"

# Check if ZKEY_PATH exists
if [ ! -f "$ZKEY_PATH" ]; then
    echo "Error: ZKEY_PATH does not exist at ${ZKEY_PATH}"
    exit 1
fi

# Check if arkzkey-util command exists
if ! command -v arkzkey-util &> /dev/null; then
    echo "Error: arkzkey-util command is not available."
    exit 1
fi

echo "Generate arkzkey file for ${CIRCUIT}..."
if [ ! -f "${ARKZKEY_PATH}" ]; then
    arkzkey-util ${ZKEY_PATH}
else
    echo "File ${ARKZKEY_PATH} already exists, skipping."
fi

echo "arkzkey file generation done, arkzkey file is in ${ARKZKEY_PATH}"