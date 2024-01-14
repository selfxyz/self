#!/bin/bash

# Example usage:
# ./scripts/compile.sh multiplier2 multiplier2.circom

# Deal with errors
set -euo pipefail

# Check if arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <directory> <circom-circuit>"
    exit 1
fi

DIR="$1"
CIRCUIT="$2"

mkdir -p ${DIR}/target
circom ./${DIR}/${CIRCUIT} --r1cs --wasm --sym --output ./${DIR}/target