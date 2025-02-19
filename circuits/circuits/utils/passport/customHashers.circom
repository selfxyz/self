pragma circom 2.1.9;
include "../crypto/bigInt/bigIntFunc.circom";
include "circomlib/circuits/poseidon.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "circomlib/circuits/comparators.circom";

/// @notice CutomHasher circuit - used to Poseidon up to 256 signals
/// @param k Number of signals to hash
/// @input in Input signals
/// @output out Output hash

template CustomHasher(k) {
    signal input in[k];
    signal output out;

    if (k < 16){ // if k is less than 16, we can use a single poseidon hash
        component hash = Poseidon(k);
        for (var i = 0; i < k; i++){
            hash.inputs[i] <== in[i];
        }
        out <== hash.out;
    }

    else{
        // do up to 16 rounds of poseidon
        var rounds =  div_ceil(k, 16);
        assert(rounds < 17);
        component hash[rounds];
        for (var i = 0; i < rounds ; i ++){
            hash[i] = Poseidon(16);
        }

        for (var i = 0; i < rounds ; i ++){
            for (var j = 0; j < 16 ; j ++){
                if (i * 16 + j < k){
                    hash[i].inputs[j] <== in[i * 16 + j];
                } else {
                    hash[i].inputs[j] <== 0;
                }
            }
        }

        component finalHash = Poseidon(rounds);
        for (var i = 0 ; i < rounds ; i++) {
            finalHash.inputs[i] <== hash[i].out;
        }
        out <== finalHash.out;
    }
}

/// @notice PackBytesAndPoseidon circuit — used to pack a byte array and hash it
/// @param k Size of the array to pack
/// @param in Input array
/// @param out Output hash
template PackBytesAndPoseidon(k) {
    signal input in[k];

    AssertBytes(k)(in);

    var packed_length = computeIntChunkLength(k);
    signal packed[packed_length] <== PackBytes(k)(in);
    signal output out <== CustomHasher(packed_length)(packed);
}

/// @title AssertBytes
/// @notice Asserts that every element in the input array is a valid byte (i.e., less than 256).
/// @param k The number of elements in the input array.
/// @param in The input array containing byte values to be validated.
/// @dev This template uses a chain of LessThan components to check that each byte is below 256. The results are cumulatively multiplied in checkArray, and the final constraint (checkArray[k-1] === 1) enforces that all bytes meet the condition.
template AssertBytes(k) {
    signal input in[k];
    component num2bits[k];

    for (var i = 0; i < k; i++) {
        num2bits[i] = Num2Bits(8);
        num2bits[i].in <== in[i];
    }
}
