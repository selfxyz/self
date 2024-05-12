#!/bin/bash

source common.sh

cd app/witnesscalc
./build_gmp.sh android
make android
cd ..

cp ../circuits/build/proof_of_passport_cpp/proof_of_passport.dat android/app/src/main/res/raw/proof_of_passport.dat