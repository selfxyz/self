pragma circom 2.1.6;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "./array.circom";
include "./constants.circom";
include "./functions.circom";


function computeIntChunkLength(byteLength) {
    var packSize = MAX_BYTES_IN_FIELD();

    var remain = byteLength % packSize;
    var numChunks = (byteLength - remain) / packSize;
    if (remain > 0) {
        numChunks += 1;
    }

    return numChunks;
}


/// @title PackBytes
/// @notice Pack an array of bytes to numbers that fit in the field
/// @param maxBytes the maximum number of bytes in the input array
/// @input in the input byte array; assumes elements to be bytes
/// @output out the output integer array
template PackBytes(maxBytes) {
    var packSize = MAX_BYTES_IN_FIELD();
    var maxInts = computeIntChunkLength(maxBytes);

    signal input in[maxBytes];
    signal output out[maxInts];

    signal intSums[maxInts][packSize];

    for (var i = 0; i < maxInts; i++) {
        for(var j=0; j < packSize; j++) {
            var idx = packSize * i + j;

            // Copy the previous value if we are out of bounds - we take last item as final result
            if(idx >= maxBytes) {
                intSums[i][j] <== intSums[i][j-1];
            } 
            // First item of each chunk is the byte itself
            else if (j == 0){
                intSums[i][j] <== in[idx];
            }
            // Every other item is 256^j * byte
            else {
                intSums[i][j] <== intSums[i][j-1] + (1 << (8*j)) * in[idx];
            }
        }
    }
    
    // Last item of each chunk is the final sum
    for (var i = 0; i < maxInts; i++) {
        out[i] <== intSums[i][packSize-1];
    }
}


/// @title PackByteSubArray
/// @notice Select sub array from the input array and pack it to numbers that fit in the field
/// @notice This is not used in ZK-Email circuits anywhere
/// @param maxArrayLen the maximum number of elements in the input array
/// @param maxSubArrayLen the maximum number of elements in the sub array
/// @input in the input byte array; assumes elements to be bytes
/// @input startIndex the start index of the sub array; assumes to be a valid index
/// @input length the length of the sub array; assumes to fit in `ceil(log2(maxSubArrayLen))` bits
/// @output out the output integer array
template PackByteSubArray(maxArrayLen, maxSubArrayLen) {
    assert(maxSubArrayLen < maxArrayLen);
    var chunkLength = computeIntChunkLength(maxSubArrayLen);

    signal input in[maxArrayLen];
    signal input startIndex;
    signal input length;

    signal output out[chunkLength];

    component SelectSubArray = SelectSubArray(maxArrayLen, maxSubArrayLen);
    SelectSubArray.in <== in;
    SelectSubArray.startIndex <== startIndex;
    SelectSubArray.length <== length;

    component packer = PackBytes(maxSubArrayLen);
    packer.in <== SelectSubArray.out;

    out <== packer.out;
}


/// @title DigitBytesToInt
/// @notice Converts a byte array representing digits to an integer
/// @notice Assumes the output number fits in the field
/// @param n The number of bytes in the input array
/// @input in The input byte array; assumes elements are between 48 and 57 (ASCII numbers)
/// @output out The output integer; assumes to fit in the field
template DigitBytesToInt(n) {
    signal input in[n];

    signal output out;

    signal sums[n+1];
    sums[0] <== 0;

    for(var i = 0; i < n; i++) {
        sums[i + 1] <== 10 * sums[i] + (in[i] - 48);
    }

    out <== sums[n];
}


// NOTE: this circuit is unaudited and should not be used in production
/// @title SplitBytesToWords
/// @notice split an array of bytes into an array of words
/// @notice useful for casting a message or modulus before RSA verification
/// @param l: number of bytes in the input array
/// @param n: number of bits in a word
/// @param k: number of words
/// @input in: array of bytes
/// @output out: array of words
template SplitBytesToWords (l,n,k) {
    signal input in[l];
    signal output out[k];

    component num2bits[l];
    for (var i = 0 ; i < l ; i++){
        num2bits[i] = Num2Bits(8);
        num2bits[i].in <== in[i];
    }
    component bits2num[k];
    for (var i = 0 ; i < k ; i++){
        bits2num[i] = Bits2Num(n);
        for(var j = 0 ; j < n ; j++){
            if(i*n + j >=  8 * l){
                bits2num[i].in[j] <==  0;
            }
            else{
                bits2num[i].in[j] <== num2bits[l - (( i * n + j) \ 8) - 1].out[ ((i * n + j) % 8)];
            }
        }
    }
    for( var i = 0 ; i< k ; i++){
    out[i] <== bits2num[i].out;
    }
}

// Asserts that a given input is binary.
//
// Inputs:
// - in: an input signal, expected to be 0 or 1.
template AssertBit() {
    signal input in;
    in * (in - 1) === 0;
}

// The ByteMask template masks an input array using a binary mask array.
// Each element in the input array is multiplied by the corresponding element in the mask array.
// The mask array is validated to ensure all elements are binary (0 or 1).
//
// Parameters:
// - maxLength: The maximum length of the input and mask arrays.
//
// Inputs:
// - body: An array of signals representing the body to be masked.
// - mask: An array of signals representing the binary mask.
//
// Outputs:
// - out: An array of signals representing the masked input.
template ByteMask(maxLength) {
    signal input in[maxLength];
    signal input mask[maxLength];
    signal output out[maxLength];

    component bit_check[maxLength];

    for (var i = 0; i < maxLength; i++) {
        bit_check[i] = AssertBit();
        bit_check[i].in <== mask[i];
        out[i] <== in[i] * mask[i];
    }
}