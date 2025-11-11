pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/hash.circom";
include "@openpassport/zk-email-circuits/lib/sha.circom";
include "@openpassport/zk-email-circuits/lib/base64.circom";
include "../utils/passport/signatureVerifier.circom";
include "../utils/passport/customHashers.circom";
include "../utils/crypto/bitify/bytes.circom";

/// @title SelectSubArrayBase64
/// @notice Select sub array from an array and pad with 'A' for Base64
/// @notice This is similar to `SelectSubArray` but pads with 'A' (ASCII 65) instead of zero
/// @notice Useful for preparing Base64 encoded data for decoding
/// @param maxArrayLen: the maximum number of bytes in the input array
/// @param maxSubArrayLen: the maximum number of integers in the output array
/// @input in: the input array
/// @input startIndex: the start index of the sub array; assumes a valid index
/// @input length: the length of the sub array; assumes to fit in `ceil(log2(maxArrayLen))` bits
/// @output out: array of `maxSubArrayLen` size, items starting from `startIndex`, and items after `length` set to 'A' (ASCII 65)
/// @see https://github.com/zkemail/zk-jwt/blob/3a50a9b/packages/circuits/utils/array.circom#L15
template SelectSubArrayBase64(maxArrayLen, maxSubArrayLen) {
    assert(maxSubArrayLen <= maxArrayLen);

    signal input in[maxArrayLen];
    signal input startIndex;
    signal input length;

    signal output out[maxSubArrayLen];

    component shifter = VarShiftLeft(maxArrayLen, maxSubArrayLen);
    shifter.in <== in;
    shifter.shift <== startIndex;

    component gts[maxSubArrayLen];
    for (var i = 0; i < maxSubArrayLen; i++) {
        gts[i] = GreaterThan(log2Ceil(maxSubArrayLen));
        gts[i].in[0] <== length;
        gts[i].in[1] <== i;

        // Pad with 'A' (ASCII 65) instead of zero
        out[i] <== gts[i].out * shifter.out[i] + (1 - gts[i].out) * 65;
    }
}

/// @title FindRealMessageLength
/// @notice Finds the length of the real message in a padded array by locating the first occurrence of 128
/// @dev This template is specifically designed for Base64 encoded strings followed by SHA-256 padding.
///      It works because:
///      1. Base64 uses characters with ASCII values < 128
///      2. SHA-256 padding starts with 128 (10000000 in binary)
///      3. The first 128 encountered marks the end of the Base64 string and start of padding
/// @input in[maxLength] The padded message array
/// @input maxLength The maximum possible length of the padded message
/// @output realLength The length of the real message (before padding)
/// @see https://github.com/zkemail/zk-jwt/blob/3a50a9b/packages/circuits/utils/bytes.circom#L15
template FindRealMessageLength(maxLength) {
    signal input in[maxLength];
    signal output realLength;

    // Signal to track if we've found 128
    signal found[maxLength + 1];
    found[0] <== 0;

    // Signal to accumulate the length
    signal lengthAcc[maxLength + 1];
    lengthAcc[0] <== 0;

    signal is128[maxLength];

    // Iterate through the array
    for (var i = 0; i < maxLength; i++) {
        // Check if current element is 128
        is128[i] <== IsEqual()([in[i], 128]);

        // Update found signal
        found[i + 1] <== found[i] + is128[i] - found[i] * is128[i];

        // If 128 not found yet, increment length
        lengthAcc[i + 1] <== lengthAcc[i] + 1 - found[i + 1];
    }

    // The final accumulated length is our real message length
    realLength <== lengthAcc[maxLength];

    // Constraint to ensure 128 was really found
    found[maxLength] === 1;
}

/// @title CountCharOccurrences
/// @notice Counts the number of occurrences of a specified character in an array
/// @dev This template iterates through the input array and counts how many times the specified character appears.
/// @input in[maxLength] The input array in which to count occurrences of the character
/// @input char The character to count within the input array
/// @output count The number of times the specified character appears in the input array
/// @see https://github.com/zkemail/zk-jwt/blob/3a50a9b/packages/circuits/utils/bytes.circom#L54
template CountCharOccurrences(maxLength) {
    signal input in[maxLength];
    signal input char;
    signal output count;

    signal match[maxLength];
    signal counter[maxLength];

    match[0] <== IsEqual()([in[0], char]);
    counter[0] <== match[0];

    for (var i = 1; i < maxLength; i++) {
        match[i] <== IsEqual()([in[i], char]);
        counter[i] <== counter[i-1] + match[i];
    }

    count <== counter[maxLength-1];
}

/// @title JWTVerifier
/// @notice Verifies JWT signatures and extracts header/payload components
/// @dev This template verifies RSA-SHA256 signed JWTs and decodes Base64 encoded components.
///      It works by:
///      1. Verifying message length and padding
///      2. Computing SHA256 hash of `header.payload`
///      3. Verifying RSA signature against public key
///      4. Extracting and decoding Base64 header/payload
///      5. Computing public key hash for external reference
/// @param n RSA chunk size in bits (n < 127 for field arithmetic)
/// @param k Number of RSA chunks (n*k > 2048 for RSA-2048)
/// @param maxMessageLength Maximum JWT string length (must be multiple of 64 for SHA256)
/// @param maxB64HeaderLength Maximum Base64 header length (must be multiple of 4)
/// @param maxB64PayloadLength Maximum Base64 payload length (must be multiple of 4)
/// @input message[maxMessageLength] JWT string (header.payload)
/// @input messageLength Actual length of JWT string
/// @input pubkey[k] RSA public key in k chunks
/// @input signature[k] RSA signature in k chunks
/// @input periodIndex Location of period separating header.payload
/// @output publicKeyHash Poseidon hash of public key
/// @output header[maxHeaderLength] Decoded JWT header
/// @output payload[maxPayloadLength] Decoded JWT payload
/// @notice Modified version of ZK-Email's `JWTVerifier`, adapted to use Self's `SignatureVerifier` circuit for RSA verification
/// @see https://github.com/zkemail/zk-jwt/blob/3a50a9b/packages/circuits/jwt-verifier.circom#L35
template JWTVerifier(
    n,
    k,
    maxMessageLength,
    maxB64HeaderLength,
    maxB64PayloadLength
) {
    signal input message[maxMessageLength]; // JWT message (header + payload)
    signal input messageLength; // Length of the message signed in the JWT
    signal input pubkey[k]; // RSA public key split into k chunks
    signal input signature[k]; // RSA signature split into k chunks
    signal input periodIndex; // Index of the period in the JWT message

    var maxHeaderLength = (maxB64HeaderLength * 3) \ 4;
    var maxPayloadLength = (maxB64PayloadLength * 3) \ 4;

    signal output publicKeyHash;
    signal output header[maxHeaderLength];
    signal output payload[maxPayloadLength];

    // Assert message length fits in ceil(log2(maxMessageLength))
    component n2bMessageLength = Num2Bits(log2Ceil(maxMessageLength));
    n2bMessageLength.in <== messageLength;

    // Assert message data after messageLength are zeros
    AssertZeroPadding(maxMessageLength)(message, messageLength);

    // Calculate SHA256 hash of the JWT message
    signal sha[256] <== Sha256Bytes(maxMessageLength)(message, messageLength);

    SignatureVerifier(1, n, k)(
        sha,
        pubkey,
        signature
    );

    // Calculate the pubkey hash
    publicKeyHash <== CustomHasher(k)(pubkey);

    // Assert that period exists at periodIndex
    signal period <== ItemAtIndex(maxMessageLength)(message, periodIndex);
    period === 46;

    // Assert that period is unique
    signal periodCount <== CountCharOccurrences(maxMessageLength)(message, 46);
    periodCount === 1;

    // Find the real message length
    signal realMessageLength <== FindRealMessageLength(maxMessageLength)(message);

    // Calculate the length of the Base64 encoded header and payload
    signal b64HeaderLength <== periodIndex;
    signal b64PayloadLength <== realMessageLength - b64HeaderLength - 1;

    // Extract the Base64 encoded header and payload from the message
    signal b64Header[maxB64HeaderLength] <== SelectSubArrayBase64(maxMessageLength, maxB64HeaderLength)(message, 0, b64HeaderLength);
    signal b64Payload[maxB64PayloadLength] <== SelectSubArrayBase64(maxMessageLength, maxB64PayloadLength)(message, b64HeaderLength + 1, b64PayloadLength);

    // Decode the Base64 encoded header and payload
    header <== Base64Decode(maxHeaderLength)(b64Header);
    payload <== Base64Decode(maxPayloadLength)(b64Payload);
}
