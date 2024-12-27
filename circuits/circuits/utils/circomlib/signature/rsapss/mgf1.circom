pragma circom 2.1.6;

include "../../bitify/bitify.circom";

template Mgf1Sha384(SEED_LEN, MASK_LEN) { //in bytes
    var SEED_LEN_BITS = SEED_LEN * 8;
    var MASK_LEN_BITS = MASK_LEN * 8;
    var HASH_LEN = 48; //output len of sha function in bytes 
    var HASH_LEN_BITS = HASH_LEN * 8;//output len of sha function in bits

    signal input seed[SEED_LEN_BITS]; //each represents a bit

    signal output out[MASK_LEN_BITS];

    
    assert(MASK_LEN <= 0xffffffff * HASH_LEN );

    var ITERATIONS = (MASK_LEN \ HASH_LEN) + 1; //adding 1, in-case MASK_LEN \ HASH_LEN is 0

    component sha384[ITERATIONS];
    component num2Bits[ITERATIONS];

    for (var i = 0; i < ITERATIONS; i++) {
        sha384[i] = ShaHashChunks(1 , 384); //32 bits for counter
        
        num2Bits[i] = Num2Bits(32);
    }

    var concated[1024]; //seed + 32 bits(4 Bytes) for counter
    signal hashed[HASH_LEN_BITS * (ITERATIONS)];

    for (var i = 0; i < SEED_LEN_BITS; i++) {
        concated[i] = seed[i];
    }

    for (var i = 0; i < ITERATIONS; i++) {
        num2Bits[i].in <== i; //convert counter to bits

        for (var j = 0; j < 32; j++) {
            //concat seed and counter
            concated[SEED_LEN_BITS + j] = num2Bits[i].out[31-j];
        }

        //adding padding (len = 416 = 110100000)
        for (var j = 417; j < 1015; j++) {
            concated[j] = 0;
        }

        concated[416] = 1;
        concated[1023] = 0;
        concated[1022] = 0;
        concated[1021] = 0;
        concated[1020] = 0;
        concated[1019] = 0;
        concated[1018] = 1;
        concated[1017] = 0;
        concated[1016] = 1;
        concated[1015] = 1;

        //hashing value
        sha384[i].in <== concated;

        for (var j = 0; j < HASH_LEN_BITS; j++) {
            hashed[i * HASH_LEN_BITS + j] <== sha384[i].out[j];
        }
    }

    for (var i = 0; i < MASK_LEN_BITS; i++) {
        out[i] <== hashed[i];
    }
}

template Mgf1Sha256(SEED_LEN, MASK_LEN) { //in bytes
    var SEED_LEN_BITS = SEED_LEN * 8;
    var MASK_LEN_BITS = MASK_LEN * 8;
    var HASH_LEN = 32; //output len of sha function in bytes 
    var HASH_LEN_BITS = HASH_LEN * 8;//output len of sha function in bits

    signal input seed[SEED_LEN_BITS]; //each represents a bit

    signal output out[MASK_LEN_BITS];
    
    assert(MASK_LEN <= 0xffffffff * HASH_LEN );
    var ITERATIONS = (MASK_LEN \ HASH_LEN) + 1; //adding 1, in-case MASK_LEN \ HASH_LEN is 0

    component sha256[ITERATIONS];
    component num2Bits[ITERATIONS];

    for (var i = 0; i < ITERATIONS; i++) {
        sha256[i] = ShaHashChunks(1, 256); //32 bits for counter

        num2Bits[i] = Num2Bits(32);
    }

    var concated[512]; //seed + 32 bits(4 Bytes) for counter
    signal hashed[HASH_LEN_BITS * (ITERATIONS)];

    for (var i = 0; i < SEED_LEN_BITS; i++) {
        concated[i] = seed[i];
    }

    for (var i = 0; i < ITERATIONS; i++) {
        num2Bits[i].in <== i; //convert counter to bits

        for (var j = 0; j < 32; j++) {
            //concat seed and counter
            concated[SEED_LEN_BITS + j] = num2Bits[i].out[31-j];
        }

        //adding padding (len = 288 = 100100000)
        for (var j = 289; j < 503; j++) {
            concated[j] = 0;
        }
        
        concated[288] = 1;
        concated[511] = 0;
        concated[510] = 0;
        concated[509] = 0;
        concated[508] = 0;
        concated[507] = 0;
        concated[506] = 1;
        concated[505] = 0;
        concated[504] = 0;
        concated[503] = 1;

        //hashing value
        sha256[i].in <== concated;

        for (var j = 0; j < HASH_LEN_BITS; j++) {
            hashed[i * HASH_LEN_BITS + j] <== sha256[i].out[j];
        }
    }

    for (var i = 0; i < MASK_LEN_BITS; i++) {
        out[i] <== hashed[i];
    }
}

// pragma circom 2.1.9;

// include "circom-dl/circuits/bitify/bitify.circom";
// include "../sha2/sha256/sha256_hash_bits.circom";
// include "../sha2/sha384/sha384_hash_bits.circom";

// template Mgf1Sha384(seedLen, maskLen) { //in bytes
//     var seedLenBits = seedLen * 8;
//     var maskLenBits = maskLen * 8;
//     var hashLen = 48; //output len of sha function in bytes 
//     var hashLenBits = hashLen * 8;//output len of sha function in bits

//     signal input seed[seedLenBits]; //each represents a bit
//     signal output out[maskLenBits];
    
//     assert(maskLen <= 0xffffffff * hashLen );
//     var iterations = (maskLen \ hashLen) + 1; //adding 1, in-case maskLen \ hashLen is 0
//     component sha384[iterations];
//     component num2Bits[iterations];

//     for (var i = 0; i < iterations; i++) {
//         sha384[i] =  Sha384_hash_chunks(1); //32 bits for counter
//         num2Bits[i] = Num2Bits(32);
//     }

//     var concated[1024]; //seed + 32 bits(4 Bytes) for counter
//     signal hashed[hashLenBits * (iterations)];

//     for (var i = 0; i < seedLenBits; i++) {
//         concated[i] = seed[i];
//     }

//     for (var i = 0; i < iterations; i++) {
//         num2Bits[i].in <== i; //convert counter to bits

//         for (var j = 0; j < 32; j++) {
//             //concat seed and counter
//             concated[seedLenBits + j] = num2Bits[i].out[31-j];
//         }

//         //adding padding (len = 416 = 110100000)
//         for (var j = 417; j < 1015; j++){
//             concated[j] = 0;
//         }
//         concated[416] = 1;
//         concated[1023] = 0;
//         concated[1022] = 0;
//         concated[1021] = 0;
//         concated[1020] = 0;
//         concated[1019] = 0;
//         concated[1018] = 1;
//         concated[1017] = 0;
//         concated[1016] = 1;
//         concated[1015] = 1;

//         //hashing value
//         sha384[i].in <== concated;

//         for (var j = 0; j < hashLenBits; j++) {
//             hashed[i * hashLenBits + j] <== sha384[i].out[j];
//         }
//     }

//     for (var i = 0; i < maskLenBits; i++) {
//         out[i] <== hashed[i];
//     }
// }

// template Mgf1Sha256(seedLen, maskLen) { //in bytes
//     var seedLenBits = seedLen * 8;
//     var maskLenBits = maskLen * 8;
//     var hashLen = 32; //output len of sha function in bytes 
//     var hashLenBits = hashLen * 8;//output len of sha function in bits

//     signal input seed[seedLenBits]; //each represents a bit
//     signal output out[maskLenBits];
    
//     assert(maskLen <= 0xffffffff * hashLen );
//     var iterations = (maskLen \ hashLen) + 1; //adding 1, in-case maskLen \ hashLen is 0

//     component sha256[iterations];
//     component num2Bits[iterations];

//     for (var i = 0; i < iterations; i++) {
//         sha256[i] = Sha256_hash_chunks(1);
//         num2Bits[i] = Num2Bits(32);
//     }

//     var concated[512]; //seed + 32 bits(4 Bytes) for counter
//     signal hashed[hashLenBits * (iterations)];

//     for (var i = 0; i < seedLenBits; i++) {
//         concated[i] = seed[i];
//     }

//     for (var i = 0; i < iterations; i++) {
//         num2Bits[i].in <== i; //convert counter to bits

//         for (var j = 0; j < 32; j++) {
//             //concat seed and counter
//             concated[seedLenBits + j] = num2Bits[i].out[31-j];
//         }

//         //adding padding (len = 288 = 100100000)
//         for (var j = 289; j < 503; j++){
//             concated[j] = 0;
//         }
//         concated[288] = 1;
//         concated[511] = 0;
//         concated[510] = 0;
//         concated[509] = 0;
//         concated[508] = 0;
//         concated[507] = 0;
//         concated[506] = 1;
//         concated[505] = 0;
//         concated[504] = 0;
//         concated[503] = 1;

//         //hashing value
//         sha256[i].in <== concated;

//         for (var j = 0; j < hashLenBits; j++) {
//             hashed[i * hashLenBits + j] <== sha256[i].out[j];
//         }
//     }

//     for (var i = 0; i < maskLenBits; i++) {
//         out[i] <== hashed[i];
//     }
// }
