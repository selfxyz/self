REGISTER_CIRCUIT_NAME="register_sha256WithRSAEncryption_65537_csca2"
DISCLOSE_CIRCUIT_NAME="disclose3"

mkdir -p build/s3bucket

cp build/register_sha256WithRSAEncryption_65537_final.zkey build/s3bucket/register_sha256WithRSAEncryption_65537.zkey
zip build/s3bucket/${REGISTER_CIRCUIT_NAME}.zkey.zip build/s3bucket/register_sha256WithRSAEncryption_65537.zkey
echo "✅ Copied and zipped ${REGISTER_CIRCUIT_NAME} circuit"

cp build/disclose_final.zkey build/s3bucket/disclose.zkey
zip build/s3bucket/${DISCLOSE_CIRCUIT_NAME}.zkey.zip build/s3bucket/disclose.zkey

echo "✅ Copied and zipped ${DISCLOSE_CIRCUIT_NAME} circuit"

