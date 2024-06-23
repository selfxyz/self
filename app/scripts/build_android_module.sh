#!/bin/bash

source "scripts/common.sh"

cd witnesscalc
./build_gmp.sh android
make android
cd ..

cp ../circuits/build/register_sha256WithRSAEncryption_65537_cpp/register_sha256WithRSAEncryption_65537.dat android/app/src/main/res/raw/register_sha256WithRSAEncryption_65537.dat
cp witnesscalc/build_witnesscalc_android/src/libwitnesscalc_register_sha256WithRSAEncryption_65537.so android/app/src/main/cpp/lib/
cp witnesscalc/src/witnesscalc_register_sha256WithRSAEncryption_65537.h android/app/src/main/cpp/include/

cp ../circuits/build/disclose_cpp/disclose.dat android/app/src/main/res/raw/disclose.dat
cp witnesscalc/build_witnesscalc_android/src/libwitnesscalc_disclose.so android/app/src/main/cpp/lib/
cp witnesscalc/src/witnesscalc_disclose.h android/app/src/main/cpp/include/
