#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$SCRIPT_DIR/../../.."

# Source directories for prod and local
PROD_SOURCE_DIR="$ROOT_DIR/contracts/ignition/deployments/prod"
LOCAL_SOURCE_DIR="$ROOT_DIR/contracts/artifacts/contracts/verifiers/local"
DEST_DIR="$SCRIPT_DIR/../deployments"

ABI_DEST_DIR="$SCRIPT_DIR/../src/abi"
SOURCE_REGISTRY="$ROOT_DIR/contracts/artifacts/contracts/registry/IdentityRegistryImplV1.sol/IdentityRegistryImplV1.json"
SOURCE_VERIFYALL="$ROOT_DIR/contracts/artifacts/contracts/sdk/VerifyAll.sol/VerifyAll.json"

CONTRACT_ADDRESSES_FILE="$SCRIPT_DIR/../src/constants/contractAddresses.ts"

echo "Source directory: $PROD_SOURCE_DIR"
echo "Destination directory: $DEST_DIR"
echo "ABI directory: $ABI_DEST_DIR"

mkdir -p "$DEST_DIR/prod"
mkdir -p "$DEST_DIR/local"
mkdir -p "$ABI_DEST_DIR"s

# Copy prod artifacts
if [ -d "$PROD_SOURCE_DIR/artifacts" ]; then
    cp -r "$PROD_SOURCE_DIR/artifacts/"* "$DEST_DIR/prod/"
    cp "$PROD_SOURCE_DIR/deployed_addresses.json" "$DEST_DIR/prod/"
    echo "Copied prod deployment files to $DEST_DIR/prod"

    REGISTRY_ADDRESS=$(jq -r '."DeployRegistryModule#IdentityRegistry"' "$PROD_SOURCE_DIR/deployed_addresses.json")
    VERIFYALL_ADDRESS=$(jq -r '."DeployVerifyAll#VerifyAll"' "$PROD_SOURCE_DIR/deployed_addresses.json")

    echo "Found Registry address: $REGISTRY_ADDRESS"
    echo "Found VerifyAll address: $VERIFYALL_ADDRESS"

    mkdir -p "$(dirname "$CONTRACT_ADDRESSES_FILE")"
    echo "export const REGISTRY_ADDRESS = '$REGISTRY_ADDRESS';" > "$CONTRACT_ADDRESSES_FILE"
    echo "export const VERIFYALL_ADDRESS = '$VERIFYALL_ADDRESS';" >> "$CONTRACT_ADDRESSES_FILE"
    echo "Updated contract addresses in: $CONTRACT_ADDRESSES_FILE"
else
    echo "Warning: Prod artifacts directory does not exist: $PROD_SOURCE_DIR/artifacts"
fi

# Copy local artifacts
if [ -d "$LOCAL_SOURCE_DIR" ]; then
    # Copy all verifier artifacts from local directories (dsc, register, disclose)
    for dir in "$LOCAL_SOURCE_DIR"/*; do
        if [ -d "$dir" ]; then
            category=$(basename "$dir")
            mkdir -p "$DEST_DIR/local/$category"
            find "$dir" -name "*.json" -exec cp {} "$DEST_DIR/local/$category/" \;
        fi
    done
    echo "Copied local deployment files to $DEST_DIR/local"
else
    echo "Warning: Local artifacts directory does not exist: $LOCAL_SOURCE_DIR"
fi

if [ -f "$SOURCE_REGISTRY" ]; then
    ABI_JSON_REGISTRY=$(jq '.abi' "$SOURCE_REGISTRY")
    OUTPUT_REGISTRY="export const registryAbi = ${ABI_JSON_REGISTRY};"
    echo "$OUTPUT_REGISTRY" > "$ABI_DEST_DIR/IdentityRegistryImplV1.ts"
    echo "Written ABI for IdentityRegistryImplV1 to: $ABI_DEST_DIR/IdentityRegistryImplV1.ts"
else
    echo "Warning: Source JSON file does not exist: $SOURCE_REGISTRY"
fi

if [ -f "$SOURCE_VERIFYALL" ]; then
    ABI_JSON_VERIFYALL=$(jq '.abi' "$SOURCE_VERIFYALL")
    OUTPUT_VERIFYALL="export const verifyAllAbi = ${ABI_JSON_VERIFYALL};"
    echo "$OUTPUT_VERIFYALL" > "$ABI_DEST_DIR/VerifyAll.ts"
    echo "Written ABI for VerifyAll to: $ABI_DEST_DIR/VerifyAll.ts"
else
    echo "Warning: Source JSON file does not exist: $SOURCE_VERIFYALL"
fi

echo "Deployment files have been copied to $DEST_DIR"
echo "ABI files have been generated in $ABI_DEST_DIR"