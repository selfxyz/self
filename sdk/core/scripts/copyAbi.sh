#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

DEST_DIR="$SCRIPT_DIR/../src/abi"
mkdir -p "$DEST_DIR"

SOURCE_REGISTRY="$SCRIPT_DIR/../../../contracts/artifacts/contracts/registry/IdentityRegistryImplV1.sol/IdentityRegistryImplV1.json"
SOURCE_VERIFYALL="$SCRIPT_DIR/../../../contracts/artifacts/contracts/sdk/VerifyAll.sol/VerifyAll.json"
SOURCE_HUB_V2="$SCRIPT_DIR/../../../contracts/artifacts/contracts/IdentityVerificationHubImplV2.sol/IdentityVerificationHubImplV2.json"

if [ ! -f "$SOURCE_REGISTRY" ]; then
  echo "Source JSON file does not exist: $SOURCE_REGISTRY"
  exit 1
fi

if [ ! -f "$SOURCE_VERIFYALL" ]; then
  echo "Source JSON file does not exist: $SOURCE_VERIFYALL"
  exit 1
fi

if [ ! -f "$SOURCE_HUB_V2" ]; then
  echo "Source JSON file does not exist: $SOURCE_HUB_V2"
  exit 1
fi

ABI_JSON_REGISTRY=$(jq '.abi' "$SOURCE_REGISTRY")
ABI_JSON_VERIFYALL=$(jq '.abi' "$SOURCE_VERIFYALL")
ABI_JSON_HUB_V2=$(jq '.abi' "$SOURCE_HUB_V2")

OUTPUT_REGISTRY="export const registryAbi = ${ABI_JSON_REGISTRY};"
OUTPUT_VERIFYALL="export const verifyAllAbi = ${ABI_JSON_VERIFYALL};"
OUTPUT_HUB_V2="export const hubV2Abi = ${ABI_JSON_HUB_V2};"

DEST_REGISTRY_TS="$DEST_DIR/IdentityRegistryImplV1.ts"
DEST_VERIFYALL_TS="$DEST_DIR/VerifyAll.ts"
DEST_HUB_V2_TS="$DEST_DIR/IdentityVerificationHubImplV2.ts"

echo "$OUTPUT_REGISTRY" > "$DEST_REGISTRY_TS"
echo "Written ABI for IdentityRegistryImplV1 to: $DEST_REGISTRY_TS"

echo "$OUTPUT_VERIFYALL" > "$DEST_VERIFYALL_TS"
echo "Written ABI for VerifyAll to: $DEST_VERIFYALL_TS"

echo "$OUTPUT_HUB_V2" > "$DEST_HUB_V2_TS"
echo "Written ABI for IdentityVerificationHubImplV2 to: $DEST_HUB_V2_TS"

echo "ABI files copied and written successfully."
