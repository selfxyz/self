#!/bin/bash
# File: circuits/scripts/upload_to_AWS.sh

# Define environment variables
ENVIRONMENT="staging"
BUCKET_NAME="proofofpassport-us"

# Define the list of circuits
CIRCUITS=(
    # "prove_rsa_65537_sha256"
    # "prove_rsa_65537_sha1"
    # "prove_rsapss_65537_sha256"
    "prove_ecdsa_secp256r1_sha256"
    "prove_ecdsa_secp256r1_sha1"
)

mkdir -p build/toAWS

# (Optional) Set AWS CLI configurations via environment variables
# export AWS_MAX_CONCURRENT_REQUESTS=10
# export AWS_S3_MULTIPART_THRESHOLD=1GB
# export AWS_S3_MULTIPART_CHUNKSIZE=1GB
# export AWS_S3_USE_ACCELERATE_ENDPOINT=true
# export AWS_S3_PREFERRED_TRANSFER_CLIENT=crt
# export AWS_S3_TARGET_BANDWIDTH=100GB/s

for CIRCUIT_NAME in "${CIRCUITS[@]}"; do
    # # Process zkey
    # cp build/${CIRCUIT_NAME}_final.zkey build/toAWS/${CIRCUIT_NAME}.zkey
    # # Important to cd here so that the zkey is at the root of the zip
    # cd build/toAWS
    # zip ${CIRCUIT_NAME}.zkey.zip ${CIRCUIT_NAME}.zkey
    # echo "✅ Copied and zipped ${CIRCUIT_NAME} zkey"

    # # Upload zipped zkey to AWS S3
    # aws s3 cp ${CIRCUIT_NAME}.zkey.zip s3://${BUCKET_NAME}/${ENVIRONMENT}/${CIRCUIT_NAME}.zkey.zip \
    #     --cli-read-timeout 0 \
    #     --cli-connect-timeout 0 \
    #     --debug
    # echo "✅ Uploaded ${CIRCUIT_NAME}.zkey.zip to S3"
    # rm ${CIRCUIT_NAME}.zkey
    # cd ../..

    # Process dat
    cp build/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.dat build/toAWS/${CIRCUIT_NAME}.dat
    # Important to cd here so that the dat is at the root of the zip
    cd build/toAWS
    zip ${CIRCUIT_NAME}.dat.zip ${CIRCUIT_NAME}.dat
    echo "✅ Copied and zipped ${CIRCUIT_NAME} dat"

    # Upload zipped dat to AWS S3
    aws s3 cp ${CIRCUIT_NAME}.dat.zip s3://${BUCKET_NAME}/${ENVIRONMENT}/${CIRCUIT_NAME}.dat.zip 
        # --debug
    echo "✅ Uploaded ${CIRCUIT_NAME}.dat.zip to S3"
    rm ${CIRCUIT_NAME}.dat
    cd ../..
done