pragma circom 2.1.9;

include "./jwt_verifier.circom";
include "../utils/passport/signatureAlgorithm.circom";
include "../utils/gcp_jwt/extractAndValidatePubkey.circom";
include "../utils/gcp_jwt/verifyCertificateSignature.circom";
include "../utils/gcp_jwt/verifyExtractedString.circom";
include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";

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

    // EAT nonce (payload.eat_nonce[0])
    var MAX_EAT_NONCE_B64_LENGTH = 88; // Max length for base64url string (64 bytes = 88 b64 chars max)
    signal input eat_nonce_0_b64[MAX_EAT_NONCE_B64_LENGTH]; // Base64url string from payload
    signal input eat_nonce_0_b64_length; // Length of base64url string
    signal input eat_nonce_0_offset; // Offset in payload where eat_nonce[0] appears

    // Container image digest (payload.submods.container.image_digest)
    var MAX_IMAGE_DIGEST_LENGTH = 80; // "sha256:" + 64 hex chars = 71, padded to 80
    var IMAGE_HASH_LENGTH = 64; // Just the hex hash portion
    signal input image_digest[MAX_IMAGE_DIGEST_LENGTH]; // Full "sha256:..." string from payload
    signal input image_digest_length; // Length of full string (should be 71)
    signal input image_digest_offset; // Offset in payload where image_digest appears

    var maxHeaderLength = (maxB64HeaderLength * 3) \ 4;
    var maxPayloadLength = (maxB64PayloadLength * 3) \ 4;

    signal output publicKeyHash; // Poseidon hash of leaf pubkey
    signal output header[maxHeaderLength]; // Decoded JWT header
    signal output payload[maxPayloadLength]; // Decoded JWT payload
    signal output eat_nonce_0_b64_output[MAX_EAT_NONCE_B64_LENGTH]; // eat_nonce[0] base64url string
    signal output eat_nonce_0_b64_output_length; // Length of eat_nonce[0] base64url string
    signal output image_hash[IMAGE_HASH_LENGTH]; // Container image SHA256 hash (without "sha256:" prefix)

    // Verify JWT Signature (using x5c[0] public key)
    component jwtVerifier = JWTVerifier(n, k, maxMessageLength, maxB64HeaderLength, maxB64PayloadLength);
    jwtVerifier.message <== message;
    jwtVerifier.messageLength <== messageLength;
    jwtVerifier.pubkey <== leaf_pubkey;
    jwtVerifier.signature <== jwt_signature;
    jwtVerifier.periodIndex <== periodIndex;

    publicKeyHash <== jwtVerifier.publicKeyHash;
    header <== jwtVerifier.header;
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

    // Extract substring from payload at the claimed offset
    signal extracted_eat_nonce[MAX_EAT_NONCE_B64_LENGTH] <== SelectSubArray(
        maxPayloadLength,
        MAX_EAT_NONCE_B64_LENGTH
    )(
        payload,
        eat_nonce_0_offset,
        eat_nonce_0_b64_length
    );

    // GCP spec: nonce must be 10-74 bytes decoded
    // Base64url encoding: 10 bytes = 14 chars, 74 bytes = 99 chars
    // https://cloud.google.com/confidential-computing/confidential-space/docs/connect-external-resources

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
    length_max_check.in[1] <== 99;
    length_max_check.out === 1;

    // Validate nonce offset bounds (prevent reading beyond payload)
    signal eat_nonce_end_position <== eat_nonce_0_offset + eat_nonce_0_b64_length;
    component offset_bounds_check = LessEqThan(log2Ceil(maxPayloadLength));
    offset_bounds_check.in[0] <== eat_nonce_end_position;
    offset_bounds_check.in[1] <== maxPayloadLength;
    offset_bounds_check.out === 1;

    // Verify extracted string matches input with padding validation
    VerifyExtractedString(MAX_EAT_NONCE_B64_LENGTH)(
        extracted_eat_nonce,
        eat_nonce_0_b64,
        eat_nonce_0_b64_length
    );

    // Output the verified base64url string
    eat_nonce_0_b64_output <== eat_nonce_0_b64;
    eat_nonce_0_b64_output_length <== eat_nonce_0_b64_length;

    // Extract image digest from payload
    signal extracted_image_digest[MAX_IMAGE_DIGEST_LENGTH] <== SelectSubArray(
        maxPayloadLength,
        MAX_IMAGE_DIGEST_LENGTH
    )(
        payload,
        image_digest_offset,
        image_digest_length
    );

    // Validate length is exactly 71 ("sha256:" + 64 hex chars)
    image_digest_length === 71;

    // Validate "sha256:" prefix (ASCII codes)
    extracted_image_digest[0] === 115;  // 's'
    extracted_image_digest[1] === 104;  // 'h'
    extracted_image_digest[2] === 97;   // 'a'
    extracted_image_digest[3] === 50;   // '2'
    extracted_image_digest[4] === 53;   // '5'
    extracted_image_digest[5] === 54;   // '6'
    extracted_image_digest[6] === 58;   // ':'

    // Validate offset bounds
    signal image_digest_end_position <== image_digest_offset + image_digest_length;
    component image_digest_bounds_check = LessEqThan(log2Ceil(maxPayloadLength));
    image_digest_bounds_check.in[0] <== image_digest_end_position;
    image_digest_bounds_check.in[1] <== maxPayloadLength;
    image_digest_bounds_check.out === 1;

    // Verify extracted string matches input with padding validation
    VerifyExtractedString(MAX_IMAGE_DIGEST_LENGTH)(
        extracted_image_digest,
        image_digest,
        image_digest_length
    );

    // Extract and output only the 64-char hash
    for (var i = 0; i < IMAGE_HASH_LENGTH; i++) {
        image_hash[i] <== extracted_image_digest[7 + i];
    }
}

component main = GCPJWTVerifier(1, 120, 35);
