pragma circom 2.1.9;

include "./jwt_verifier.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/passport/customHashers.circom";
include "../utils/gcp_jwt/extractAndValidatePubkey.circom";
include "../utils/gcp_jwt/verifyCertificateSignature.circom";
include "../utils/gcp_jwt/verifyJSONFieldExtraction.circom";
include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";

/// @title GCPJWTVerifier
/// @notice Verifies GCP JWT signature and full x5c certificate chain
/// @dev Complete chain-of-trust verification in-circuit:
///      x5c[0]: Leaf certificate (signs JWT)
///      x5c[1]: Intermediate CA (signs x5c[0])
///      x5c[2]: Root CA (signs x5c[1])
template GCPJWTVerifier(
    signatureAlgorithm,  // 1 for RSA-SHA256
    n,                   // RSA chunk size (120)
    k                    // Number of chunks (35)
) {
    // JWT parameters
    var maxMessageLength = 11776;
    var maxB64HeaderLength = 8832;
    var maxB64PayloadLength = 2880;

    // Certificate parameters
    var MAX_CERT_LENGTH = 2048; // Max DER-encoded certificate size
    var MAX_PUBKEY_PREFIX = 33; // ASN.1 prefix length (from DSC)
    var MAX_PUBKEY_LENGTH = n * k / 8;  // Max RSA pubkey length in bytes

    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;
    var hashLength = getHashLength(signatureAlgorithm);
    var suffixLength = kLengthFactor == 1 ? getSuffixLength(signatureAlgorithm) : 0;

    // JWT inputs
    signal input message[maxMessageLength]; // JWT header.payload
    signal input messageLength;
    signal input periodIndex;

    // x5c[0] - Leaf certificate (DER encoded, padded for SHA)
    signal input leaf_cert[MAX_CERT_LENGTH];
    signal input leaf_cert_padded_length; // Padded length for SHA256
    signal input leaf_pubkey_offset;  // Offset to pubkey in cert
    signal input leaf_pubkey_actual_size; // Actual pubkey size in bytes

    // x5c[1] - Intermediate CA certificate
    signal input intermediate_cert[MAX_CERT_LENGTH];
    signal input intermediate_cert_padded_length;
    signal input intermediate_pubkey_offset;
    signal input intermediate_pubkey_actual_size;

    // x5c[2] - Root CA certificate
    signal input root_cert[MAX_CERT_LENGTH];
    signal input root_cert_padded_length;
    signal input root_pubkey_offset;
    signal input root_pubkey_actual_size;

    // Public keys (extracted from certificates)
    signal input leaf_pubkey[kScaled]; // From x5c[0]
    signal input intermediate_pubkey[kScaled]; // From x5c[1]
    signal input root_pubkey[kScaled]; // From x5c[2]

    // Signatures
    signal input jwt_signature[kScaled]; // JWT signature
    signal input leaf_signature[kScaled]; // x5c[0] signature
    signal input intermediate_signature[kScaled]; // x5c[1] signature


    // GCP spec: nonce must be 10-74 bytes decoded
    // https://cloud.google.com/confidential-computing/confidential-space/docs/connect-external-resources
    // EAT nonce (payload.eat_nonce[0])
    var MAX_EAT_NONCE_B64_LENGTH = 74; // Max length for base64url string (74 bytes decoded = 99 b64url chars)
    var MAX_EAT_NONCE_KEY_LENGTH = 10; // Length of "eat_nonce" key (without quotes)
	var EAT_NONCE_PACKED_CHUNKS = computeIntChunkLength(MAX_EAT_NONCE_B64_LENGTH);
    signal input eat_nonce_0_b64_length; // Length of base64url string
    signal input eat_nonce_0_key_offset; // Offset in payload where "eat_nonce" key starts (after opening quote)
    signal input eat_nonce_0_value_offset; // Offset in payload where eat_nonce[0] value appears

    // Container image digest (payload.submods.container.image_digest)
    var MAX_IMAGE_DIGEST_LENGTH = 71; // "sha256:" + 64 hex chars
    var IMAGE_HASH_LENGTH = 64; // Just the hex hash portion
    var MAX_IMAGE_DIGEST_KEY_LENGTH = 12; // Length of "image_digest" key (without quotes)
	var IMAGE_HASH_PACKED_CHUNKS = computeIntChunkLength(IMAGE_HASH_LENGTH);
    signal input image_digest_length; // Length of full string (should be 71)
    signal input image_digest_key_offset; // Offset in payload where "image_digest" key starts (after opening quote)
    signal input image_digest_value_offset; // Offset in payload where image_digest value appears

    var maxHeaderLength = (maxB64HeaderLength * 3) \ 4;
    var maxPayloadLength = (maxB64PayloadLength * 3) \ 4;

    signal output rootCAPubkeyHash; // Root CA (x5c[2]) pubkey, trust anchor
    signal output eat_nonce_0_b64_packed[EAT_NONCE_PACKED_CHUNKS]; // eat_nonce[0] base64url string packed with PackBytes
    signal output image_hash_packed[IMAGE_HASH_PACKED_CHUNKS]; // Container image SHA256 hash (64 hex chars) packed with PackBytes

    // Verify JWT Signature (using x5c[0] public key)
    component jwtVerifier = JWTVerifier(n, k, maxMessageLength, maxB64HeaderLength, maxB64PayloadLength);
    jwtVerifier.message <== message;
    jwtVerifier.messageLength <== messageLength;
    jwtVerifier.pubkey <== leaf_pubkey;
    jwtVerifier.signature <== jwt_signature;
    jwtVerifier.periodIndex <== periodIndex;

    // Poseidon hash of root CA pubkey (x5c[2])
    rootCAPubkeyHash <== CustomHasher(kScaled)(root_pubkey);

    signal payload[maxPayloadLength];
    payload <== jwtVerifier.payload;

    // Extract and validate x5c[0] Public Key
    ExtractAndValidatePubkey(signatureAlgorithm, n, k, MAX_CERT_LENGTH, MAX_PUBKEY_PREFIX, MAX_PUBKEY_LENGTH)(
        leaf_cert,
        leaf_pubkey_offset,
        leaf_pubkey_actual_size,
        leaf_pubkey
    );

    // Extract and validate x5c[1] public key
    ExtractAndValidatePubkey(signatureAlgorithm, n, k, MAX_CERT_LENGTH, MAX_PUBKEY_PREFIX, MAX_PUBKEY_LENGTH)(
        intermediate_cert,
        intermediate_pubkey_offset,
        intermediate_pubkey_actual_size,
        intermediate_pubkey
    );

    // Verify x5c[0] signature using x5c[1] public key
    VerifyCertificateSignature(signatureAlgorithm, n, k, MAX_CERT_LENGTH)(
        leaf_cert,
        leaf_cert_padded_length,
        intermediate_pubkey,
        leaf_signature
    );

    // Extract and validate x5c[2] public key
    ExtractAndValidatePubkey(signatureAlgorithm, n, k, MAX_CERT_LENGTH, MAX_PUBKEY_PREFIX, MAX_PUBKEY_LENGTH)(
        root_cert,
        root_pubkey_offset,
        root_pubkey_actual_size,
        root_pubkey
    );

    // Verify x5c[1] signature using x5c[2] public key
    VerifyCertificateSignature(signatureAlgorithm, n, k, MAX_CERT_LENGTH)(
        intermediate_cert,
        intermediate_cert_padded_length,
        root_pubkey,
        intermediate_signature
    );

    // Make sure nonce is not empty
    component length_nonzero = IsZero();
    length_nonzero.in <== eat_nonce_0_b64_length;
    length_nonzero.out === 0;  // Must NOT be zero

    // Validate nonce minimum length (10 bytes decoded = 14 base64url chars)
    component length_min_check = GreaterEqThan(log2Ceil(MAX_EAT_NONCE_B64_LENGTH));
    length_min_check.in[0] <== eat_nonce_0_b64_length;
    length_min_check.in[1] <== 14;
    length_min_check.out === 1;

    // Validate nonce maximum length (74 bytes decoded = 99 base64url chars)
    component length_max_check = LessEqThan(log2Ceil(MAX_EAT_NONCE_B64_LENGTH));
    length_max_check.in[0] <== eat_nonce_0_b64_length;
    length_max_check.in[1] <== MAX_EAT_NONCE_B64_LENGTH;
    length_max_check.out === 1;

    // Validate nonce offset bounds (prevent reading beyond payload)
    signal eat_nonce_end_position <== eat_nonce_0_value_offset + eat_nonce_0_b64_length;
    component offset_bounds_check = LessEqThan(log2Ceil(maxPayloadLength));
    offset_bounds_check.in[0] <== eat_nonce_end_position;
    offset_bounds_check.in[1] <== maxPayloadLength;
    offset_bounds_check.out === 1;

    // Extract and verify EAT nonce field
    signal expected_eat_nonce_key[MAX_EAT_NONCE_KEY_LENGTH];
    // "eat_nonce", ASCII
    expected_eat_nonce_key[0] <== 101; // 'e'
    expected_eat_nonce_key[1] <== 97;  // 'a'
    expected_eat_nonce_key[2] <== 116; // 't'
    expected_eat_nonce_key[3] <== 95;  // '_'
    expected_eat_nonce_key[4] <== 110; // 'n'
    expected_eat_nonce_key[5] <== 111; // 'o'
    expected_eat_nonce_key[6] <== 110; // 'n'
    expected_eat_nonce_key[7] <== 99; // 'c'
    expected_eat_nonce_key[8] <== 101; // 'e'
    expected_eat_nonce_key[9] <== 0;   // padding

    component eatNonceExtractor = ExtractAndVerifyJSONField(maxPayloadLength, MAX_EAT_NONCE_KEY_LENGTH, MAX_EAT_NONCE_B64_LENGTH);
    eatNonceExtractor.json <== payload;
    eatNonceExtractor.key_offset <== eat_nonce_0_key_offset;
    eatNonceExtractor.key_length <== 9; // actual key length "eat_nonce"
    eatNonceExtractor.value_offset <== eat_nonce_0_value_offset;
    eatNonceExtractor.value_length <== eat_nonce_0_b64_length;
    eatNonceExtractor.expected_key_name <== expected_eat_nonce_key;

    // Output the extracted base64url string
    eat_nonce_0_b64_packed <== PackBytes(MAX_EAT_NONCE_B64_LENGTH)(eatNonceExtractor.extracted_value);

    // Validate length is exactly 71 ("sha256:" + 64 hex chars)
    image_digest_length === 71;

    // Validate offset bounds
    signal image_digest_end_position <== image_digest_value_offset + image_digest_length;
    component image_digest_bounds_check = LessEqThan(log2Ceil(maxPayloadLength));
    image_digest_bounds_check.in[0] <== image_digest_end_position;
    image_digest_bounds_check.in[1] <== maxPayloadLength;
    image_digest_bounds_check.out === 1;

    // Extract and verify image digest field
    signal expected_image_digest_key[MAX_IMAGE_DIGEST_KEY_LENGTH];
    // "image_digest", ASCII
    expected_image_digest_key[0] <== 105; // 'i'
    expected_image_digest_key[1] <== 109; // 'm'
    expected_image_digest_key[2] <== 97;  // 'a'
    expected_image_digest_key[3] <== 103; // 'g'
    expected_image_digest_key[4] <== 101; // 'e'
    expected_image_digest_key[5] <== 95;  // '_'
    expected_image_digest_key[6] <== 100; // 'd'
    expected_image_digest_key[7] <== 105; // 'i'
    expected_image_digest_key[8] <== 103; // 'g'
    expected_image_digest_key[9] <== 101; // 'e'
    expected_image_digest_key[10] <== 115; // 's'
    expected_image_digest_key[11] <== 116; // 't'

    component imageDigestExtractor = ExtractAndVerifyJSONField(maxPayloadLength, MAX_IMAGE_DIGEST_KEY_LENGTH, MAX_IMAGE_DIGEST_LENGTH);
    imageDigestExtractor.json <== payload;
    imageDigestExtractor.key_offset <== image_digest_key_offset;
    imageDigestExtractor.key_length <== 12; // actual key length "image_digest"
    imageDigestExtractor.value_offset <== image_digest_value_offset;
    imageDigestExtractor.value_length <== image_digest_length;
    imageDigestExtractor.expected_key_name <== expected_image_digest_key;

    signal extracted_image_digest[MAX_IMAGE_DIGEST_LENGTH];
    extracted_image_digest <== imageDigestExtractor.extracted_value;

    // "sha256:", ASCII
    extracted_image_digest[0] === 115;  // 's'
    extracted_image_digest[1] === 104;  // 'h'
    extracted_image_digest[2] === 97;   // 'a'
    extracted_image_digest[3] === 50;   // '2'
    extracted_image_digest[4] === 53;   // '5'
    extracted_image_digest[5] === 54;   // '6'
    extracted_image_digest[6] === 58;   // ':'

    // Extract and output only the 64-char hash (skip "sha256:" prefix)
    signal image_hash_bytes[IMAGE_HASH_LENGTH];
    for (var i = 0; i < IMAGE_HASH_LENGTH; i++) {
        image_hash_bytes[i] <== extracted_image_digest[7 + i];
    }

    image_hash_packed <== PackBytes(IMAGE_HASH_LENGTH)(image_hash_bytes);
}

component main = GCPJWTVerifier(1, 120, 35);
