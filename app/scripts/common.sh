#!/bin/bash

cp ../circuits/build/register_sha256WithRSAEncryption_65537_cpp/register_sha256WithRSAEncryption_65537.cpp witnesscalc/src
cp ../circuits/build/register_sha256WithRSAEncryption_65537_cpp/register_sha256WithRSAEncryption_65537.dat witnesscalc/src
cp ../circuits/build/disclose_cpp/disclose.cpp witnesscalc/src
cp ../circuits/build/disclose_cpp/disclose.dat witnesscalc/src

cd witnesscalc/src

# This adds the namespace to the circuit file as described in the README
last_include=$(grep -n '#include' register_sha256WithRSAEncryption_65537.cpp | tail -1 | cut -d: -f1)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires an empty string with the -i flag and handles backslashes differently
  sed -i "" "${last_include}a\\
namespace CIRCUIT_NAME {" register_sha256WithRSAEncryption_65537.cpp
else
  # Linux
  sed -i "${last_include}a \\nnamespace CIRCUIT_NAME {" register_sha256WithRSAEncryption_65537.cpp
fi
echo "}" >> register_sha256WithRSAEncryption_65537.cpp

# This adds the namespace to the circuit file as described in the README
last_include=$(grep -n '#include' disclose.cpp | tail -1 | cut -d: -f1)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires an empty string with the -i flag and handles backslashes differently
  sed -i "" "${last_include}a\\
namespace CIRCUIT_NAME {" disclose.cpp
else
  # Linux
  sed -i "${last_include}a \\nnamespace CIRCUIT_NAME {" disclose.cpp
fi
echo "}" >> disclose.cpp

cd ../..
git submodule init
git submodule update