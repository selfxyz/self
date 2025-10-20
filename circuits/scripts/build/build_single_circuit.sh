#!/bin/bash

# Build a single circuit by name

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <circuit_name>"
    echo "Example: $0 register_sha256_sha224_sha224_ecdsa_secp224r1"
    exit 1
fi

CIRCUIT_NAME="$1"

# Function to extract circuit type from circuit name
extract_circuit_type() {
    local name="$1"

    # Special cases first
    if [[ "$name" == "register_aadhaar" ]]; then
        echo "register_aadhaar"
        return
    fi

    if [[ "$name" =~ ^vc_and_disclose ]]; then
        echo "vc_and_disclose"
        return
    fi

    # For other patterns, extract based on underscores
    if [[ "$name" =~ ^register_id_ ]]; then
        echo "register_id"
        return
    fi

    if [[ "$name" =~ ^register_ ]]; then
        echo "register"
        return
    fi

    if [[ "$name" =~ ^dsc_ ]]; then
        echo "dsc"
        return
    fi

    # If no pattern matches, return empty
    echo ""
}

REGISTER_CIRCUITS=(
    "register_sha1_sha1_sha1_rsa_64321_4096"
    "register_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
    "register_sha1_sha1_sha1_ecdsa_secp256r1"
    "register_sha256_sha1_sha1_rsa_65537_4096"
    "register_sha1_sha1_sha1_rsa_65537_4096"
    "register_sha1_sha256_sha256_rsa_65537_4096"
    "register_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
    "register_sha256_sha224_sha224_ecdsa_secp224r1"
    "register_sha256_sha256_sha224_ecdsa_secp224r1"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
    "register_sha256_sha256_sha256_ecdsa_secp256r1"
    "register_sha256_sha256_sha256_ecdsa_secp384r1"
    "register_sha256_sha256_sha256_rsa_3_4096"
    "register_sha256_sha256_sha256_rsa_65537_4096"
    "register_sha256_sha256_sha256_rsapss_3_32_2048"
    "register_sha256_sha256_sha256_rsapss_65537_32_2048"
    "register_sha256_sha256_sha256_rsapss_65537_32_3072"
    "register_sha256_sha256_sha256_rsapss_65537_32_4096"
    "register_sha256_sha256_sha256_rsapss_65537_64_2048"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
    "register_sha384_sha384_sha384_ecdsa_secp384r1"
    "register_sha512_sha512_sha256_rsapss_65537_32_2048"
    "register_sha384_sha384_sha384_rsapss_65537_48_2048"
    "register_sha512_sha512_sha256_rsa_65537_4096"
    "register_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
    "register_sha512_sha512_sha512_rsa_65537_4096"
    "register_sha512_sha512_sha512_rsapss_65537_64_2048"
    "register_sha512_sha512_sha512_ecdsa_secp521r1"
)

REGISTER_ID_CIRCUITS=(
    "register_id_sha1_sha1_sha1_ecdsa_brainpoolP224r1"
    "register_id_sha1_sha1_sha1_ecdsa_secp256r1"
    "register_id_sha1_sha1_sha1_rsa_65537_4096"
    "register_id_sha1_sha256_sha256_rsa_65537_4096"
    "register_id_sha224_sha224_sha224_ecdsa_brainpoolP224r1"
    "register_id_sha256_sha224_sha224_ecdsa_secp224r1"
    "register_id_sha256_sha256_sha224_ecdsa_secp224r1"
    "register_id_sha256_sha256_sha256_ecdsa_brainpoolP256r1"
    "register_id_sha256_sha256_sha256_ecdsa_brainpoolP384r1"
    "register_id_sha256_sha256_sha256_ecdsa_secp256r1"
    "register_id_sha256_sha256_sha256_ecdsa_secp384r1"
    "register_id_sha256_sha256_sha256_rsa_3_4096"
    "register_id_sha256_sha256_sha256_rsa_65537_4096"
    "register_id_sha256_sha256_sha256_rsapss_3_32_2048"
    "register_id_sha256_sha256_sha256_rsapss_65537_32_2048"
    "register_id_sha256_sha256_sha256_rsapss_65537_32_3072"
    "register_id_sha256_sha256_sha256_rsapss_65537_64_2048"
    "register_id_sha384_sha384_sha384_ecdsa_brainpoolP384r1"
    "register_id_sha384_sha384_sha384_ecdsa_brainpoolP512r1"
    "register_id_sha384_sha384_sha384_ecdsa_secp384r1"
    "register_id_sha384_sha384_sha384_rsapss_65537_48_2048"
    "register_id_sha512_sha512_sha256_rsa_65537_4096"
    "register_id_sha512_sha512_sha512_ecdsa_brainpoolP512r1"
    "register_id_sha512_sha512_sha512_ecdsa_secp521r1"
    "register_id_sha512_sha512_sha512_rsa_65537_4096"
    "register_id_sha512_sha512_sha512_rsapss_65537_64_2048"
    "register_id_sha512_sha512_sha256_rsapss_65537_32_2048"
)

REGISTER_AADHAAR_CIRCUITS=(
    "register_aadhaar"
)

DISCLOSE_CIRCUITS=(
    "vc_and_disclose"
    "vc_and_disclose_id"
    "vc_and_disclose_aadhaar"
)

DSC_CIRCUITS=(
    "dsc_sha1_ecdsa_brainpoolP256r1"
    "dsc_sha1_ecdsa_secp256r1"
    "dsc_sha1_rsa_65537_4096"
    "dsc_sha256_ecdsa_brainpoolP256r1"
    "dsc_sha256_ecdsa_brainpoolP384r1"
    "dsc_sha256_ecdsa_secp256r1"
    "dsc_sha256_ecdsa_secp384r1"
    "dsc_sha256_ecdsa_secp521r1"
    "dsc_sha256_rsa_65537_4096"
    "dsc_sha256_rsa_56611_4096"
    "dsc_sha256_rsa_107903_4096"
    "dsc_sha256_rsa_122125_4096"
    "dsc_sha256_rsa_130689_4096"
    "dsc_sha256_rsapss_3_32_3072"
    "dsc_sha256_rsapss_65537_32_3072"
    "dsc_sha256_rsapss_65537_32_4096"
    "dsc_sha384_ecdsa_brainpoolP384r1"
    "dsc_sha384_ecdsa_brainpoolP512r1"
    "dsc_sha384_ecdsa_secp384r1"
    "dsc_sha512_ecdsa_brainpoolP512r1"
    "dsc_sha512_ecdsa_secp521r1"
    "dsc_sha512_rsa_65537_4096"
    "dsc_sha512_rsapss_65537_64_4096"
    "dsc_sha384_rsapss_65537_48_3072"
)

# Extract circuit type
CIRCUIT_TYPE=$(extract_circuit_type "$CIRCUIT_NAME")

if [[ -z "$CIRCUIT_TYPE" ]]; then
    echo "❌ Error: Cannot determine circuit type from '$CIRCUIT_NAME'"
    echo "Expected patterns: register_*, register_id_*, register_aadhaar, vc_and_disclose*, dsc_*"
    exit 1
fi

# Function to check if circuit exists in array
circuit_exists_in_array() {
    local circuit_name="$1"
    shift
    local array=("$@")

    for item in "${array[@]}"; do
        if [[ "$item" == "$circuit_name" ]]; then
            return 0
        fi
    done
    return 1
}

# Validate circuit exists in the appropriate array and set paths
case "$CIRCUIT_TYPE" in
    "register")
        if ! circuit_exists_in_array "$CIRCUIT_NAME" "${REGISTER_CIRCUITS[@]}"; then
            echo "❌ Error: Circuit '$CIRCUIT_NAME' not found in REGISTER_CIRCUITS"
            exit 1
        fi
        output="output/register"
        basepath="./circuits/circuits/register/instances"
        ;;
    "register_id")
        if ! circuit_exists_in_array "$CIRCUIT_NAME" "${REGISTER_ID_CIRCUITS[@]}"; then
            echo "❌ Error: Circuit '$CIRCUIT_NAME' not found in REGISTER_ID_CIRCUITS"
            exit 1
        fi
        output="output/register"
        basepath="./circuits/circuits/register_id/instances"
        ;;
    "register_aadhaar")
        if ! circuit_exists_in_array "$CIRCUIT_NAME" "${REGISTER_AADHAAR_CIRCUITS[@]}"; then
            echo "❌ Error: Circuit '$CIRCUIT_NAME' not found in REGISTER_AADHAAR_CIRCUITS"
            exit 1
        fi
        output="output/register"
        basepath="./circuits/circuits/register/instances"
        ;;
    "vc_and_disclose")
        if ! circuit_exists_in_array "$CIRCUIT_NAME" "${DISCLOSE_CIRCUITS[@]}"; then
            echo "❌ Error: Circuit '$CIRCUIT_NAME' not found in DISCLOSE_CIRCUITS"
            exit 1
        fi
        output="output/disclose"
        basepath="./circuits/circuits/disclose"
        ;;
    "dsc")
        if ! circuit_exists_in_array "$CIRCUIT_NAME" "${DSC_CIRCUITS[@]}"; then
            echo "❌ Error: Circuit '$CIRCUIT_NAME' not found in DSC_CIRCUITS"
            exit 1
        fi
        output="output/dsc"
        basepath="./circuits/circuits/dsc/instances"
        ;;
    *)
        echo "❌ Error: Unknown circuit type '$CIRCUIT_TYPE'"
        exit 1
        ;;
esac

# Create output directory
mkdir -p "$output"

filepath="$basepath/${CIRCUIT_NAME}.circom"

if [[ ! -f "$filepath" ]]; then
    echo "❌ Error: Circuit file not found: $filepath"
    exit 1
fi

# Compile circuit and C++ code
circom "$filepath" \
    -l "circuits/node_modules" \
    -l "circuits/node_modules/@zk-kit/binary-merkle-root.circom/src" \
    -l "circuits/node_modules/circomlib/circuits" \
    --O1 -c --output "$output" && \
    cd "$output/${CIRCUIT_NAME}_cpp" && \
    make

echo " Circuit '$CIRCUIT_NAME' built successfully!"
