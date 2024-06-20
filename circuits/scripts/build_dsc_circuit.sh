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
circom circuits/tests/certificates/dsc_4096.circom -l node_modules -l ./node_modules/@zk-kit/binary-merkle-root.circom/src -l ./node_modules/circomlib/circuits --r1cs --O1 --wasm -c --output build

echo "building zkey"
yarn snarkjs groth16 setup build/dsc_4096.r1cs build/powersOfTau28_hez_final_22.ptau build/dsc_4096.zkey

if command -v openssl &> /dev/null
then
    RAND_STR=$(openssl rand -hex 64)
else
    RAND_STR="random text"
fi

echo "building vkey"
echo $RAND_STR | yarn snarkjs zkey contribute build/dsc_4096.zkey build/dsc_4096_final.zkey
yarn snarkjs zkey export verificationkey build/dsc_4096_final.zkey build/dsc_4096_vkey.json

yarn snarkjs zkey export solidityverifier build/dsc_4096_final.zkey build/Verifier_dsc_4096.sol
sed -i '' 's/Groth16Verifier/Verifier_dsc_4096/g' build/Verifier_dsc_4096.sol
cp build/Verifier_dsc_4096.sol ../contracts/contracts/Verifier_dsc_4096.sol
echo "copied Verifier_dsc_4096.sol to contracts"

echo "Build completed in $(($(date +%s) - $START_TIME)) seconds"

echo "file sizes:"
echo "Size of dsc_4096.r1cs: $(wc -c <build/dsc_4096.r1cs) bytes"
echo "Size of dsc_4096.wasm: $(wc -c <build/dsc_4096_js/dsc_4096.wasm) bytes"
echo "Size of dsc_4096_final.zkey: $(wc -c <build/dsc_4096_final.zkey) bytes"