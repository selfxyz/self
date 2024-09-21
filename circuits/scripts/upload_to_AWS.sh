# Define environment variables
ENVIRONMENT="staging"
BUCKET_NAME="proofofpassport-us"

# Define the list of circuits
CIRCUITS=(
    "prove_rsa_65537_sha256"
    "prove_rsa_65537_sha1"
    "prove_rsapss_65537_sha256"
)

mkdir -p build/toAWS

for CIRCUIT_NAME in "${CIRCUITS[@]}"; do
    # Process zkey
    cp build/${CIRCUIT_NAME}_final.zkey build/toAWS/${CIRCUIT_NAME}.zkey
    # important to cd here so that the zkey is at the root of the zip
    cd build/toAWS
    zip ${CIRCUIT_NAME}.zkey.zip ${CIRCUIT_NAME}.zkey
    echo "✅ Copied and zipped ${CIRCUIT_NAME} zkey"
    # Upload zipped zkey to AWS S3
    aws s3 cp ${CIRCUIT_NAME}.zkey.zip s3://${BUCKET_NAME}/${ENVIRONMENT}/${CIRCUIT_NAME}.zkey.zip
    echo "✅ Uploaded ${CIRCUIT_NAME}.zkey.zip to S3"
    rm ${CIRCUIT_NAME}.zkey
    cd ../..

    # Process dat
    cp build/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.dat build/toAWS/${CIRCUIT_NAME}.dat
    # important to cd here so that the dat is at the root of the zip
    cd build/toAWS
    zip ${CIRCUIT_NAME}.dat.zip ${CIRCUIT_NAME}.dat
    echo "✅ Copied and zipped ${CIRCUIT_NAME} dat"
    # Upload zipped dat to AWS S3
    aws s3 cp ${CIRCUIT_NAME}.dat.zip s3://${BUCKET_NAME}/${ENVIRONMENT}/${CIRCUIT_NAME}.dat.zip
    echo "✅ Uploaded ${CIRCUIT_NAME}.dat.zip to S3"
    rm ${CIRCUIT_NAME}.dat
    cd ../..
done
