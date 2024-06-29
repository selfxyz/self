#!/bin/bash

source "scripts/common.sh"

cd witnesscalc
./build_gmp.sh android
make android
cd ..

# Copy artifacts for each circuit
for circuit in "${CIRCUITS[@]}"; do
    cp ../circuits/build/${circuit}_cpp/${circuit}.dat android/app/src/main/res/raw/${circuit}.dat
    cp witnesscalc/build_witnesscalc_android/src/libwitnesscalc_${circuit}.so android/app/src/main/cpp/lib/
    cp witnesscalc/src/witnesscalc_${circuit}.h android/app/src/main/cpp/include/
done

echo "copied artifacts to android directory"
