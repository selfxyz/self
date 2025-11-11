pragma circom 2.1.9;

include "../passport/signatureVerifier.circom";
include "../passport/signatureAlgorithm.circom";
include "../crypto/hasher/shaBytes/shaBytesDynamic.circom";

/// @title VerifyCertificateSignature
/// @notice Hash the certificate and verify its signature
/// @dev Certificate hashing and signature verification for X.509 chain validation:
///      - Hashes the DER-encoded certificate using SHA (dynamic length)
///      - Verifies the signature using the signer's public key
///      - Supports multiple signature algorithms
template VerifyCertificateSignature(
    signatureAlgorithm,  // Algorithm ID (e.g., 1 for RSA-SHA256)
    n,                   // RSA chunk size (e.g., 120)
    k,                   // Number of chunks (e.g., 35)
    MAX_CERT_LENGTH      // Maximum certificate size in bytes
) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;
    var hashLength = getHashLength(signatureAlgorithm);

    signal input cert[MAX_CERT_LENGTH];
    signal input cert_padded_length;
    signal input signer_pubkey[kScaled];
    signal input signature[kScaled];

    // Hash certificate using dynamic-length SHA
    signal hashed_cert[hashLength] <== ShaBytesDynamic(hashLength, MAX_CERT_LENGTH)(
        cert,
        cert_padded_length
    );

    // Verify signature using signer's public key
    SignatureVerifier(signatureAlgorithm, n, k)(
        hashed_cert,
        signer_pubkey,
        signature
    );
}
