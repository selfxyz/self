#!/bin/bash

source "scripts/download_ptau.sh"
echo "compiling circuit rsapss_verifier"
circom circuits/tests/utils/rsapss_verifier.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build
