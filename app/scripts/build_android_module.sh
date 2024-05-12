#!/bin/bash

cd witnesscalc
./build_gmp.sh android
make android
cd ..

cp ../circuits/build/proof_of_passport_cpp/proof_of_passport.dat android/app/src/main/res/raw/proof_of_passport.dat
cp witnesscalc/build_witnesscalc_android/src/libwitnesscalc_proof_of_passport.so android/app/src/main/cpp/lib/