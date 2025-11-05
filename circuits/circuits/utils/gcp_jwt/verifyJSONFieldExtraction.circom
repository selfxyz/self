pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";

/// @title ExtractAndVerifyJSONField
/// @notice Verifies JSON key name and extracts the related value
/// @dev Validates the JSON key name and position, then extracts and outputs the value directly.
/// @param maxJSONLength Maximum length of the JSON string
/// @param maxKeyNameLength Maximum length of the JSON key name (without quotes)
/// @param maxValueLength Maximum length of the extracted value
/// @input json The JSON string to extract from
/// @input key_offset Offset where the JSON key name starts (position after opening quote)
/// @input key_length Actual length of the key name
/// @input value_offset Offset where the value starts (raw value, without quotes if string)
/// @input value_length Actual length of the value
/// @input expected_key_name Expected key name as array of ASCII codes (without quotes)
/// @output extracted_value The value extracted from the JSON at the specified offset
template ExtractAndVerifyJSONField(
    maxJSONLength,
    maxKeyNameLength,
    maxValueLength
) {
    signal input json[maxJSONLength];
    signal input key_offset;
    signal input key_length;
    signal input value_offset;
    signal input value_length;

    signal input expected_key_name[maxKeyNameLength];

    signal output extracted_value[maxValueLength];

    // Verify opening quote before key
    signal key_quote_before <== ItemAtIndex(maxJSONLength)(json, key_offset - 1);
    key_quote_before === 34;  // ASCII code for "

    // Extract key name from JSON
    signal extracted_key_name[maxKeyNameLength] <== SelectSubArray(
        maxJSONLength,
        maxKeyNameLength
    )(json, key_offset, key_length);

    // Verify key name matches expected (with padding validation)
    component key_char_match[maxKeyNameLength];
    for (var i = 0; i < maxKeyNameLength; i++) {
        key_char_match[i] = GreaterThan(log2Ceil(maxKeyNameLength));
        key_char_match[i].in[0] <== key_length;
        key_char_match[i].in[1] <== i;

        // If within length: extracted must equal expected
        // If beyond length: expected must be 0 (padding)
        key_char_match[i].out * (extracted_key_name[i] - expected_key_name[i]) === 0;
        (1 - key_char_match[i].out) * expected_key_name[i] === 0;
    }

    // Verify closing quote after key
    signal key_quote_after <== ItemAtIndex(maxJSONLength)(json, key_offset + key_length);
    key_quote_after === 34;  // ASCII code for "

    // Verify colon after closing quote (ensures valid JSON key:value structure)
    signal colon_after_key <== ItemAtIndex(maxJSONLength)(json, key_offset + key_length + 1);
    colon_after_key === 58;  // ASCII code for ':'

    // Verify value comes after key (prevents offset confusion attacks)
    component offset_check = GreaterThan(log2Ceil(maxJSONLength));
    offset_check.in[0] <== value_offset;
    offset_check.in[1] <== key_offset + key_length;
    offset_check.out === 1;

    // Extract value from JSON and output directly
    extracted_value <== SelectSubArray(
        maxJSONLength,
        maxValueLength
    )(json, value_offset, value_length);
}
