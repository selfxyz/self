pragma circom 2.1.9;

include "../passport/checkPubkeyPosition.circom";
include "../passport/checkPubkeysEqual.circom";
include "../passport/signatureAlgorithm.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";

/// @title ExtractAndValidatePubkey
/// @notice Extract the public key from certificate and validate position and equality
/// @dev Pubkey extraction and validation logic for X.509 certificate chain verification:
///      - Calculates the region containing prefix + pubkey + suffix
///      - Validates indices are within certificate bounds
///      - Extracts the pubkey region using SelectSubArray
///      - Validates the ASN.1 structure matches expected format
///      - Extracts the raw pubkey bytes (without prefix/suffix)
///      - Verifies extracted pubkey matches the provided input pubkey
template ExtractAndValidatePubkey(
    signatureAlgorithm,  // Algorithm ID (e.g., 1 for RSA-SHA256)
    n,                   // RSA chunk size (e.g., 120)
    k,                   // Number of chunks (e.g., 35)
    MAX_CERT_LENGTH,     // Maximum certificate size in bytes
    MAX_PUBKEY_PREFIX,   // ASN.1 prefix length (typically 33)
    MAX_PUBKEY_LENGTH    // Maximum pubkey length in bytes
) {
    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var kScaled = k * kLengthFactor;
    var suffixLength = kLengthFactor == 1 ? getSuffixLength(signatureAlgorithm) : 0;

    signal input cert[MAX_CERT_LENGTH];
    signal input pubkey_offset;
    signal input pubkey_actual_size;
    signal input input_pubkey[kScaled];

    // Validate pubkey_actual_size is within bounds (prevent OOB attacks)
    component size_max_check = LessEqThan(log2Ceil(MAX_PUBKEY_LENGTH));
    size_max_check.in[0] <== pubkey_actual_size;
    size_max_check.in[1] <== MAX_PUBKEY_LENGTH;
    size_max_check.out === 1;

    // Validate pubkey_offset is within bounds (prevent underflow in prefix calculation)
    component offset_min_check = GreaterEqThan(log2Ceil(MAX_CERT_LENGTH));
    offset_min_check.in[0] <== pubkey_offset;
    offset_min_check.in[1] <== MAX_PUBKEY_PREFIX;
    offset_min_check.out === 1;

    // Calculate prefix start index and net length
    signal pubkey_prefix_start_index <== pubkey_offset - MAX_PUBKEY_PREFIX;
    signal pubkey_net_length <== MAX_PUBKEY_PREFIX + pubkey_actual_size + suffixLength;

    // Validate indices are in range
    component prefix_idx_valid = Num2Bits(log2Ceil(MAX_CERT_LENGTH));
    prefix_idx_valid.in <== pubkey_prefix_start_index;

    component net_len_valid = Num2Bits(log2Ceil(MAX_CERT_LENGTH));
    net_len_valid.in <== pubkey_net_length;

    component prefix_in_range = LessEqThan(log2Ceil(MAX_CERT_LENGTH));
    prefix_in_range.in[0] <== pubkey_prefix_start_index + pubkey_net_length;
    prefix_in_range.in[1] <== MAX_CERT_LENGTH;
    prefix_in_range.out === 1;

    // Extract pubkey region with prefix and suffix
    signal pubkey_region[MAX_PUBKEY_PREFIX + MAX_PUBKEY_LENGTH + suffixLength] <== SelectSubArray(
        MAX_CERT_LENGTH,
        MAX_PUBKEY_PREFIX + MAX_PUBKEY_LENGTH + suffixLength
    )(
        cert,
        pubkey_prefix_start_index,
        pubkey_net_length
    );

    // Validate pubkey position (checks ASN.1 prefix and suffix)
    CheckPubkeyPosition(
        MAX_PUBKEY_PREFIX,
        MAX_PUBKEY_LENGTH,
        suffixLength,
        signatureAlgorithm
    )(
        pubkey_region,
        pubkey_actual_size
    );

    // Extract pubkey without prefix
    signal extracted_pubkey[MAX_PUBKEY_LENGTH];
    for (var i = 0; i < MAX_PUBKEY_LENGTH; i++) {
        extracted_pubkey[i] <== pubkey_region[MAX_PUBKEY_PREFIX + i];
    }

    // Verify extracted pubkey matches input pubkey
    CheckPubkeysEqual(n, kScaled, kLengthFactor, MAX_PUBKEY_LENGTH)(
        input_pubkey,
        extracted_pubkey,
        pubkey_actual_size
    );
}
