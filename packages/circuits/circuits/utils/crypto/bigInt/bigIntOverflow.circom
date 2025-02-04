pragma circom  2.1.6;

include "bigIntComparators.circom";
include "bigIntHelpers.circom";
include "bigIntFunc.circom";

// What BigInt in this lib means
// We represent big number as array of chunks with some shunk_size (will be explained later) 
// for this example we will use N for number, n for chunk size and k for chunk number:
// N[k];
// Number can be calculated by this formula:
// N = N[0] * 2 ** (0 * n) + N[1] * 2 ** (1 * n) + ... + N[k - 1] * 2 ** ((k-1) * n)
// By overflow we mean situation where N[i] >= 2 ** n
// Without overflow every number has one and only one representation
// To reduce overflow we must leave N[i] % 2 ** n for N[i] and add N[i] // 2 ** n to N[i + 1]

// In this file we have operations for  big int but we ignore overflow (a_i * 2 ** CHUNK_SIZE * i, here a_i can be greater than 2 ** CHUNK_SIZE)
// U should use it for some operation in a row for better optimisation
//-------------------------------------------------------------------------------------------------------------------------------------------------

// sum of each chunks with same positions for unequal chunk numbers
template BigAddOverflow(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal output out[CHUNK_NUMBER_GREATER];
    
    for (var i = 0; i < CHUNK_NUMBER_LESS; i++){
        out[i] <== in1[i] + in2[i];
    }
    for (var i = CHUNK_NUMBER_LESS; i < CHUNK_NUMBER_GREATER; i++){
        out[i] <== in1[i];
    }
}

template BigMultOverflow(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal output out[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1];

    var isPowerOfTwo = 0;
    for (var i = 0; i < CHUNK_NUMBER_GREATER; i++){
        if (CHUNK_NUMBER_GREATER == 2 ** i){
            isPowerOfTwo = 1;
        }
    }

    // Our karatsuba algo is better in case of CHUNK_SIZE_GREATER ** 1,6 * 2.5 < CHUNK_SIZE_GREATER * CHUNK_SIZE_LESS
    var isOptimal = is_karatsuba_optimal_dl(CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS);

    if (isPowerOfTwo == 1 && isOptimal == 1){
        component karatsuba = KaratsubaOverflow(CHUNK_NUMBER_GREATER);
        karatsuba.in[0] <== in1;
        for (var i = 0; i < CHUNK_NUMBER_LESS; i++){
            karatsuba.in[1][i] <== in2[i];
        }
        for (var i = CHUNK_NUMBER_LESS; i < CHUNK_NUMBER_GREATER; i++){
            karatsuba.in[1][i] <== 0;
        }
        for (var i = 0; i < CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1; i++){
            karatsuba.out[i] ==> out[i];
        }
    } else {
       component mult =  BigMultNonEqualOverflow(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS);
       mult.in1 <== in1;
       mult.in2 <== in2;
       mult.out ==> out;
    }
}

// multiplying number with CHUNK_NUMBER by scalar, ignoring overflow
template ScalarMultOverflow(CHUNK_NUMBER){
    signal input in[CHUNK_NUMBER];
    signal input scalar;
    
    signal output out[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <== scalar * in[i];
    }
}

// computes modulus + in1 - in2 (WITHOUT % modulus!!!) with overflows, in1 and in2 shouldn`t have overflows and in1 < modulus, in2 < modulus!
// use only if you undestand what are you doing!!!
template BigSubModP(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in1[CHUNK_NUMBER];
    signal input in2[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];

    signal output out[CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++){
        if (i == 0){
            out[i] <== 2 ** CHUNK_SIZE + modulus[i] + in1[i] - in2[i];
        } else {
            if (i == CHUNK_NUMBER - 1){
                out[i] <== modulus[i] + in1[i] - in2[i] - 1 ;
            } else {
                out[i] <== 2 ** CHUNK_SIZE + modulus[i] + in1[i] - in2[i] - 1 ;
            }
        }
    }
}