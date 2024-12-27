pragma circom 2.1.6;

include "../bitify/comparators.circom";
include "../bitify/bitify.circom";
include "./bigInt.circom";
include "./bigIntFunc.circom";
include "../int/arithmetic.circom";
include "./karatsuba.circom";

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

// sum of each chunks with same positions for equal chunk numbers
template BigAddOverflow(CHUNK_SIZE, CHUNK_NUMBER){
    assert(CHUNK_SIZE <= 253);
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];

    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <== in[0][i] + in[1][i];
    }
}

// sum of each chunks with same positions for unequal chunk numbers
template BigAddNonEqualOverflow(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
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

// multiplying 2 numbers with equal chunks ignoring overflows
// out is in chunk number * 2 - 1
// use it if chunk number != 2 ** k
template BigMultOverflow(CHUNK_SIZE, CHUNK_NUMBER){
    
    assert(CHUNK_SIZE <= 126);
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER * 2 - 1];
    
    signal tmpMults[CHUNK_NUMBER][CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        for (var j = 0; j < CHUNK_NUMBER; j++){
            tmpMults[i][j] <== in[0][i] * in[1][j];
        }
    }
    
    // left - in[0][idx], right - in[1][idx]
    // 0*0 0*1 ... 0*n
    // 1*0 1*1 ... 1*n
    //  ⋮   ⋮    \   ⋮
    // n*0 n*1 ... n*n
    //
    // result[idx].length = count(i+j === idx)
    // result[0].length = 1 (i = 0; j = 0)
    // result[1].length = 2 (i = 1; j = 0; i = 0; j = 1);
    // result[i].length = result[i-1].length + 1 if i <= CHUNK_NUMBER else result[i-1].length - 1 (middle, main diagonal)
    
    signal tmpResult[CHUNK_NUMBER * 2 - 1][CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++){
        
        if (i < CHUNK_NUMBER){
            for (var j = 0; j < i + 1; j++){
                if (j == 0){
                    tmpResult[i][j] <== tmpMults[i - j][j];
                } else {
                    tmpResult[i][j] <== tmpMults[i - j][j] + tmpResult[i][j - 1];
                }
            }
            out[i] <== tmpResult[i][i];
            
        } else {
            for (var j = 0; j < 2 * CHUNK_NUMBER - 1 - i; j++){
                if (j == 0){
                    tmpResult[i][j] <== tmpMults[CHUNK_NUMBER - 1 - j][i + j - CHUNK_NUMBER + 1];
                } else {
                    tmpResult[i][j] <== tmpMults[CHUNK_NUMBER - 1 - j][i + j - CHUNK_NUMBER + 1] + tmpResult[i][j - 1];
                }
            }
            out[i] <== tmpResult[i][2 * CHUNK_NUMBER - 2 - i];
            
        }
    }
}

// multiplying 2 numbers with equal chunks ignoring overflows
// out is in chunk number * 2 - 1
// use it if chunk number == 2 ** k
template BigMultOptimisedOverflow(CHUNK_SIZE, CHUNK_NUMBER){
    
    assert(CHUNK_SIZE <= 126);
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER * 2 - 1];
    
    component karatsuba = KaratsubaNoCarry(CHUNK_NUMBER);
    karatsuba.in <== in;
    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++){
        out[i] <== karatsuba.out[i];
    }
}

// multiplying 2 numbers with unequal chunks ignoring overflows
// out is in chunk number * 2 - 1
template BigMultNonEqualOverflow(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
    assert(CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS <= 252);
    assert(CHUNK_NUMBER_GREATER >= CHUNK_NUMBER_LESS);
    
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal output out[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1];
    
    
    // We can`t mult multiply 2 big nums without multiplying each chunks of first with each chunk of second
    
    signal tmpMults[CHUNK_NUMBER_GREATER][CHUNK_NUMBER_LESS];
    for (var i = 0; i < CHUNK_NUMBER_GREATER; i++){
        for (var j = 0; j < CHUNK_NUMBER_LESS; j++){
            tmpMults[i][j] <== in1[i] * in2[j];
        }
    }
    
    // left - in1[idx], right - in2[idx]  || n - CHUNK_NUMBER_GREATER, m - CHUNK_NUMBER_LESS
    // 0*0 0*1 ... 0*n
    // 1*0 1*1 ... 1*n
    //  ⋮   ⋮    \   ⋮
    // m*0 m*1 ... m*n
    //
    // result[idx].length = count(i+j === idx)
    // result[0].length = 1 (i = 0; j = 0)
    // result[1].length = 2 (i = 1; j = 0; i = 0; j = 1);
    // result[i].length = { result[i-1].length + 1,  i <= CHUNK_NUMBER_LESS}
    //                    {  result[i-1].length - 1,  i > CHUNK_NUMBER_GREATER}
    //                    {  result[i-1].length,      CHUNK_NUMBER_LESS < i <= CHUNK_NUMBER_GREATER}
    
    signal tmpResult[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1][CHUNK_NUMBER_LESS];
    
    for (var i = 0; i < CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1; i++){
        
        if (i < CHUNK_NUMBER_LESS){
            for (var j = 0; j < i + 1; j++){
                if (j == 0){
                    tmpResult[i][j] <== tmpMults[i - j][j];
                } else {
                    tmpResult[i][j] <== tmpMults[i - j][j] + tmpResult[i][j - 1];
                }
            }
            out[i] <== tmpResult[i][i];
            
        } else {
            if (i < CHUNK_NUMBER_GREATER) {
                for (var j = 0; j < CHUNK_NUMBER_LESS; j++){
                    if (j == 0){
                        tmpResult[i][j] <== tmpMults[i - j][j];
                    } else {
                        tmpResult[i][j] <== tmpMults[i - j][j] + tmpResult[i][j - 1];
                    }
                }
                out[i] <== tmpResult[i][CHUNK_NUMBER_LESS - 1];
            } else {
                for (var j = 0; j < CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1 - i; j++){
                    if (j == 0){
                        tmpResult[i][j] <== tmpMults[CHUNK_NUMBER_GREATER - 1 - j][i + j - CHUNK_NUMBER_GREATER + 1];
                    } else {
                        tmpResult[i][j] <== tmpMults[CHUNK_NUMBER_GREATER - 1 - j][i + j - CHUNK_NUMBER_GREATER + 1] + tmpResult[i][j - 1];
                    }
                }
                out[i] <== tmpResult[i][CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 2 - i];
            }
        }
    }
}

// get mod of number with CHUNK_NUMBER_BASE chunks by modulus with CHUNK_NUMBER_MODULUS chunks
// overflow shift is number ofadditional chunks needed to split number with overflow, put here 254 \ CHUNK_SIZE if u don`t know what u should put there
// practically this is num of multiplications u did before, but it is better use num of muls + 1 because if u use at least one add or something similar to it too.
// will fall if modulus[-1] == 0
template BigModOverflow(CHUNK_SIZE, CHUNK_NUMBER_BASE, CHUNK_NUMBER_MODULUS, OVERFLOW_SHIFT){

    signal input base[CHUNK_NUMBER_BASE];
    signal input modulus[CHUNK_NUMBER_MODULUS];

    signal output mod[CHUNK_NUMBER_MODULUS];
    signal output div[CHUNK_NUMBER_BASE + OVERFLOW_SHIFT - CHUNK_NUMBER_MODULUS + 1];

    component reduce = RemoveOverflow(CHUNK_SIZE, CHUNK_NUMBER_BASE, CHUNK_NUMBER_BASE + OVERFLOW_SHIFT);
    reduce.in <== base;

    component bigMod = BigModNonEqual(CHUNK_SIZE, CHUNK_NUMBER_BASE + OVERFLOW_SHIFT, CHUNK_NUMBER_MODULUS);
    bigMod.base <== reduce.out;
    bigMod.modulus <== modulus;

    bigMod.mod ==> mod;
    bigMod.div ==> div;
}

// calculate mod inverse of base with CHUNK_NUMBER_BASE by CHUNK_NUMBER modulus
// will fall if modulus[-1] == 0
template BigModInvOverflow(CHUNK_SIZE, CHUNK_NUMBER_BASE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input in[CHUNK_NUMBER_BASE];
    signal input modulus[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];


    component reduce = RemoveOverflow(CHUNK_SIZE, CHUNK_NUMBER_BASE, CHUNK_NUMBER_BASE + 1);
    reduce.in <== in;

    var div_res[2][200] = long_div(CHUNK_SIZE, CHUNK_NUMBER, (CHUNK_NUMBER_BASE + 1 - CHUNK_NUMBER), reduce.out, modulus);
    var mod[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        mod[i] = div_res[1][i];
    }
    var inv[200] = mod_inv_dl(CHUNK_SIZE, CHUNK_NUMBER, mod, modulus);

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <-- inv[i];
    }
    
    component mult = BigMultModPNonEqual(CHUNK_SIZE, CHUNK_NUMBER_BASE + 1, CHUNK_NUMBER, CHUNK_NUMBER);
    mult.in1 <== reduce.out;
    mult.in2 <== out;
    mult.modulus <== modulus;

    mult.out[0] === 1;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        mult.out[i] === 0;
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

// removing overflow for CHUNK_NUMBER_OLD chunk number and get CHUNK_NUMBER_NEW number in out
// even if CHUNK_NUMBER_NEW isn`t enought to get rid of all overflows, it puts all overflow only in last chunk, always leaving numbers equal
template RemoveOverflow(CHUNK_SIZE, CHUNK_NUMBER_OLD, CHUNK_NUMBER_NEW){
    assert(CHUNK_SIZE <= 126);
    assert(CHUNK_NUMBER_OLD <= CHUNK_NUMBER_NEW);
    
    signal input in[CHUNK_NUMBER_OLD];
    signal output out[CHUNK_NUMBER_NEW];
    
    component getLastNBits[CHUNK_NUMBER_NEW - 1];
    component bits2Num[CHUNK_NUMBER_NEW - 1];
    if (CHUNK_NUMBER_NEW > CHUNK_NUMBER_OLD){
        for (var i = 0; i < CHUNK_NUMBER_OLD; i++){
            if (i == 0){
                getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
                getLastNBits[i].in <== in[i];
                bits2Num[i] = Bits2Num(CHUNK_SIZE);
                bits2Num[i].in <== getLastNBits[i].out;
                out[i] <== bits2Num[i].out;
            } else {
                getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
                getLastNBits[i].in <== in[i] + getLastNBits[i - 1].div;
                bits2Num[i] = Bits2Num(CHUNK_SIZE);
                bits2Num[i].in <== getLastNBits[i].out;
                out[i] <== bits2Num[i].out;
            }
        }
        for (var i = CHUNK_NUMBER_OLD; i < CHUNK_NUMBER_NEW - 1; i++){
            getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
            getLastNBits[i].in <== getLastNBits[i - 1].div;
            bits2Num[i] = Bits2Num(CHUNK_SIZE);
            bits2Num[i].in <== getLastNBits[i].out;
            out[i] <== bits2Num[i].out;
        }
        out[CHUNK_NUMBER_NEW - 1] <== getLastNBits[CHUNK_NUMBER_NEW - 2].div;
    } else {
        for (var i = 0; i < CHUNK_NUMBER_OLD - 1; i++){
            if (i == 0){
                getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
                getLastNBits[i].in <== in[i];
                bits2Num[i] = Bits2Num(CHUNK_SIZE);
                bits2Num[i].in <== getLastNBits[i].out;
                out[i] <== bits2Num[i].out;
            } else {
                getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
                getLastNBits[i].in <== in[i] + getLastNBits[i - 1].div;
                bits2Num[i] = Bits2Num(CHUNK_SIZE);
                bits2Num[i].in <== getLastNBits[i].out;
                out[i] <== bits2Num[i].out;
            }
        }
        out[CHUNK_NUMBER_NEW - 1] <== getLastNBits[CHUNK_NUMBER_NEW - 2].div + in[CHUNK_NUMBER_NEW - 1];
    }
}

// computes modulus + in1 - in2 (WITHOUT % modulus!!!) with overflows, in1 and in2 shouldn`t have overflows and in1 < modulus, in2 < modulus!
// use only if you undestand what are you doing!!!
template BigSubModOverflow(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in1[CHUNK_NUMBER];
    signal input in2[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];


    signal output out[CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++){
        if (i == 0){
            out[i] <== 2 ** CHUNK_SIZE + modulus[i] + in1[i] - in2[i];
        } else {
            if (i == CHUNK_NUMBER - 1){
                out[i] <== modulus[i] + in1[i] - in2[i] - 1;
            } else {
                out[i] <== 2 ** CHUNK_SIZE + modulus[i] + in1[i] - in2[i] - 1;
            }
        }
    }
}

// Comparators
//---------------------------------------------------------------------------------------------------------------------

// compare each chunk
// can be optimised by log_2(n) multiplying results vs n which is now, will be one later
// use this for already redused inputs or if u know that they don`t contain any overflow (any mod template output, for example)
template ForceEqual(CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    
    signal output out;
    
    component isEqual[CHUNK_NUMBER];
    signal equalResults[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        isEqual[i] = IsEqual();
        isEqual[i].in[0] <== in[0][i];
        isEqual[i].in[1] <== in[1][i];
        if (i == 0){
            equalResults[i] <== isEqual[i].out;
        } else {
            equalResults[i] <== equalResults[i - 1] * isEqual[i].out;
        }
    }
    out <== equalResults[CHUNK_NUMBER - 1];
}


// in1 already reduced, used for checks of function returns (they return correctly reduced)
template ReducedEqual(CHUNK_SIZE, CHUNK_NUMBER_OLD, CHUNK_NUMBER_NEW){
    signal input in1[CHUNK_NUMBER_NEW];
    signal input in2[CHUNK_NUMBER_OLD];
    signal output out;

    component reduce = RemoveOverflow(CHUNK_SIZE, CHUNK_NUMBER_OLD, CHUNK_NUMBER_NEW);
    reduce.in <== in2;

    component forceEqual = ForceEqual(CHUNK_NUMBER_NEW);
    forceEqual.in[0] <== in1;
    forceEqual.in[1] <== reduce.out;
    
    out <== forceEqual.out;
}

// USE ONLY if u sure it will not affect your security, because it is possible to get 1 in out with non-equal inputs, be carefull with it!!!
// this compares one chunk representation of nums, and if they are bigger than circom curve prime (~2**254), it will compare modulus by it
// it always uses 4 constraints and allows to always get 1 for equal inputs
// there is a way to get "collision" and get 1 for non equal chunks, however
// it almost impossible to get it randomly (almost the same as hash sha-256 collision), but it can be calculated
// it still doesn`t allowed to put anything that u want at witness and get valid proof, so it shouldn`t affect on security if it is one of many cheks in your circuit
template SmartEqual(CHUNK_SIZE, CHUNK_NUMBER){
	signal input in[2][CHUNK_NUMBER];
	signal output out;
	component isEqual = IsEqual();
	component sumLeft = GetSumOfNElements(CHUNK_NUMBER);
	component sumRight = GetSumOfNElements(CHUNK_NUMBER);

	for (var i = 0; i < CHUNK_NUMBER; i++){
		sumLeft.in[i] <== 2 ** (i * CHUNK_SIZE) * in[0][i];
		sumRight.in[i] <== 2 ** (i * CHUNK_SIZE) * in[1][i];
	}

	isEqual.in[0] <== sumLeft.out;
	isEqual.in[1] <== sumRight.out;

	out <== isEqual.out;
}