pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "constants.circom";

/// @title CheckRSAPrefix
/// @notice Extracts and verifies RSA prefix from a byte array
/// @param prefixLength Length of the RSA prefix to check
/// @param arrayLength Length of the input array containing the prefix
/// @input array Array containing the prefix at the start
/// @output is_valid 1 if extracted prefix matches any allowed prefix, 0 otherwise
template CheckRSAPrefix(prefixLength, arrayLength) {
    signal input array[arrayLength];

    signal prefix_bytes[prefixLength];
    for (var i = 0; i < prefixLength; i++) {
        prefix_bytes[i] <== array[i];
    }

    var rsaPrefixes[3][5] = getRSAPrefixes();
    signal candidateMatches[3];
    signal byteMatches[3][prefixLength];
    signal sum[3][prefixLength+1];
    component cmp[3][prefixLength];
    component eq[3];

    for (var j = 0; j < 3; j++) {
        sum[j][0] <== 0;
        for (var i = 0; i < prefixLength; i++) {
            cmp[j][i] = IsEqual();
            cmp[j][i].in[0] <== prefix_bytes[i];
            cmp[j][i].in[1] <== rsaPrefixes[j][i];
            byteMatches[j][i] <== cmp[j][i].out;
            sum[j][i+1] <== sum[j][i] + byteMatches[j][i];
        }
        eq[j] = IsEqual();
        eq[j].in[0] <== sum[j][prefixLength];
        eq[j].in[1] <== prefixLength;
        candidateMatches[j] <== eq[j].out;
    }
    signal prefix_ok <== candidateMatches[0] + candidateMatches[1] + candidateMatches[2];
    component gt = GreaterThan(4);
    gt.in[0] <== prefix_ok;
    gt.in[1] <== 0;
    gt.out === 1;
}