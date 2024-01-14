#!/bin/bash

# Example usage:
# ./scripts/trusted_setup.sh multiplier2 08 multiplier2

# Deal with errors
set -euo pipefail

# Change this is if you keep your Powers of Tau files elsewhere
PTAU_DIR="ptau"

# Check if arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <dir> <ptau> <circuit-name>"
    exit 1
fi

DIR="$1"
PTAU="$2"
CIRCUIT="$3"
PTAU_PATH="${PTAU_DIR}/powersOfTau28_hez_final_${PTAU}.ptau"

# Phase 1 - Perpetual Powers of Tau
# From https://github.com/iden3/snarkjs

if [ ! -f "$PTAU_PATH" ]; then
    echo "Downloading Powers of Tau file..."
    wget -P $PTAU_DIR https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU}.ptau
else
    echo "File $PTAU_PATH already exists, skipping download."
fi

# Phase 2 - Circuit specific setup
# Toy example, not for production use
# For a real deployment with Groth16 use a tool like p0tion for phase 2 trusted setup
# See https://github.com/privacy-scaling-explorations/p0tion

echo "Generate zkey file for ${CIRCUIT}..."
if [ ! -f "${DIR}/target/${CIRCUIT}_final.zkey" ]; then
    snarkjs groth16 setup ${DIR}/target/${CIRCUIT}.r1cs ${PTAU_PATH} ${DIR}/target/${CIRCUIT}_0000.zkey
    snarkjs zkey contribute ${DIR}/target/${CIRCUIT}_0000.zkey ${DIR}/target/${CIRCUIT}_final.zkey \
      --name="Demo contribution" -e="0xdeadbeef"
else
    echo "File ${DIR}/target/${CIRCUIT}_final.zkey already exists, skipping."
fi

echo "Trusted setup done, zkey file is in ${DIR}/target/${CIRCUIT}_final.zkey"