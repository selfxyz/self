#!/bin/bash
# Read input from stdin
input=$(cat)

# Compute the hash of the input data
hash=$(echo -n "$input" | sha256sum | cut -d ' ' -f 1)

# Create a unique directory for this input
mkdir -p /root/src/data/$hash

# Write input to the unique directory
echo "$input" > /root/src/data/$hash/input.json

# Run snarkjs command
snarkjs groth16 fullprove /root/src/data/$hash/input.json /root/src/circuit/dsc_4096.wasm /root/src/circuit/dsc_4096_final.zkey /root/src/data/$hash/proof.json /root/src/data/$hash/public.json

# Output the result
cat /root/src/data/$hash/proof.json
cat /root/src/data/$hash/public.json
# Finally, delete the inputs
rm -r /root/src/data/$hash/input.json

