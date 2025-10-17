#!/bin/bash

# run from root
# first argument should register | dsc | disclose
if [[  $1 != "register" && $1 != "dsc" && $1 != "disclose" && $1 != "register_id" && $1 != "register_aadhaar" ]]; then
    echo "first argument should be register | dsc | disclose | register_id | register_aadhaar"
    exit 1
fi

REGISTER_CIRCUITS=(
    # passport
    "register_sha1_sha1_sha1_rsa_64321_4096:true"
    "register_sha1_sha1_sha1_ecdsa_brainpoolP224r1:true"
    "register_sha1_sha1_sha1_ecdsa_secp256r1:true"
    "register_sha256_sha1_sha1_rsa_65537_4096:true"
    "register_sha1_sha1_sha1_rsa_65537_4096:true"
    "register_sha1_sha256_sha256_rsa_65537_4096:true"
    "register_sha224_sha224_sha224_ecdsa_brainpoolP224r1:true"
    "register_sha256_sha224_sha224_ecdsa_secp224r1:true"
    "register_sha256_sha256_sha224_ecdsa_secp224r1:true"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP256r1:true"
    "register_sha256_sha256_sha256_ecdsa_brainpoolP384r1:true"
    "register_sha256_sha256_sha256_ecdsa_secp256r1:true"
    "register_sha256_sha256_sha256_ecdsa_secp384r1:true"
    "register_sha256_sha256_sha256_rsa_3_4096:true"
    "register_sha256_sha256_sha256_rsa_65537_4096:true"
    "register_sha256_sha256_sha256_rsapss_3_32_2048:true"
    "register_sha256_sha256_sha256_rsapss_65537_32_2048:true"
    "register_sha256_sha256_sha256_rsapss_65537_32_3072:true"
    "register_sha256_sha256_sha256_rsapss_65537_32_4096:true"
    "register_sha256_sha256_sha256_rsapss_65537_64_2048:true"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP384r1:true"
    "register_sha384_sha384_sha384_ecdsa_brainpoolP512r1:true"
    "register_sha384_sha384_sha384_ecdsa_secp384r1:true"
    "register_sha512_sha512_sha256_rsapss_65537_32_2048:true"
    "register_sha384_sha384_sha384_rsapss_65537_48_2048:true"
    "register_sha512_sha512_sha256_rsa_65537_4096:true"
    "register_sha512_sha512_sha512_ecdsa_brainpoolP512r1:true"
    "register_sha512_sha512_sha512_rsa_65537_4096:true"
    "register_sha512_sha512_sha512_rsapss_65537_64_2048:true"
    "register_sha512_sha512_sha512_ecdsa_secp521r1:true"
)

REGISTER_ID_CIRCUITS=(
    # eu id
    "register_id_sha1_sha1_sha1_ecdsa_brainpoolP224r1:true"
    "register_id_sha1_sha1_sha1_ecdsa_secp256r1:true"
    "register_id_sha1_sha1_sha1_rsa_65537_4096:true"
    "register_id_sha1_sha256_sha256_rsa_65537_4096:true"
    "register_id_sha224_sha224_sha224_ecdsa_brainpoolP224r1:true"
    "register_id_sha256_sha224_sha224_ecdsa_secp224r1:true"
    "register_id_sha256_sha256_sha224_ecdsa_secp224r1:true"
    "register_id_sha256_sha256_sha256_ecdsa_brainpoolP256r1:true"
    "register_id_sha256_sha256_sha256_ecdsa_brainpoolP384r1:true"
    "register_id_sha256_sha256_sha256_ecdsa_secp256r1:true"
    "register_id_sha256_sha256_sha256_ecdsa_secp384r1:true"
    "register_id_sha256_sha256_sha256_rsa_3_4096:true"
    "register_id_sha256_sha256_sha256_rsa_65537_4096:true"
    "register_id_sha256_sha256_sha256_rsapss_3_32_2048:true"
    "register_id_sha256_sha256_sha256_rsapss_65537_32_2048:true"
    "register_id_sha256_sha256_sha256_rsapss_65537_32_3072:true"
    "register_id_sha256_sha256_sha256_rsapss_65537_64_2048:true"
    "register_id_sha384_sha384_sha384_ecdsa_brainpoolP384r1:true"
    "register_id_sha384_sha384_sha384_ecdsa_brainpoolP512r1:true"
    "register_id_sha384_sha384_sha384_ecdsa_secp384r1:true"
    "register_id_sha384_sha384_sha384_rsapss_65537_48_2048:true"
    "register_id_sha512_sha512_sha256_rsa_65537_4096:true"
    "register_id_sha512_sha512_sha512_ecdsa_brainpoolP512r1:true"
    "register_id_sha512_sha512_sha512_ecdsa_secp521r1:true"
    "register_id_sha512_sha512_sha512_rsa_65537_4096:true"
    "register_id_sha512_sha512_sha512_rsapss_65537_64_2048:true"
    "register_id_sha512_sha512_sha256_rsapss_65537_32_2048:true"
)

REGISTER_AADHAAR_CIRCUITS=(
    "register_aadhaar:true"
)

DISCLOSE_CIRCUITS=(
    "vc_and_disclose:true"
    "vc_and_disclose_id:true"
    "vc_and_disclose_aadhaar:true"
)

DSC_CIRCUITS=(
    "dsc_sha1_ecdsa_brainpoolP256r1:true"
    "dsc_sha1_ecdsa_secp256r1:true"
    "dsc_sha1_rsa_65537_4096:true"
    "dsc_sha256_ecdsa_brainpoolP256r1:true"
    "dsc_sha256_ecdsa_brainpoolP384r1:true"
    "dsc_sha256_ecdsa_secp256r1:true"
    "dsc_sha256_ecdsa_secp384r1:true"
    "dsc_sha256_ecdsa_secp521r1:true"
    "dsc_sha256_rsa_65537_4096:true"
    "dsc_sha256_rsa_56611_4096:true"
    "dsc_sha256_rsa_107903_4096:true"
    "dsc_sha256_rsa_122125_4096:true"
    "dsc_sha256_rsa_130689_4096:true"
    "dsc_sha256_rsapss_3_32_3072:true"
    "dsc_sha256_rsapss_65537_32_3072:true"
    "dsc_sha256_rsapss_65537_32_4096:true"
    "dsc_sha384_ecdsa_brainpoolP384r1:true"
    "dsc_sha384_ecdsa_brainpoolP512r1:true"
    "dsc_sha384_ecdsa_secp384r1:true"
    "dsc_sha512_ecdsa_brainpoolP512r1:true"
    "dsc_sha512_ecdsa_secp521r1:true"
    "dsc_sha512_rsa_65537_4096:true"
    "dsc_sha512_rsapss_65537_64_4096:true"
    "dsc_sha384_rsapss_65537_48_3072:true"
)

if [[ $1 == "register" ]]; then
    allowed_circuits=("${REGISTER_CIRCUITS[@]}")
    output="output/register"
    mkdir -p $output
    basepath="./circuits/circuits/register/instances"
elif [[ $1 == "register_id" ]]; then
    allowed_circuits=("${REGISTER_ID_CIRCUITS[@]}")
    output="output/register"
    mkdir -p $output
    basepath="./circuits/circuits/register_id/instances"
elif [[ $1 == "register_aadhaar" ]]; then
    allowed_circuits=("${REGISTER_AADHAAR_CIRCUITS[@]}")
    output="output/register"
    mkdir -p $output
    basepath="./circuits/circuits/register/instances"
elif [[ $1 == "dsc" ]]; then
    allowed_circuits=("${DSC_CIRCUITS[@]}")
    output="output/dsc"
    mkdir -p $output
    basepath="./circuits/circuits/dsc/instances"
elif [[ $1 == "disclose" ]]; then
    allowed_circuits=("${DISCLOSE_CIRCUITS[@]}")
    output="output/disclose"
    mkdir -p $output
    basepath="./circuits/circuits/disclose"
fi

pids=()
for item in "${allowed_circuits[@]}"; do
    filename=$(echo "$item" | cut -d':' -f1)
    allowed=$(echo "$item" | cut -d':' -f2)

    if [[ $allowed == 'false' ]]; then
        echo "Skipping $filename (not in allowed circuits)"
        continue
    fi

    while [[ ${#pids[@]} -ge 2 ]]; do
        new_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                new_pids+=("$pid")
            else
                echo "Process $pid finished"
            fi
        done
        pids=("${new_pids[@]}")
        sleep 1
    done

    echo $filename $allowed
    filepath=${basepath}/${filename}.circom
    circom_pid=$!
    circuit_name="${filename%.*}"
    (
        circom $filepath \
        -l "circuits/node_modules" \
        -l "circuits/node_modules/@zk-kit/binary-merkle-root.circom/src" \
        -l "circuits/node_modules/circomlib/circuits" \
        --O1 -c --output $output && \
        cd $output/${circuit_name}_cpp && \
        make
    ) &
    pids+=($!)
done

echo "Waiting for all circuits to compile..."
wait "${pids[@]}"
echo "All circuits compiled successfully!"
