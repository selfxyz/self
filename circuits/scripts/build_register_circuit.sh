#!/bin/bash

# Record the start time
START_TIME=$(date +%s)

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
circom circuits/register_sha256WithRSAEncryption_65537.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build

echo "building zkey"
yarn snarkjs groth16 setup build/register_sha256WithRSAEncryption_65537.r1cs build/powersOfTau28_hez_final_20.ptau build/register_sha256WithRSAEncryption_65537.zkey

if command -v openssl &> /dev/null
then
    RAND_STR=$(openssl rand -hex 64)
else
    RAND_STR="random text"
fi

echo "building vkey"
echo $RAND_STR | yarn snarkjs zkey contribute build/register_sha256WithRSAEncryption_65537.zkey build/register_sha256WithRSAEncryption_65537_final.zkey
yarn snarkjs zkey export verificationkey build/register_sha256WithRSAEncryption_65537_final.zkey build/register_sha256WithRSAEncryption_65537_vkey.json

yarn snarkjs zkey export solidityverifier build/register_sha256WithRSAEncryption_65537_final.zkey build/Verifier_register_sha256WithRSAEncryption_65537.sol
sed -i '' 's/Groth16Verifier/Verifier_register_sha256WithRSAEncryption_65537/g' build/Verifier_register_sha256WithRSAEncryption_65537.sol
cp build/Verifier_register_sha256WithRSAEncryption_65537.sol ../contracts/contracts/Verifier_register_sha256WithRSAEncryption_65537.sol
echo "copied Verifier_register_sha256WithRSAEncryption_65537.sol to contracts"

echo "Build completed in $(($(date +%s) - $START_TIME)) seconds"

echo "file sizes:"
echo "Size of register_sha256WithRSAEncryption_65537.r1cs: $(wc -c <build/register_sha256WithRSAEncryption_65537.r1cs) bytes"
echo "Size of register_sha256WithRSAEncryption_65537.wasm: $(wc -c <build/register_sha256WithRSAEncryption_65537_js/register_sha256WithRSAEncryption_65537.wasm) bytes"
echo "Size of register_sha256WithRSAEncryption_65537_final.zkey: $(wc -c <build/register_sha256WithRSAEncryption_65537_final.zkey) bytes"