CIRCUIT_NAME="prove_rsa_65537_sha1"

mkdir -p build/s3bucket

cp build/${CIRCUIT_NAME}_final.zkey build/s3bucket/${CIRCUIT_NAME}.zkey
# important to cd here so that the zkey is at the root of the zip
cd build/s3bucket
zip ${CIRCUIT_NAME}.zkey.zip ${CIRCUIT_NAME}.zkey
echo "✅ Copied and zipped ${CIRCUIT_NAME} circuit"
