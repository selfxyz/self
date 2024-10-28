#!/bin/bash
# Read input from stdin
input=$(cat)

# Extract the signature_algorithm
signature_algorithm=$(echo "$input" | jq -r '.signature_algorithm // "rsa_65537_sha256_4096"')

# Set the circuit files based on the signature_algorithm
if [ "$signature_algorithm" == "rsa_65537_sha1_4096" ]; then
    circuit_wasm="/root/src/circuit/dsc_rsa_65537_sha1_4096.wasm"
    circuit_zkey="/root/src/circuit/dsc_rsa_65537_sha1_4096_final.zkey"
elif [ "$signature_algorithm" == "rsa_65537_sha256_4096" ]; then
    circuit_wasm="/root/src/circuit/dsc_rsa_65537_sha256_4096.wasm"
    circuit_zkey="/root/src/circuit/dsc_rsa_65537_sha256_4096_final.zkey"
elif [ "$signature_algorithm" == "rsapss_65537_sha256_4096" ]; then
    circuit_wasm="/root/src/circuit/dsc_rsapss_65537_sha256_4096.wasm"
    circuit_zkey="/root/src/circuit/dsc_rsapss_65537_sha256_4096_final.zkey"
else
    echo "Invalid signature algorithm: $signature_algorithm"
    exit 1
fi

# echo the size of the circuit wasm file and the circuit zkey file
echo "Circuit WASM size: $(du -sh $circuit_wasm)"
echo "Circuit ZKEY size: $(du -sh $circuit_zkey)"

# Compute the hash of the input data
hash=$(echo -n "$input" | sha256sum | cut -d ' ' -f 1)

# Create a unique directory for this input
mkdir -p /root/src/data/$hash

# Write input to the unique directory
echo "$input" > /root/src/data/$hash/input.json

# Extract only the 'inputs' part of the JSON for the circuit
jq '.inputs' /root/src/data/$hash/input.json > /root/src/data/$hash/circuit_input.json

# Define paths
input_path="/root/src/data/$hash/circuit_input.json"
witness_path="/root/src/data/$hash/witness.wtns"
proof_path="/root/src/data/$hash/proof.json"
public_path="/root/src/data/$hash/public.json"
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
echo "✓ ldd prover dependencies present! ${status_lld}"

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