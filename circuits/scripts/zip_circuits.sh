CIRCUIT_NAME="register_rsa_65537_sha1"

mkdir -p build/toAWS

cp build/${CIRCUIT_NAME}_final.zkey build/toAWS/${CIRCUIT_NAME}.zkey
# important to cd here so that the zkey is at the root of the zip
cd build/toAWS
zip ${CIRCUIT_NAME}.zkey.zip ${CIRCUIT_NAME}.zkey
echo "✅ Copied and zipped ${CIRCUIT_NAME} zkey"
rm  ${CIRCUIT_NAME}.zkey

cd ../..
cp build/${CIRCUIT_NAME}_cpp/${CIRCUIT_NAME}.dat build/toAWS/${CIRCUIT_NAME}.dat
# important to cd here so that the zkey is at the root of the zip
cd build/toAWS
zip ${CIRCUIT_NAME}.dat.zip ${CIRCUIT_NAME}.dat
echo "✅ Copied and zipped ${CIRCUIT_NAME} dat"
rm ${CIRCUIT_NAME}.dat
