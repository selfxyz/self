#!/bin/bash

# Record the start time
TOTAL_START_TIME=$(date +%s)

mkdir -p build
cd build
if [ ! -f powersOfTau28_hez_final_22.ptau ]; then
    echo -e "\033[34mDownload power of tau....\033[0m"
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_22.ptau
    echo -e "\033[32mFinished download!\033[0m"
else 
    echo -e "\033[90mPowers of tau file already downloaded\033[0m"
fi
cd ..

build_circuit() {
    local CIRCUIT_NAME=$1
    local START_TIME=$(date +%s)

    echo -e "\033[34mcompiling circuit: $CIRCUIT_NAME\033[0m"
    mkdir -p ./build/dsc/${CIRCUIT_NAME}/
    circom circuits/dsc/instances/${CIRCUIT_NAME}.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build/dsc/${CIRCUIT_NAME}/

    echo -e "\033[34mbuilding zkey\033[0m"
    NODE_OPTIONS="--max-old-space-size=8192" yarn snarkjs groth16 setup build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs build/powersOfTau28_hez_final_22.ptau build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey

    if command -v openssl &> /dev/null
    then
        RAND_STR=$(openssl rand -hex 64)
    else
        RAND_STR="random text"
    fi

    echo -e "\033[34mbuilding vkey\033[0m"
    echo $RAND_STR | yarn snarkjs zkey contribute build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}.zkey build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey
    yarn snarkjs zkey export verificationkey build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_vkey.json

    yarn snarkjs zkey export solidityverifier build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey build/dsc/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    sed -i '' "s/Groth16Verifier/Verifier_${CIRCUIT_NAME}/g" build/dsc/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol
    cp build/dsc/${CIRCUIT_NAME}/Verifier_${CIRCUIT_NAME}.sol ../contracts/contracts/verifiers/dsc/Verifier_${CIRCUIT_NAME}.sol
    echo -e "\033[34mcopied Verifier_${CIRCUIT_NAME}.sol to contracts\033[0m"

    echo -e "\033[32mBuild of $CIRCUIT_NAME completed in $(($(date +%s) - START_TIME)) seconds\033[0m"

    echo "file sizes:"
    echo -e "\033[34mSize of ${CIRCUIT_NAME}.r1cs: $(wc -c <build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}.r1cs) bytes\033[0m"
    echo -e "\033[34mSize of ${CIRCUIT_NAME}.wasm: $(wc -c <build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm) bytes\033[0m"
    echo -e "\033[34mSize of ${CIRCUIT_NAME}_final.zkey: $(wc -c <build/dsc/${CIRCUIT_NAME}/${CIRCUIT_NAME}_final.zkey) bytes\033[0m"
}

# Define circuits and their deployment flags
# name:deploy_flag
CIRCUITS=(
    "dsc_rsapss_sha256_65537_4096:true"
    "dsc_rsa_sha256_65537_4096:true"
    "dsc_rsa_sha1_65537_4096:true"
)

for circuit in "${CIRCUITS[@]}"; do
    IFS=':' read -r CIRCUIT_NAME DEPLOY_FLAG <<< "$circuit"
    if [ "$DEPLOY_FLAG" = "true" ]; then
        echo -e "\033[34mBuilding circuit $CIRCUIT_NAME\033[0m"
        build_circuit "$CIRCUIT_NAME"
    else
        echo -e "\033[90mSkipping build for $CIRCUIT_NAME\033[0m"
    fi
done

echo -e "\033[32mTotal build completed in $(($(date +%s) - TOTAL_START_TIME)) seconds\033[0m"