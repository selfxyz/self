#!/bin/sh

# Define the AWS URL prefix
awsUrl="https://d8o9bercqupgk.cloudfront.net/staging"

# Define environment variables
ENVIRONMENT="staging"
BUCKET_NAME="proofofpassport-us"

# Define the circuit names, download flags, and circuit types
circuits="prove_rsa_65537_sha256:prove_rsa_65537_sha256 prove_rsa_65537_sha1:prove_rsa_65537_sha1 prove_rsapss_65537_sha256:prove_rsapss_65537_sha256"
flags="true true true"
circuit_types="prove prove prove"

# Create the download directory
mkdir -p build/fromAWS

# Function to download, unzip, and compile a circuit
download_and_compile_circuit() {
    circuit_info=$1
    should_download=$2
    circuit_type=$3

    circuit_name=$(echo $circuit_info | cut -d':' -f1)
    circuit_url=$(echo $circuit_info | cut -d':' -f2)
    url="${awsUrl}/${circuit_url}.zkey.zip"

    if [ "$should_download" = "true" ]; then
        echo "Downloading $circuit_name..."
        aws s3 cp s3://${BUCKET_NAME}/${ENVIRONMENT}/${circuit_name}.zkey.zip build/fromAWS/${circuit_name}.zkey.zip --no-sign-request
        if [ $? -eq 0 ]; then
            echo "Unzipping $circuit_name..."
            unzip -q -o build/fromAWS/${circuit_name}.zkey.zip -d build/fromAWS
            rm build/fromAWS/${circuit_name}.zkey.zip
            echo "Successfully downloaded and unzipped $circuit_name"

            echo "Compiling circuit: $circuit_name"
            circom circuits/${circuit_type}/instances/${circuit_name}.circom \
                -l node_modules \
                -l ./node_modules/@zk-kit/binary-merkle-root.circom/src \
                -l ./node_modules/circomlib/circuits \
                --O1 --wasm \
                --output build/fromAWS

            echo "Exporting vkey: $circuit_name"
            snarkjs zkey export verificationkey build/fromAWS/${circuit_name}.zkey build/fromAWS/${circuit_name}_vkey.json

            if [ $? -eq 0 ]; then
                echo "Successfully compiled $circuit_name"
                # Keep only the wasm file and remove other generated files
                mv build/fromAWS/${circuit_name}_js/${circuit_name}.wasm build/fromAWS/
                rm -rf build/fromAWS/${circuit_name}_js
                rm -f build/fromAWS/${circuit_name}.r1cs
                rm -f build/fromAWS/${circuit_name}.sym
            else
                echo "Failed to compile $circuit_name"
            fi

        else
            echo "Failed to download $circuit_name"
        fi
    else
        echo "Skipping download and compilation for $circuit_name"
    fi
}

# Download, unzip, and compile each circuit
i=1
for circuit in $circuits; do
    flag=$(echo $flags | cut -d' ' -f$i)
    circuit_type=$(echo $circuit_types | cut -d' ' -f$i)
    download_and_compile_circuit $circuit $flag $circuit_type
    i=$((i+1))
done

echo "All circuits processed"