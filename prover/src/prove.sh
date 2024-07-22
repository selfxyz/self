#!/bin/bash
# Read input from stdin
input=$(cat)

# Compute the hash of the input data
hash=$(echo -n "$input" | sha256sum | cut -d ' ' -f 1)

# Create a unique directory for this input
mkdir -p /root/src/data/$hash

# Write input to the unique directory
echo "$input" > /root/src/data/$hash/input.json

# Define paths
input_path="/root/src/data/$hash/input.json"
witness_path="/root/src/data/$hash/witness.wtns"
proof_path="/root/src/data/$hash/proof.json"
public_path="/root/src/data/$hash/public.json"
circuit_wasm="/root/src/circuit/dsc_4096.wasm"
circuit_zkey="/root/src/circuit/dsc_4096_final.zkey"
prover_path="/root/rapidsnark/build/prover"

# Calculate the witness
NODE_OPTIONS='--max-old-space-size=644000' snarkjs wc "$circuit_wasm" "$input_path" "$witness_path" | tee /dev/stderr
status_jswitgen=$?
echo "✓ Finished witness generation with js! Status: ${status_jswitgen}"

# Check if witness generation was successful
if [ $status_jswitgen -ne 0 ]; then
    echo "Witness generation failed with status: ${status_jswitgen}"
    exit 1
fi

# Check if witness file exists
if [ ! -f "$witness_path" ]; then
    echo "Witness file not found: $witness_path"
    exit 1
fi

# Check if prover executable exists
if [ ! -f "$prover_path" ]; then
    echo "Prover executable not found: $prover_path"
    exit 1
fi

# Generate the proof using Rapidsnark
echo "ldd $prover_path"
ldd "$prover_path"
status_lld=$?
echo "✓ lld prover dependencies present! ${status_lld}"

echo "$prover_path $circuit_zkey $witness_path $proof_path $public_path"
"$prover_path" "$circuit_zkey" "$witness_path" "$proof_path" "$public_path" | tee /dev/stderr
status_prover=$?
echo "✓ Finished rapid proofgen! Status: ${status_prover}"

# Check if proof and public files exist
if [ ! -f "$proof_path" ]; then
    echo "Proof file not found: $proof_path"
    exit 1
fi

if [ ! -f "$public_path" ]; then
    echo "Public file not found: $public_path"
    exit 1
fi

# Output the result
cat "$proof_path"
cat "$public_path"

# Finally, delete the input and the witness
rm -f "$input_path" "$witness_path"

exit 0