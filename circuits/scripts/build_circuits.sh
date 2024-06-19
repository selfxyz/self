#!/bin/bash

source "scripts/download_ptau.sh"

build_circuit() {
    local CIRCUIT_NAME=$1
    local START_TIME=$(date +%s)

    echo "compiling circuit: $CIRCUIT_NAME"
    circom circuits/${CIRCUIT_NAME}.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build

    echo "building zkey"
    yarn snarkjs groth16 setup build/${CIRCUIT_NAME}.r1cs build/powersOfTau28_hez_final_20.ptau build/${CIRCUIT_NAME}.zkey

    echo "building vkey"
    yarn snarkjs zkey contribute build/${CIRCUIT_NAME}.zkey build/${CIRCUIT_NAME}_final.zkey -e="random text"
    yarn snarkjs zkey export verificationkey build/${CIRCUIT_NAME}_final.zkey build/${CIRCUIT_NAME}_vkey.json

    yarn snarkjs zkey export solidityverifier build/${CIRCUIT_NAME}_final.zkey build/Verifier_${CIRCUIT_NAME}.sol
    sed -i '' "s/Groth16Verifier/Verifier_${CIRCUIT_NAME}/g" build/Verifier_${CIRCUIT_NAME}.sol
    cp build/Verifier_${CIRCUIT_NAME}.sol ../contracts/contracts/Verifier_${CIRCUIT_NAME}.sol
    echo "copied Verifier_${CIRCUIT_NAME}.sol to contracts"

    echo "Build of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds"
    echo "Size of ${CIRCUIT_NAME}.r1cs: $(wc -c <build/${CIRCUIT_NAME}.r1cs) bytes"
    echo "Size of ${CIRCUIT_NAME}.wasm: $(wc -c <build/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm) bytes"
    echo "Size of ${CIRCUIT_NAME}_final.zkey: $(wc -c <build/${CIRCUIT_NAME}_final.zkey) bytes"
}

declare -a CIRCUITS=("register_sha256WithRSAEncryption_65537" "register_sha1WithRSAEncryption_65537" "disclose")

TOTAL_START_TIME=$(date +%s)
for CIRCUIT_NAME in "${CIRCUITS[@]}"; do
    build_circuit "$CIRCUIT_NAME"
done
echo "Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds"