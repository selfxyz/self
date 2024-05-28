pragma circom 2.1.5;
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";


template Mgf1_sha256(seedLen, maskLen) { //in bytes
    var seedLenBits = seedLen * 8;
    var maskLenBits = maskLen * 8;
    var hashLen = 32; //output len of sha function in bytes 
    var hashLenBits = hashLen * 8;//output len of sha function in bits

    signal input seed[seedLenBits]; //each represents a bit
    signal output mask[maskLenBits];
    
    assert(maskLen <= 0xffffffff * hashLen );
    var iterations = (maskLen / hashLen) + 1; //adding 1, in-case maskLen/hashLen is 0

    component sha256[iterations];
    component num2Bits[iterations];

    for (var i = 0; i < iterations; i++) {
        sha256[i] = Sha256(seedLenBits + 32); //32 bits for counter
        num2Bits[i] = Num2Bits(32);
    }

    var concated[seedLenBits + 32]; //seed + 32 bits(4 Bytes) for counter
    signal hashed[hashLenBits * (iterations)];

    for (var i = 0; i < seedLenBits; i++) {
        concated[i] = seed[i];
    }

    for (var i = 0; i < iterations; i++) {//At(maskLen / hashLen) +1least 1 iteration 
        num2Bits[i].in <== i; //convert counter to bits

        for (var j = 0; j < 32; j++) {
            //concat seed and counter
            concated[seedLenBits + j] = num2Bits[i].out[j];
        }

        sha256[i].in <== concated;

        for (var j = 0; j < hashLenBits; j++) {
            hashed[i * hashLenBits + j] <== sha256[i].out[j];
        }
    }

    for (var i = 0; i < maskLenBits; i++) {
        mask[i] <== hashed[i];
    }
}
