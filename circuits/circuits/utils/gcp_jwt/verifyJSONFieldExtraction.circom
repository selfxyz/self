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

    // Ensure key_offset is at least 1 (prevents underflow in key_offset - 1)
    component key_offset_min = GreaterEqThan(log2Ceil(maxJSONLength));
    key_offset_min.in[0] <== key_offset;
    key_offset_min.in[1] <== 1;
    key_offset_min.out === 1;

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

    // Validate JSON array structure: "key":["value"] or "key": ["value"]
    signal colon_position <== key_offset + key_length + 1;

    // Check character at colon+1: must be '[' (91) or space (32)
    signal char_after_colon <== ItemAtIndex(maxJSONLength)(json, colon_position + 1);

    signal value_start <== ItemAtIndex(maxJSONLength)(json, value_offset);

    // is_bracket: 1 if char is '[', 0 otherwise
    component is_bracket = IsEqual();
    is_bracket.in[0] <== char_after_colon;
    is_bracket.in[1] <== 91;  // '['

    // is_quote: 1 if char is quote, 0 otherwise
    component is_quote = IsEqual();
    is_quote.in[0] <== char_after_colon;
    is_quote.in[1] <== 34;  // "

    // Exactly one must be true: char is either [ or quote
    is_bracket.out + is_quote.out === 1;

    // When is_bracket=1 : expect quote at colon+2
    signal char_at_plus2 <== ItemAtIndex(maxJSONLength)(json, colon_position + 2);
    // Constraint: if is_bracket=1, char_at_plus2 must be quote(34)
    //             if is_quote=1, char_at_plus2 must be value[0]
    is_bracket.out * (char_at_plus2 - 34) === 0;  // If bracket at +1, quote at +2
    component is_value_after_quote = IsEqual();
    is_value_after_quote.in[0] <== char_at_plus2;
    is_value_after_quote.in[1] <== value_start;
    is_quote.out * (1 - is_value_after_quote.out) === 0;

    // Extract value from JSON and output directly
    extracted_value <== SelectSubArray(
        maxJSONLength,
        maxValueLength
    )(json, value_offset, value_length);

	// Validate value ends with closing quote and then either ']' or ',' after
    signal closing_quote <== ItemAtIndex(maxJSONLength)(json, value_offset + value_length);
    closing_quote === 34;  // ASCII code for "

	// The character following the closing quote must be either ']' (93) or ',' (44)
	signal char_after_quote <== ItemAtIndex(maxJSONLength)(json, value_offset + value_length + 1);
	component is_closing_bracket = IsEqual();
	is_closing_bracket.in[0] <== char_after_quote;
	is_closing_bracket.in[1] <== 93;  // ']'

	component is_comma = IsEqual();
	is_comma.in[0] <== char_after_quote;
	is_comma.in[1] <== 44;  // ','

	// Exactly one of the two must be true
	is_closing_bracket.out + is_comma.out === 1;
}
