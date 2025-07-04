pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "constants.circom";

/// @title CheckPubkeyPosition
/// @notice Verifies that a public key in a certificate has the correct prefix for its key length, and that the suffix is the modulus
/// @param prefixLength Length of the prefix to check at the start of the key
/// @param maxPubkeyLength Maximum length of the public key
/// @param suffixLength Length of the suffix after the key
/// @param signatureAlgorithm Algorithm ID indicating RSA/RSAPSS and key length
/// @input array Array containing [prefix + pubkey + suffix]
/// @input pubkey_actual_length Actual length of the public key
/// @dev Assumes that the suffixLength is less than ceil(maxPubkeyLength + suffixLength) bits
template CheckPubkeyPosition(prefixLength, maxPubkeyLength, suffixLength, signatureAlgorithm) {

    assert(suffixLength < log2Ceil(maxPubkeyLength + suffixLength));

    signal input pubkey_with_prefix_and_suffix[prefixLength + maxPubkeyLength + suffixLength];
    signal input pubkey_actual_length;

    var kLengthFactor = getKLengthFactor(signatureAlgorithm);
    var NUM_VALID_PREFIXES = kLengthFactor == 1 ? 7 : 13;

    // Grab the prefix
    signal prefix_bytes[prefixLength];
    for (var i = 0; i < prefixLength; i++) {
        prefix_bytes[i] <== pubkey_with_prefix_and_suffix[i];
    }

    // Check for each valid prefix if it matches
    var validPrefixes[NUM_VALID_PREFIXES][prefixLength] = kLengthFactor == 1 ? getValidRSAPrefixes() : getValidECDSAPrefixes();
    signal candidateMatches[NUM_VALID_PREFIXES];
    signal byteMatches[NUM_VALID_PREFIXES][prefixLength];
    signal sum[NUM_VALID_PREFIXES][prefixLength+1];
    component cmp[NUM_VALID_PREFIXES][prefixLength];
    component eq[NUM_VALID_PREFIXES];

    for (var j = 0; j < NUM_VALID_PREFIXES; j++) {
        sum[j][0] <== 0;
        for (var i = 0; i < prefixLength; i++) {
            cmp[j][i] = IsEqual();
            cmp[j][i].in[0] <== prefix_bytes[i];
            cmp[j][i].in[1] <== validPrefixes[j][i];
            byteMatches[j][i] <== cmp[j][i].out;
            sum[j][i+1] <== sum[j][i] + byteMatches[j][i];
        }
        eq[j] = IsEqual();
        eq[j].in[0] <== sum[j][prefixLength];
        eq[j].in[1] <== prefixLength;
        candidateMatches[j] <== eq[j].out;
    }

    // Get the key length for each valid prefix
    var keyLengths[NUM_VALID_PREFIXES] = kLengthFactor == 1 ? prefixIndexToRSAKeyLength() : prefixIndexToECDSAKeyLength();

    // Running sum of the candidate matches
    signal prefix_sums[NUM_VALID_PREFIXES + 1];
    signal key_length_sums[NUM_VALID_PREFIXES + 1];
    prefix_sums[0] <== 0;
    key_length_sums[0] <== 0;
    for (var i = 0; i < NUM_VALID_PREFIXES; i++) {
        prefix_sums[i + 1] <== prefix_sums[i] + candidateMatches[i];
        key_length_sums[i + 1] <== key_length_sums[i] + keyLengths[i] * candidateMatches[i];
    }

    // Check that one of the prefixes matched
    signal one_prefix_matched <== IsEqual()([prefix_sums[NUM_VALID_PREFIXES], 1]);
    one_prefix_matched === 1;

    // Check the actual key length given matches the one from the prefix
    signal key_length_ok <== IsEqual()([
        key_length_sums[NUM_VALID_PREFIXES] * kLengthFactor / 8,
        pubkey_actual_length
    ]);
    key_length_ok === 1;

    if (kLengthFactor == 1) {
        // If using RSA, check the suffix is the exponent of the circuit
        var expectedSuffix[suffixLength] = getSuffix(signatureAlgorithm);

        // Grab the key and suffix
        signal key_and_suffix[maxPubkeyLength + suffixLength];
        for (var i = 0; i < maxPubkeyLength + suffixLength; i++) {
            key_and_suffix[i] <== pubkey_with_prefix_and_suffix[prefixLength + i];
        }

        //Assert pubkey_actual_length + suffixLength is less than ceil(maxPubkeyLength + suffixLength) bits
        component is_pk_actual_len_plus_suffix_len_valid = Num2Bits(log2Ceil(maxPubkeyLength + suffixLength));
        is_pk_actual_len_plus_suffix_len_valid.in <== pubkey_actual_length + suffixLength;

        // Assert `pubkey_actual_length + suffixLength` is less than maxPubkeyLength + suffixLength
        signal is_pubkey_actual_length_in_range <== LessEqThan(log2Ceil(maxPubkeyLength + suffixLength))([
            pubkey_actual_length + suffixLength,
            maxPubkeyLength + suffixLength
        ]);
        is_pubkey_actual_length_in_range === 1;

        // Extract the suffix
        signal suffix[suffixLength] <== SelectSubArray(
            maxPubkeyLength + suffixLength,
            suffixLength
        )(
            key_and_suffix,
            pubkey_actual_length,
            suffixLength
        );

        // Check that the suffix is the exponent
        component suffix_eq[suffixLength];
        for (var i = 0; i < suffixLength; i++) {
            suffix_eq[i] = IsEqual();
            suffix_eq[i].in[0] <== suffix[i];
            suffix_eq[i].in[1] <== expectedSuffix[i];
            suffix_eq[i].out === 1;
        }
    } else {
        // If using ECDSA, check pubkey_actual_length is the key length (ECDSA circuits always support only one key size)
        var minKeyLength = getMinKeyLength(signatureAlgorithm);
        signal isCorrectLength <== IsEqual()([
            pubkey_actual_length,
            minKeyLength * kLengthFactor / 8
        ]);
        isCorrectLength === 1;
    }
}
