#!/bin/sh
# Define environment variables
DESTINATION_DIR="build/fromAWS"
CONTRACTS_BASE_DIR="../contracts/contracts/verifiers"
# Create the destination directories if they don't exist
echo "Creating destination directories..."
mkdir -p ${DESTINATION_DIR}
mkdir -p "${CONTRACTS_BASE_DIR}/register"
mkdir -p "${CONTRACTS_BASE_DIR}/dsc"
mkdir -p "${CONTRACTS_BASE_DIR}/disclose"
# List of circuit names
CIRCUIT_NAMES=(
    # From RegisterVerifierId order
    "register_sha256_sha256_sha256_rsa_65537_4096"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
    "register_sha256_sha256_sha256_ecdsa_secp256r1"
    "register_sha256_sha256_sha256_ecdsa_secp384r1"
    "register_sha256_sha256_sha256_rsa_3_4096"
    "register_sha256_sha256_sha256_rsapss_3_32_2048"
    "register_sha256_sha256_sha256_rsapss_65537_32_2048"
    "register_sha256_sha256_sha256_rsapss_65537_32_3072"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
    "register_sha384_sha384_sha384_ecdsa_secp384r1"
    "register_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
    "register_sha512_sha512_sha512_rsa_65537_4096"
    "register_sha512_sha512_sha512_rsapss_65537_64_2048"
    "register_sha1_sha1_sha1_rsa_65537_4096"
    "register_sha1_sha256_sha256_rsa_65537_4096"
    "register_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
    "register_sha256_sha224_sha224_ecdsa_secp224r1"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
    "register_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
    "register_sha384_sha384_sha384_rsapss_65537_48_2048"
    "register_sha1_sha1_sha1_ecdsa_secp256r1"
    "register_sha256_sha256_sha256_rsapss_65537_64_2048"
    "register_sha512_sha512_sha256_rsa_65537_4096"
    "register_sha512_sha512_sha512_ecdsa_secp521r1"
    # From DscVerifierId order
    "dsc_sha1_ecdsa_brainpoolP256r1"
    "dsc_sha1_rsa_65537_4096"
    "dsc_sha256_ecdsa_brainpoolP256r1"
    "dsc_sha256_ecdsa_brainpoolP384r1"
    "dsc_sha256_ecdsa_secp256r1"
    "dsc_sha256_ecdsa_secp384r1"
    "dsc_sha256_rsa_65537_4096"
    "dsc_sha256_rsapss_3_32_3072"
    "dsc_sha256_rsapss_65537_32_3072"
    "dsc_sha256_rsapss_65537_32_4096"
    "dsc_sha384_ecdsa_brainpoolP384r1"
    "dsc_sha384_ecdsa_brainpoolP512r1"
    "dsc_sha384_ecdsa_secp384r1"
    "dsc_sha512_ecdsa_brainpoolP512r1"
    "dsc_sha512_rsa_65537_4096"
    "dsc_sha512_rsapss_65537_64_4096"
    "dsc_sha1_ecdsa_secp256r1"
    "dsc_sha256_ecdsa_secp521r1"
    "dsc_sha512_ecdsa_secp521r1"
    # Additional circuit not in the enums
    "vc_and_disclose"
)
# Download function
download_files() {
    local circuit_name=$1
    local circuit_dir="${DESTINATION_DIR}/${circuit_name}"
    # Determine contracts directory based on prefix
    local contracts_dir
    if [[ ${circuit_name} == "register"* ]]; then
        contracts_dir="${CONTRACTS_BASE_DIR}/register"
    elif [[ ${circuit_name} == "dsc"* ]]; then
        contracts_dir="${CONTRACTS_BASE_DIR}/dsc"
    elif [[ ${circuit_name} == "vc_and_disclose"* ]]; then
        contracts_dir="${CONTRACTS_BASE_DIR}/disclose"
    else
        echo "Unknown circuit type: ${circuit_name}"
        exit 1
    fi
    # Create circuit-specific directory in build/fromAWS
    mkdir -p "${circuit_dir}"
    # Download Verifier.sol and copy to both locations
    echo "Downloading ${circuit_name} Verifier.sol..."
    curl -s "https://self-protocol.s3.eu-west-1.amazonaws.com/verifiers/Verifier_${circuit_name}.sol" \
        --output "${circuit_dir}/Verifier_${circuit_name}.sol"
    cp "${circuit_dir}/Verifier_${circuit_name}.sol" "${contracts_dir}/"
    # Download zkey
    # echo "Downloading ${circuit_name} zkey..."
    # curl -s "https://self-protocol.s3.eu-west-1.amazonaws.com/all_zkeys/${circuit_name}_0000.zkey" \
    #     --output "${circuit_dir}/${circuit_name}_0000.zkey"
}
# Process each circuit
for circuit_name in "${CIRCUIT_NAMES[@]}"; do
    echo "Processing ${circuit_name}..."
    download_files "${circuit_name}"
    # Check if files were downloaded successfully
    if [ -f "${DESTINATION_DIR}/${circuit_name}/Verifier_${circuit_name}.sol" ]
        # s&& [ -f "${DESTINATION_DIR}/${circuit_name}/${circuit_name}_0000.zkey" ];
    then
        echo "Successfully downloaded files for ${circuit_name}"
    else
        echo "Failed to download some files for ${circuit_name}"
        exit 1
    fi
done
echo "All downloads completed successfully"