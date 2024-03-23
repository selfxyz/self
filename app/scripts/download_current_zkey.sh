#!/bin/bash

mkdir -p ../circuits/build
cd ../circuits/build
if [ -f "proof_of_passport_final.zkey" ]; then
    echo "found old proof_of_passport_final.zkey, deleting it"
    rm "proof_of_passport_final.zkey"
fi
echo "downloading proof_of_passport_final.zkey to /circuits/build/"
wget https://current-pop-zkey.s3.eu-north-1.amazonaws.com/proof_of_passport_final_merkle_and_age.arkzkey
mv proof_of_passport_final_merkle_and_age.arkzkey proof_of_passport_final.arkzkey
