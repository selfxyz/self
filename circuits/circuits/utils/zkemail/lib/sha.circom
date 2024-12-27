pragma circom 2.1.6;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/constants.circom";
include "circomlib/circuits/sha256/sha256compression.circom";
include "circomlib/circuits/comparators.circom";
include "./fp.circom";
include "../utils/array.circom";
include "../utils/functions.circom";


/// @title Sha256Bytes
/// @notice Computes the SHA256 hash of input bytes
/// @input paddedIn Message to hash, padded as per the SHA256 specification; assumes to consist of bytes
/// @input paddedInLength Length of the padded message; assumes to be in `ceil(log2(8 * maxByteLength))` bits
/// @output out The 256-bit hash of the input message
template Sha256Bytes(maxByteLength) {
    signal input paddedIn[maxByteLength];
    signal input paddedInLength;
    signal output out[256];

    var maxBits = maxByteLength * 8;
    component sha = Sha256General(maxBits);

    component bytes[maxByteLength];
    for (var i = 0; i < maxByteLength; i++) {
        bytes[i] = Num2Bits(8);
        bytes[i].in <== paddedIn[i];
        for (var j = 0; j < 8; j++) {
            sha.paddedIn[i*8+j] <== bytes[i].out[7-j];
        }
    }
    sha.paddedInLength <== paddedInLength * 8;

    for (var i = 0; i < 256; i++) {
        out[i] <== sha.out[i];
    }
}


/// @title Sha256BytesPartial
/// @notice Computes the SHA256 hash of input bytes with a precomputed state
/// @input paddedIn Message to hash padded as per the SHA256 specification; assumes to consist of bytes
/// @input paddedInLength Length of the padded message; assumes to be in `ceil(log2(8 * maxByteLength))` bits
/// @input preHash The precomputed state of the hash
/// @output out SHA hash the input message with the precomputed state
template Sha256BytesPartial(maxByteLength) {
    assert(maxByteLength % 32 == 0);

    signal input paddedIn[maxByteLength];
    signal input paddedInLength;
    signal input preHash[32];
    signal output out[256];

    var maxBits = maxByteLength * 8;
    component sha = Sha256Partial(maxBits);

    component bytes[maxByteLength];
    for (var i = 0; i < maxByteLength; i++) {
        bytes[i] = Num2Bits(8);
        bytes[i].in <== paddedIn[i];
        for (var j = 0; j < 8; j++) {
            sha.paddedIn[i*8+j] <== bytes[i].out[7-j];
        }
    }
    sha.paddedInLength <== paddedInLength * 8;

    component states[32];
    for (var i = 0; i < 32; i++) {
        states[i] = Num2Bits(8);
        states[i].in <== preHash[i];
        for (var j = 0; j < 8; j++) {
            sha.preHash[8*i+j] <== states[i].out[7-j];
        }
    }

    for (var i = 0; i < 256; i++) {
        out[i] <== sha.out[i];
    }
}


/// @title Sha256General
/// @notice A modified version of the SHA256 circuit that allows specified length messages up to a 
///         max to all work via array indexing on the SHA256 compression circuit.
/// @input paddedIn Message to hash padded as per the SHA256 specification; assumes to consist of bits
/// @input paddedInLength Length of the padded message; assumes to be in `ceil(log2(maxBitLength))` bits
/// @output out The 256-bit hash of the input message
template Sha256General(maxBitLength) {
    // maxBitLength must be a multiple of 512
    // the bit circuits in this file are limited to 15 so must be raised if the message is longer.
    assert(maxBitLength % 512 == 0);

    var maxBitsPaddedBits = log2Ceil(maxBitLength);

    // Note that maxBitLength = maxBits + 64
    signal input paddedIn[maxBitLength];
    signal input paddedInLength;
    
    signal output out[256];
    
    signal inBlockIndex;

    var i;
    var k;
    var j;
    var maxBlocks;
    var bitsLastBlock;
    maxBlocks = (maxBitLength\512);

    inBlockIndex <-- (paddedInLength >> 9);
    paddedInLength === inBlockIndex * 512;

    // These verify the unconstrained floor calculation is the uniquely correct integer that represents the floor
    // component floorVerifierUnder = LessEqThan(maxBitsPaddedBits); // todo verify the length passed in is less than nbits. note that maxBitsPaddedBits can likely be lowered or made it a fn of maxbits
    // floorVerifierUnder.in[0] <== (inBlockIndex)*512;
    // floorVerifierUnder.in[1] <== paddedInLength;
    // floorVerifierUnder.out === 1;

    // component floorVerifierOver = GreaterThan(maxBitsPaddedBits);
    // floorVerifierOver.in[0] <== (inBlockIndex+1)*512;
    // floorVerifierOver.in[1] <== paddedInLength;
    // floorVerifierOver.out === 1;

    // These verify we pass in a valid number of bits to the SHA256 compression circuit.
    component bitLengthVerifier = LessEqThan(maxBitsPaddedBits); // todo verify the length passed in is less than nbits. note that maxBitsPaddedBits can likely be lowered or made it a fn of maxbits
    bitLengthVerifier.in[0] <== paddedInLength;
    bitLengthVerifier.in[1] <== maxBitLength;
    bitLengthVerifier.out === 1;

    // Note that we can no longer do padded verification efficiently inside the SHA because it requires non deterministic array indexing.
    // We can do it if we add a constraint, but since guessing a valid SHA2 preimage is hard anyways, we'll just do it outside the circuit.

    // signal paddedIn[maxBlocks*512];
    // for (k=0; k<maxBits; k++) {
    //     paddedIn[k] <== in[k];
    // }
    // paddedIn[maxBits] <== 1;
    // for (k=maxBits+1; k<maxBlocks*512-64; k++) {
    //     paddedIn[k] <== 0;
    // }
    // for (k = 0; k< 64; k++) {
    //     paddedIn[maxBlocks*512 - k -1] <== (maxBits >> k)&1;
    // }

    component ha0 = H(0);
    component hb0 = H(1);
    component hc0 = H(2);
    component hd0 = H(3);
    component he0 = H(4);
    component hf0 = H(5);
    component hg0 = H(6);
    component hh0 = H(7);

    component sha256compression[maxBlocks];

    for (i=0; i<maxBlocks; i++) {
        sha256compression[i] = Sha256compression() ;

        if (i==0) {
            for (k=0; k<32; k++ ) {
                sha256compression[i].hin[0*32+k] <== ha0.out[k];
                sha256compression[i].hin[1*32+k] <== hb0.out[k];
                sha256compression[i].hin[2*32+k] <== hc0.out[k];
                sha256compression[i].hin[3*32+k] <== hd0.out[k];
                sha256compression[i].hin[4*32+k] <== he0.out[k];
                sha256compression[i].hin[5*32+k] <== hf0.out[k];
                sha256compression[i].hin[6*32+k] <== hg0.out[k];
                sha256compression[i].hin[7*32+k] <== hh0.out[k];
            }
        } else {
            for (k=0; k<32; k++ ) {
                sha256compression[i].hin[32*0+k] <== sha256compression[i-1].out[32*0+31-k];
                sha256compression[i].hin[32*1+k] <== sha256compression[i-1].out[32*1+31-k];
                sha256compression[i].hin[32*2+k] <== sha256compression[i-1].out[32*2+31-k];
                sha256compression[i].hin[32*3+k] <== sha256compression[i-1].out[32*3+31-k];
                sha256compression[i].hin[32*4+k] <== sha256compression[i-1].out[32*4+31-k];
                sha256compression[i].hin[32*5+k] <== sha256compression[i-1].out[32*5+31-k];
                sha256compression[i].hin[32*6+k] <== sha256compression[i-1].out[32*6+31-k];
                sha256compression[i].hin[32*7+k] <== sha256compression[i-1].out[32*7+31-k];
            }
        }

        for (k=0; k<512; k++) {
            sha256compression[i].inp[k] <== paddedIn[i*512+k];
        }
    }

    // Select the correct compression output for the given length, instead of just the last one.
    component arraySelectors[256];
    for (k=0; k<256; k++) {
        arraySelectors[k] = ItemAtIndex(maxBlocks);
        for (j=0; j<maxBlocks; j++) {
            arraySelectors[k].in[j] <== sha256compression[j].out[k];
        }
        arraySelectors[k].index <== inBlockIndex - 1; // The index is 0 indexed and the block numbers are 1 indexed.
        out[k] <== arraySelectors[k].out;
    }

    // for (k=0; k<256; k++) {
    //     out[k] <== sha256compression[maxBlocks-1].out[k];
    // }
}


/// @title Sha256Partial
/// @notice Calculates the SHA256 hash of a message with a precomputed state
/// @input paddedIn Message to hash padded as per the SHA256 specification; assumes to consist of bits
/// @input paddedInLength Length of the padded message; assumes to be in `ceil(log2(maxBitLength))` bits
/// @input preHash The precomputed state of the hash; assumes to consist of bits
/// @output out The 256-bit hash of the input message
template Sha256Partial(maxBitLength) {
    // maxBitLength must be a multiple of 512
    // the bit circuits in this file are limited to 15 so must be raised if the message is longer.
    assert(maxBitLength % 512 == 0);

    var maxBitsPaddedBits = log2Ceil(maxBitLength);

    // Note that maxBitLength = maxBits + 64
    signal input paddedIn[maxBitLength];
    signal input paddedInLength; 
    signal input preHash[256];

    signal output out[256];

    signal inBlockIndex;

    var i;
    var k;
    var j;
    var maxBlocks;
    var bitsLastBlock;
    maxBlocks = (maxBitLength\512);

    inBlockIndex <-- (paddedInLength >> 9);
    paddedInLength === inBlockIndex * 512;

    // These verify we pass in a valid number of bits to the SHA256 compression circuit.
    component bitLengthVerifier = LessEqThan(maxBitsPaddedBits); // todo verify the length passed in is less than nbits. note that maxBitsPaddedBits can likely be lowered or made it a fn of maxbits
    bitLengthVerifier.in[0] <== paddedInLength;
    bitLengthVerifier.in[1] <== maxBitLength;
    bitLengthVerifier.out === 1;

    component sha256compression[maxBlocks];

    for (i=0; i<maxBlocks; i++) {
        sha256compression[i] = Sha256compression() ;

        if (i==0) {
            for (k=0; k<32; k++ ) {
                sha256compression[i].hin[32*0+k] <== preHash[32*0+31-k];
                sha256compression[i].hin[32*1+k] <== preHash[32*1+31-k];
                sha256compression[i].hin[32*2+k] <== preHash[32*2+31-k];
                sha256compression[i].hin[32*3+k] <== preHash[32*3+31-k];
                sha256compression[i].hin[32*4+k] <== preHash[32*4+31-k];
                sha256compression[i].hin[32*5+k] <== preHash[32*5+31-k];
                sha256compression[i].hin[32*6+k] <== preHash[32*6+31-k];
                sha256compression[i].hin[32*7+k] <== preHash[32*7+31-k];
            }
        } else {
            for (k=0; k<32; k++ ) {
                sha256compression[i].hin[32*0+k] <== sha256compression[i-1].out[32*0+31-k];
                sha256compression[i].hin[32*1+k] <== sha256compression[i-1].out[32*1+31-k];
                sha256compression[i].hin[32*2+k] <== sha256compression[i-1].out[32*2+31-k];
                sha256compression[i].hin[32*3+k] <== sha256compression[i-1].out[32*3+31-k];
                sha256compression[i].hin[32*4+k] <== sha256compression[i-1].out[32*4+31-k];
                sha256compression[i].hin[32*5+k] <== sha256compression[i-1].out[32*5+31-k];
                sha256compression[i].hin[32*6+k] <== sha256compression[i-1].out[32*6+31-k];
                sha256compression[i].hin[32*7+k] <== sha256compression[i-1].out[32*7+31-k];
            }
        }

        for (k=0; k<512; k++) {
            sha256compression[i].inp[k] <== paddedIn[i*512+k];
        }
    }

    // Select the correct compression output for the given length, instead of just the last one.
    component arraySelectors[256];
    for (k=0; k<256; k++) {
        arraySelectors[k] = ItemAtIndex(maxBlocks);
        for (j=0; j<maxBlocks; j++) {
            arraySelectors[k].in[j] <== sha256compression[j].out[k];
        }
        arraySelectors[k].index <== inBlockIndex - 1; // The index is 0 indexed and the block numbers are 1 indexed.
        out[k] <== arraySelectors[k].out;
    }

    // for (k=0; k<256; k++) {
    //     out[k] <== sha256compression[maxBlocks-1].out[k];
    // }
}
