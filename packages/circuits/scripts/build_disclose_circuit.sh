#!/bin/bash

source "scripts/download_ptau.sh"

build_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_TYPE=$2
    local POWEROFTAU=$3
    local START_TIME=$(date +%s)

    echo "compiling circuit: $CIRCUIT_NAME"
    mkdir -p build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/
    circom circuits/${CIRCUIT_TYPE}/${CIRCUIT_NAME}.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits/ --r1cs --O1 --wasm -c --output build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/

    echo "building zkey"
    yarn snarkjs groth16 setup build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs build/powersOfTau28_hez_final_${POWEROFTAU}.ptau build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey

    yarn snarkjs zkey contribute build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey -e="random text"
    yarn snarkjs zkey export verificationkey build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json
    
    echo "building vkey"
    yarn snarkjs zkey export solidityverifier build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    sed -i '' "s/Groth16Verifier/Verifier_${CIRCUIT_NAME}/g" build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    mkdir -p ../contracts/contracts/verifiers/local/${CIRCUIT_TYPE}/
    cp build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol ../contracts/contracts/verifiers/local/${CIRCUIT_TYPE}/Verifier_${CIRCUIT_NAME}.sol
    echo "copied Verifier_${CIRCUIT_NAME}.sol to contracts"

    echo "Build of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds"
    echo "Size of ${CIRCUIT_NAME}.r1cs: $(wc -c < build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs) bytes"
    echo "Size of ${CIRCUIT_NAME}.wasm: $(wc -c < build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm) bytes"
    echo "Size of ${CIRCUIT_NAME}_final.zkey: $(wc -c < build/${CIRCUIT_TYPE}/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey) bytes"
}

# Define circuits and their types
# name:folder:build_flag
# set build_flag to false if you want to skip the build
CIRCUITS=(
    "vc_and_disclose:disclose:20:true"
)

TOTAL_START_TIME=$(date +%s)
for circuit in "${CIRCUITS[@]}"; do
    IFS=':' read -r CIRCUIT_NAME CIRCUIT_TYPE POWEROFTAU BUILD_FLAG <<< "$circuit"
    if [ "$BUILD_FLAG" = "true" ]; then
        echo "Debug: Building circuit $CIRCUIT_NAME of type $CIRCUIT_TYPE"
        build_circuit "$CIRCUIT_NAME" "$CIRCUIT_TYPE" "$POWEROFTAU"
    else
        echo "Skipping build for $CIRCUIT_NAME"
    fi
done
echo "Total completed in $(($(date +%s) - TOTAL_START_TIME)) seconds"