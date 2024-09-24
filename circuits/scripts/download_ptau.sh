#!/bin/bash

mkdir -p build
cd build

if [ ! -f powersOfTau28_hez_final_20.ptau ]; then
    echo "Download power of tau 20...."
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau
    echo "Finished download!"
else 
    echo "Powers of tau 20 file already downloaded... Skip download action!"
fi

if [ ! -f powersOfTau28_hez_final_22.ptau ]; then
    echo "Download power of tau 22...."
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_22.ptau
    echo "Finished download!"
else 
    echo "Powers of tau 22 file already downloaded... Skip download action!"
fi

cd ..