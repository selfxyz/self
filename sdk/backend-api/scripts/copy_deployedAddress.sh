#!/bin/bash
set -e

SOURCE_DEPLOYMENTS="../../contracts/ignition/deployments"

TARGET_ADDRESSES="./src/addresses"

mkdir -p "$TARGET_ADDRESSES"

for chain_dir in "$SOURCE_DEPLOYMENTS"/chain-*; do
    if [ -d "$chain_dir" ]; then
        if [ -f "$chain_dir/deployed_addresses.json" ]; then
            chain_name=$(basename "$chain_dir")
            cp "$chain_dir/deployed_addresses.json" "$TARGET_ADDRESSES/${chain_name}_deployed_addresses.json"
            echo "Copied: ${chain_name}/deployed_addresses.json -> ${TARGET_ADDRESSES}/${chain_name}_deployed_addresses.json"
        else
            echo "Warning: No deployed_addresses.json found in ${chain_dir}"
        fi
    fi
done

echo "All deployed addresses copied successfully."
