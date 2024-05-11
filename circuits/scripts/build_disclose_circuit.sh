#!/bin/bash

# Record the start time
START_TIME=$(date +%s)

# Check if the first argument is "app-only"
if [ "$1" == "app-only" ]; then
    echo "Building only for the app"
    APP_ONLY=1
else
    APP_ONLY=0
fi

mkdir -p build
cd build    
if [ ! -f powersOfTau28_hez_final_20.ptau ]; then
    echo "Download power of tau...."
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau
    echo "Finished download!"
else 
    echo "Powers of tau file already downloaded... Skip download action!"
fi
cd ..

echo "compiling circuit"
circom circuits/disclose.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build

echo "building zkey"
yarn snarkjs groth16 setup build/disclose.r1cs build/powersOfTau28_hez_final_20.ptau build/disclose.zkey

if command -v openssl &> /dev/null
then
    RAND_STR=$(openssl rand -hex 64)
else
    RAND_STR="random text"
fi

echo "building vkey"
echo $RAND_STR | yarn snarkjs zkey contribute build/disclose.zkey build/disclose_final.zkey
yarn snarkjs zkey export verificationkey build/disclose_final.zkey build/disclose_vkey.json

yarn snarkjs zkey export solidityVerifier build/disclose_final.zkey build/Verifier_disclose.sol
sed -i '' 's/Groth16Verifier/Verifier_disclose/g' build/Verifier_disclose.sol
cp build/Verifier_disclose.sol ../contracts/contracts/Verifier_disclose.sol

echo "copied Verifier_disclose.sol to contracts"

# Install arkzkey-util binary in ark-zkey
cd ../app/ark-zkey
echo "[ark-zkey] Installing arkzkey-util..."
if ! command -v arkzkey-util &> /dev/null
then
    cargo install --bin arkzkey-util --path .
else
    echo "arkzkey-util already installed, skipping."
fi

cd ../../circuits/build
arkzkey-util disclose_final.zkey
echo "Arkzkey generated"
cd ..

# Calculate and print the time taken by the whole script
END_TIME=$(date +%s)
ELAPSED_TIME=$(($END_TIME - $START_TIME))
echo "Build completed in $ELAPSED_TIME seconds"

echo "file sizes:"
echo "Size of disclose.r1cs: $(wc -c <build/disclose.r1cs) bytes"
echo "Size of disclose.wasm: $(wc -c <build/disclose_js/disclose.wasm) bytes"
echo "Size of disclose_final.zkey: $(wc -c <build/disclose_final.zkey) bytes"
echo "Size of disclose_final.arkzkey: $(wc -c <build/disclose_final.arkzkey) bytes"