#!/bin/bash

cp ../circuits/build/proof_of_passport_cpp/proof_of_passport.cpp witnesscalc/src
cp ../circuits/build/proof_of_passport_cpp/proof_of_passport.dat witnesscalc/src

cd witnesscalc/src

# This adds the namespace to the circuit file as described in the README
last_include=$(grep -n '#include' proof_of_passport.cpp | tail -1 | cut -d: -f1)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires an empty string with the -i flag and handles backslashes differently
  sed -i "" "${last_include}a\\
namespace CIRCUIT_NAME {" proof_of_passport.cpp
else
  # Linux
  sed -i "${last_include}a \\nnamespace CIRCUIT_NAME {" proof_of_passport.cpp
fi
echo "}" >> proof_of_passport.cpp

cd ../..
git submodule init
git submodule update