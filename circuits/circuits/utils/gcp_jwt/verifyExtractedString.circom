pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";

/// @title VerifyExtractedString
/// @notice Verify that an extracted substring matches the input string with padding validation
/// @dev Character-by-character verification:
///      - Characters within length must match between extracted and input
///      - Characters beyond length must be 0 (padding) in input
template VerifyExtractedString(MAX_LENGTH) {
    signal input extracted[MAX_LENGTH];  // String extracted from payload
    signal input input_string[MAX_LENGTH];  // String provided as input (padded)
    signal input length;  // Actual length of the string

    // Verify each character matches (with padding)
    component char_match[MAX_LENGTH];
    for (var i = 0; i < MAX_LENGTH; i++) {
        char_match[i] = GreaterThan(log2Ceil(MAX_LENGTH));
        char_match[i].in[0] <== length;
        char_match[i].in[1] <== i;

        // If within length: extracted must equal input
        // If beyond length: input must be 0 (padding)
        char_match[i].out * (extracted[i] - input_string[i]) === 0;
        (1 - char_match[i].out) * input_string[i] === 0;
    }
}
