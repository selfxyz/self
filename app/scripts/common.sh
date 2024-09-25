#!/bin/bash

# Function to copy and modify a circuit file
modify_circuit_file() {
    local file=$1
    cp ../circuits/build/${file}_cpp/${file}.cpp witnesscalc/src
    cp ../circuits/build/${file}_cpp/${file}.dat witnesscalc/src

    cd witnesscalc/src

    # Add namespace to the circuit file
    last_include=$(grep -n '#include' ${file}.cpp | tail -1 | cut -d: -f1)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i "" "${last_include}a\\
namespace CIRCUIT_NAME {" ${file}.cpp
    else
        # Linux
        sed -i "${last_include}a \\nnamespace CIRCUIT_NAME {" ${file}.cpp
    fi
    echo "}" >> ${file}.cpp

    cd ../..
}

# Array of circuit files
declare -a CIRCUITS=("prove_rsa_65537_sha256" "prove_rsa_65537_sha1" "prove_rsapss_65537_sha256")

# Main execution
for circuit in "${CIRCUITS[@]}"; do
    modify_circuit_file "$circuit"
done

# Initialize and update git submodules
git submodule init
git submodule update