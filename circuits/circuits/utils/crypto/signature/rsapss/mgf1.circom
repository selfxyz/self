pragma circom 2.1.6;

include "circomlib/circuits/bitify.circom";

/*
 * MGF1 (Mask Generation Function) Implementation
 * ============================================
 * MGF1 is used in RSA-PSS to generate a mask of specified length from a seed value.
 * It uses an underlying hash function (SHA-512/384/256) to generate the mask.
 *
 * The function works by:
 * 1. Concatenating the seed with a 4-byte counter
 * 2. Hashing the concatenated value
 * 3. Incrementing counter and repeating until enough output bits are generated
 */

 /// @title MGF1 with configurable SHA hash function
/// @notice Implements MGF1 using SHA-512/384/256 as the underlying hash function
/// @param hashLenBits len of SHA hash in bits (512, 384, or 256)
/// @param seedLen Length of the input seed in bytes
/// @param maskLen Desired length of the output mask in bytes
/// @input seed Input seed value as array of bits
/// @output out Generated mask as array of bits
template Mgf1(hashLenBits, seedLen, maskLen) {
    // Validate hash length
    assert(hashLenBits == 512 || hashLenBits == 384 || hashLenBits == 256);

    // Calculate hash-specific parameters
    var hashLen = hashLenBits \ 8;
    // var hashLenBits = hashLen * 8;
    var seedLenBits = seedLen * 8;
    var maskLenBits = maskLen * 8;

    // Input/output signals
    signal input seed[seedLenBits];
    signal output out[maskLenBits];

    // Verify mask length doesn't exceed maximum allowed
    assert(maskLen <= 0xffffffff * hashLen);

    // Calculate iterations needed
    var iterations = (maskLen \ hashLen) + 1; //adding 1, in-case maskLen \ hashLen is 0

    // Initialize components
    component shaHash[iterations];
    component num2Bits[iterations];

    // Configure hash components based on type
    for (var i = 0; i < iterations; i++) {
        if (hashLenBits == 512) {
            shaHash[i] = ShaHashBits(544, 512);
        } else if (hashLenBits == 384) {
            shaHash[i] = ShaHashBits(416, 384);
        } else {
            // shaHash[i] = ShaHashChunks(1, 256);
            shaHash[i] = ShaHashBits(288, 256);

        }
        num2Bits[i] = Num2Bits(32);
    }

    var concated[1024]; // Using max size needed
    signal hashed[hashLenBits * iterations];

    // Copy seed to concatenated array
    for (var i = 0; i < seedLenBits; i++) {
        concated[i] = seed[i];
    }

    // Main MGF1 logic
    for (var i = 0; i < iterations; i++) {
        num2Bits[i].in <== i;

        // Concatenate counter
        for (var j = 0; j < 32; j++) {
            //concat seed and counter
            concated[seedLenBits + j] = num2Bits[i].out[31-j];
        }

        // Input to hash function
        if (hashLenBits == 256) {
            for (var k = 0; k < 288; k++) {
                shaHash[i].in[k] <== concated[k];
            }
        }

        if (hashLenBits == 384) {
            for (var k = 0; k < 416; k++) {
                shaHash[i].in[k] <== concated[k];
            }
        }

        if (hashLenBits == 512) {
            for (var k = 0; k < 544; k++) {
                shaHash[i].in[k] <== concated[k];
            }
        }

        // Store hash output
        for (var j = 0; j < hashLenBits; j++) {
            hashed[i * hashLenBits + j] <== shaHash[i].out[j];
        }
    }

    // Output assignment
    for (var i = 0; i < maskLenBits; i++) {
        out[i] <== hashed[i];
    }
}
