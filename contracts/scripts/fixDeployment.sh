#!/bin/bash

if [ -f .env ]; then
    source .env
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Create directories if they don't exist
mkdir -p "$PROJECT_ROOT/ignition/deployments/prod"

# Source and destination directories
SOURCE_DIR="$PROJECT_ROOT/ignition/deployments/chain-42220"
DEST_DIR="$PROJECT_ROOT/ignition/deployments/prod"

# Copy all files from chain-42220 to prod
cp -r "$SOURCE_DIR"/* "$DEST_DIR/"

# Get deployed addresses
DEPLOYED_ADDRESSES="$SOURCE_DIR/deployed_addresses.json"
README_FILE="$PROJECT_ROOT/README.md"

if [ ! -f "$DEPLOYED_ADDRESSES" ]; then
    echo "Error: $DEPLOYED_ADDRESSES not found"
    exit 1
fi

README_FILE="$PROJECT_ROOT/README.md"
START_MARKER="<!-- DEPLOYED_ADDRESSES_START -->"
END_MARKER="<!-- DEPLOYED_ADDRESSES_END -->"

TMP_FILE=$(mktemp)

sed -n "1,/${START_MARKER}/p" "$README_FILE" > "$TMP_FILE"

echo -e "\n## Deployed Addresses\n" >> "$TMP_FILE"
echo "| Contract | Address |" >> "$TMP_FILE"
echo "| -------- | ------- |" >> "$TMP_FILE"

# READMEにも同様に#以降のコントラクト名とアドレスを表示
jq -r 'to_entries | .[] | "| \(.key | split("#")[1]) | `\(.value)` |"' "$DEPLOYED_ADDRESSES" >> "$TMP_FILE"

echo -e "\n" >> "$TMP_FILE"

sed -n "/${END_MARKER}/,\$p" "$README_FILE" >> "$TMP_FILE"

mv "$TMP_FILE" "$README_FILE"

echo "Contract addresses have been updated in deployedAddresses directory and README.md"
