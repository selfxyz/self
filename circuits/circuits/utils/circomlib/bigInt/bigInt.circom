pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./bigIntFunc.circom";
include "./bigIntOverflow.circom";
include "../int/arithmetic.circom";
include "./karatsuba.circom";

// What BigInt in this lib means
// We represent big number as array of chunks with some shunk_size (will be explained later) 
// for this example we will use N for number, n for chunk size and k for chunk_number:
// N[k];
// Number can be calculated by this formula:
// N = N[0] * 2 ** (0 * n) + N[1] * 2 ** (1 * n) + ... + N[k - 1] * 2 ** ((k-1) * n)
// By overflow we mean situation where N[i] >= 2 ** n
// Without overflow every number has one and only one representation
// To reduce overflow we must leave N[i] % 2 ** n for N[i] and add N[i] // 2 ** n to N[i + 1]
// If u want to do many operation in a row, it is better to use overflow operations from "./bigIntOverflow" and then just reduce overflow from result

// If u want to convert any number to this representation, u can this python3 script:
// ```
// def bigint_to_array(n, k, x):
//     # Initialize mod to 1 (Python's int can handle arbitrarily large numbers)
//     mod = 1
//     for idx in range(n):
//         mod *= 2
//     # Initialize the return list
//     ret = []
//     x_temp = x
//     for idx in range(k):
//         # Append x_temp mod mod to the list
//         ret.append(str(x_temp % mod))
//         # Divide x_temp by mod for the next iteration
//         x_temp //= mod  # Use integer division in Python
//     return ret
// ```


//-------------------------------------------------------------------------------------------------------------------------------------------------
// Next templates are actual only for same chunk sizes of inputs, don`t use them without knowing what are u doing!!!

// Get sum of each chunk with same positions
// out has overflow
template BigAddNoCarry(CHUNK_SIZE, CHUNK_NUMBER){
    assert(CHUNK_SIZE <= 253);
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <== in[0][i] + in[1][i];
    }
}

// Get sum of each chunk with same positions
// out has no overflow and has CHUNK_NUMBER + 1 chunks
template BigAdd(CHUNK_SIZE, CHUNK_NUMBER){
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER + 1];
    
    component bigAddNoCarry = BigAddNoCarry(CHUNK_SIZE, CHUNK_NUMBER);
    bigAddNoCarry.in <== in;
    
    component num2bits[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        num2bits[i] = Num2Bits(CHUNK_SIZE + 2);
        
        //if >= 2**CHUNK_SIZE, overflow
        if (i == 0){
            num2bits[i].in <== bigAddNoCarry.out[i];
        } else {
            num2bits[i].in <== bigAddNoCarry.out[i] + num2bits[i - 1].out[CHUNK_SIZE];
        }
    }
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        if (i == 0) {
            out[i] <== bigAddNoCarry.out[i] - (num2bits[i].out[CHUNK_SIZE]) * (2 ** CHUNK_SIZE);
        }
        else {
            out[i] <== bigAddNoCarry.out[i] - (num2bits[i].out[CHUNK_SIZE]) * (2 ** CHUNK_SIZE) + num2bits[i - 1].out[CHUNK_SIZE];
        }
    }
    out[CHUNK_NUMBER] <== num2bits[CHUNK_NUMBER - 1].out[CHUNK_SIZE];
}

// get multiplication of 2 numbers with CHUNK_NUMBER chunks
// out is 2 * CHUNK_NUMBER - 1 chunks with overflows
template BigMultNoCarry(CHUNK_SIZE, CHUNK_NUMBER){
    
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

// get multiplication of 2 numbers with CHUNK_NUMBER chunks
// out is 2 * CHUNK_NUMBER chunks without overflows
template BigMult(CHUNK_SIZE, CHUNK_NUMBER){
    
    signal input in[2][CHUNK_NUMBER];
    
    
    signal output out[CHUNK_NUMBER * 2];
    
    component bigMultNoCarry = BigMultNoCarry(CHUNK_SIZE, CHUNK_NUMBER);
    bigMultNoCarry.in <== in;
    
    component num2bits[CHUNK_NUMBER * 2 - 1];
    component bits2numOverflow[CHUNK_NUMBER * 2 - 1];
    component bits2numModulus[CHUNK_NUMBER * 2 - 1];
    
    //overflow = no carry (multiplication result / 2 ** chunk_size) === chunk_size first bits in result
    for (var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        //bigMultNoCarry = CHUNK_i * CHUNK_j (2 * CHUNK_SIZE) + CHUNK_i0 * CHUNK_j0 (2 * CHUNK_SIZE) + ..., up to len times,
        // => 2 * CHUNK_SIZE + ADDITIONAL_LEN
        var ADDITIONAL_LEN = i;
        if (i >= CHUNK_NUMBER){
            ADDITIONAL_LEN = 2 * CHUNK_NUMBER - 2 - i;
        }
        
        num2bits[i] = Num2Bits(CHUNK_SIZE * 2 + ADDITIONAL_LEN);
        
        if (i == 0){
            num2bits[i].in <== bigMultNoCarry.out[i];
        } else {
            num2bits[i].in <== bigMultNoCarry.out[i] + bits2numOverflow[i - 1].out;
        }
        
        bits2numOverflow[i] = Bits2Num(CHUNK_SIZE + ADDITIONAL_LEN);
        for (var j = 0; j < CHUNK_SIZE + ADDITIONAL_LEN; j++){
            bits2numOverflow[i].in[j] <== num2bits[i].out[CHUNK_SIZE + j];
        }
        
        bits2numModulus[i] = Bits2Num(CHUNK_SIZE);
        for (var j = 0; j < CHUNK_SIZE; j++){
            bits2numModulus[i].in[j] <== num2bits[i].out[j];
        }
    }
    for (var i = 0; i < 2 * CHUNK_NUMBER; i++){
        if (i == 2 * CHUNK_NUMBER - 1){
            out[i] <== bits2numOverflow[i - 1].out;
        } else {
            out[i] <== bits2numModulus[i].out;
        }
    }
}

// same as previous one
// using karatsuba multiplication under the hood
// use only for CHUNK_NUMBER == 2 ** x
template BigMultOptimised(CHUNK_SIZE, CHUNK_NUMBER){
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER * 2];
    
    component karatsuba = KaratsubaNoCarry(CHUNK_NUMBER);
    karatsuba.in <== in;
    
    
    component getLastNBits[CHUNK_NUMBER * 2 - 1];
    component bits2Num[CHUNK_NUMBER * 2 - 1];
    
    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++){
        getLastNBits[i] = GetLastNBits(CHUNK_SIZE);
        bits2Num[i] = Bits2Num(CHUNK_SIZE);
        
        if (i == 0) {
            getLastNBits[i].in <== karatsuba.out[i];
        } else {
            getLastNBits[i].in <== karatsuba.out[i] + getLastNBits[i - 1].div;
        }
        bits2Num[i].in <== getLastNBits[i].out;
    }
    
    for (var i = 0; i < CHUNK_NUMBER * 2 - 1; i++){
        out[i] <== bits2Num[i].out;
    }
    out[CHUNK_NUMBER * 2 - 1] <== getLastNBits[CHUNK_NUMBER * 2 - 2].div;
}

// calculates div mod for base with CHUNK_NUMBER * 2 chunks by modulus with CHUNK_NUMBER chunks
// detailed explanation of algo can be found in BigModNonEqual template from this file, they do almost the same
template BigMod(CHUNK_SIZE, CHUNK_NUMBER){
    
    assert(CHUNK_NUMBER * 2 <= 253);
    
    signal input base[CHUNK_NUMBER * 2];
    signal input modulus[CHUNK_NUMBER];
    
    var long_division[2][200] = long_div_dl(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, base, modulus);
    
    signal output div[CHUNK_NUMBER + 1];
    signal output mod[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER + 1; i++){
        div[i] <-- long_division[0][i];
    }
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        mod[i] <-- long_division[1][i];
    }
    
    component multChecks;
    multChecks = BigMultNonEqual(CHUNK_SIZE, CHUNK_NUMBER + 1, CHUNK_NUMBER);
    
    multChecks.in1 <== div;
    multChecks.in2 <== modulus;
    
    component greaterThan = BigGreaterThan(CHUNK_SIZE, CHUNK_NUMBER);
    
    greaterThan.in[0] <== modulus;
    greaterThan.in[1] <== mod;
    greaterThan.out === 1;
    
    //div * modulus + mod === base
    
    component bigAddCheck = BigAddNonEqual(CHUNK_SIZE, CHUNK_NUMBER * 2 + 1, CHUNK_NUMBER);
    
    bigAddCheck.in1 <== multChecks.out;
    bigAddCheck.in2 <== mod;
    
    
    component smartEqual = SmartEqual(CHUNK_SIZE, CHUNK_NUMBER * 2 + 2);
    smartEqual.in[0] <== bigAddCheck.out;
    for (var i = 0; i < CHUNK_NUMBER * 2; i++){
        smartEqual.in[1][i] <== base[i];
    }
    smartEqual.in[1][CHUNK_NUMBER * 2] <== 0;
    smartEqual.in[1][CHUNK_NUMBER * 2 + 1] <== 0;
    
    smartEqual.out === 1;
}

// calculates in[0] * in[1] % in[2], all in[i] has CHUNK_NUMBER chunks
// if in[2] last chunk == 0, error will occur
// use only for CHUNK_NUMBER == 2 ** x, otherwise error will occure
template BigMultModP(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[3][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    component bigMult = BigMultOptimised(CHUNK_SIZE, CHUNK_NUMBER);
    bigMult.in[0] <== in[0];
    bigMult.in[1] <== in[1];
    
    component bigMod = BigMod(CHUNK_SIZE, CHUNK_NUMBER);
    bigMod.base <== bigMult.out;
    bigMod.modulus <== in[2];
    
    out <== bigMod.mod;
}

// calculates in[0] * in[1] % in[2], all in[i] has CHUNK_NUMBER chunks
// if in[2] last chunk == 0, error will occur
// use only for CHUNK_NUMBER != 2 ** x, otherwise unefficient
template BigMultModPNonOptimised(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[3][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    component bigMult = BigMult(CHUNK_SIZE, CHUNK_NUMBER);
    bigMult.in[0] <== in[0];
    bigMult.in[1] <== in[1];
    
    component bigMod = BigMod(CHUNK_SIZE, CHUNK_NUMBER);
    bigMod.base <== bigMult.out;
    bigMod.modulus <== in[2];
    
    out <== bigMod.mod;
}


// substition of 2 nums with CHUNK_NUMBER 
// out is CHUNK_NUMBER with overflows
// don`t use this one outside the BigSub without knowing what are u doing!!!
template BigSubNoBorrow(CHUNK_SIZE, CHUNK_NUMBER){
    assert (CHUNK_SIZE < 252);
    
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <== in[0][i] - in[1][i];
    }
}

// in[0] >= in[1], else will not work correctly, use only in this case!
// substition of 2 nums with CHUNK_NUMBER 
// out is CHUNK_NUMBER without overflows
template BigSub(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    component bigSubNoBorrow = BigSubNoBorrow(CHUNK_SIZE, CHUNK_NUMBER);
    bigSubNoBorrow.in <== in;
    
    component lessThan[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        lessThan[i] = LessThan(CHUNK_SIZE + 1);
        lessThan[i].in[1] <== 2 ** CHUNK_SIZE;
        
        if (i == 0){
            lessThan[i].in[0] <== bigSubNoBorrow.out[i] + 2 ** CHUNK_SIZE;
            out[i] <== bigSubNoBorrow.out[i] + (2 ** CHUNK_SIZE) * (lessThan[i].out);
        } else {
            lessThan[i].in[0] <== bigSubNoBorrow.out[i] - lessThan[i - 1].out + 2 ** CHUNK_SIZE;
            out[i] <== bigSubNoBorrow.out[i] + (2 ** CHUNK_SIZE) * (lessThan[i].out) - lessThan[i - 1].out;
        }
    }
}

// Computes CHUNK_NUMBER number power with EXP = exponent
// EXP is default num, not chunked bigInt!!!
// use for CHUNK_NUMBER == 2**n, otherwise error will occur
template PowerMod(CHUNK_SIZE, CHUNK_NUMBER, EXP) {
    assert(EXP >= 2);
    
    signal input base[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];
    
    signal output out[CHUNK_NUMBER];
    
    var exp_process[256] = exp_to_bits_dl(EXP);
    
    component muls[exp_process[0]];
    component resultMuls[exp_process[1] - 1];
    
    for (var i = 0; i < exp_process[0]; i++){
        muls[i] = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
        muls[i].in[2] <== modulus;
    }
    
    for (var i = 0; i < exp_process[1] - 1; i++){
        resultMuls[i] = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
        resultMuls[i].in[2] <== modulus;
    }
    
    muls[0].in[0] <== base;
    muls[0].in[1] <== base;
    
    for (var i = 1; i < exp_process[0]; i++){
        muls[i].in[0] <== muls[i - 1].out;
        muls[i].in[1] <== muls[i - 1].out;
    }
    
    for (var i = 0; i < exp_process[1] - 1; i++){
        if (i == 0){
            if (exp_process[i + 2] == 0){
                resultMuls[i].in[0] <== base;
            } else {
                resultMuls[i].in[0] <== muls[exp_process[i + 2] - 1].out;
            }
            resultMuls[i].in[1] <== muls[exp_process[i + 3] - 1].out;
        }
        else {
            resultMuls[i].in[0] <== resultMuls[i - 1].out;
            resultMuls[i].in[1] <== muls[exp_process[i + 3] - 1].out;
        }
    }

    if (exp_process[1] == 1){
        out <== muls[exp_process[0] - 1].out;
    } else {
        out <== resultMuls[exp_process[1] - 2].out;
    }
}


// use only for CHUNK_NUMBER == 2 ** x
// calculates in ^ (-1) % modulus;
// in, modulus has CHUNK_NUMBER
template BigModInvOptimised(CHUNK_SIZE, CHUNK_NUMBER) {
    assert(CHUNK_SIZE <= 252);
    signal input in[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    
    var inv[200] = mod_inv_dl(CHUNK_SIZE, CHUNK_NUMBER, in, modulus);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[i] <-- inv[i];
    }
    
    component mult = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    mult.in[0] <== in;
    mult.in[1] <== out;
    mult.in[2] <== modulus;
    
    mult.out[0] === 1;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        mult.out[i] === 0;
    }
}

//------------------------------------------------------------------------------------------------------------------------------------------------- 
// Next templates are for big numbers operations for any number of chunks in inputs

// Addition for non-equal chunks
// out has no overflow
template BigAddNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    
    signal output out[CHUNK_NUMBER_GREATER + 1];
    
    component bigAdd = BigAdd(CHUNK_SIZE, CHUNK_NUMBER_GREATER);
    for (var i = 0; i < CHUNK_NUMBER_LESS; i++){
        bigAdd.in[0][i] <== in1[i];
        bigAdd.in[1][i] <== in2[i];
    }
    for (var i = CHUNK_NUMBER_LESS; i < CHUNK_NUMBER_GREATER; i++){
        bigAdd.in[0][i] <== in1[i];
        bigAdd.in[1][i] <== 0;
    }
    
    out <== bigAdd.out;
}

// get multiplication of 2 numbers with CHUNK_NUMBER_GREATER and CHUNK_NUMBER_LESS chunks
// in1 have CHUNK_NUMBER_GREATER chunks, in2 - CHUNK_NUMBER_LESS
// out is CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1 chunks with overflows
template BigMultNoCarryNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
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

// get multiplication of 2 numbers with CHUNK_NUMBER_GREATER and CHUNK_NUMBER_LESS chunks
// in1 have CHUNK_NUMBER_GREATER chunks, in2 - CHUNK_NUMBER_LESS
// out is CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS chunks with overflows
// automatic usage of otimised multiplication if CHUNK_NUMBER_GREATER == 2 ** k (karatsuba)
template BigMultNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal output out[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS];
    var isPowerOfTwo = 0;
    for (var i = 0; i < CHUNK_NUMBER_GREATER; i++){
        if (CHUNK_NUMBER_GREATER == 2 ** i){
            isPowerOfTwo = 1;
        }
    }
    if (isPowerOfTwo == 0){
        
        component bigMultNoCarry = BigMultNoCarryNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS);
        bigMultNoCarry.in1 <== in1;
        bigMultNoCarry.in2 <== in2;
        
        component num2bits[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1];
        component bits2numOverflow[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1];
        component bits2numModulus[CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1];
        
        //overflow = no carry (multiplication result / 2 ** chunk_size) === chunk_size first bits in result
        for (var i = 0; i < CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1; i++){
            //bigMultNoCarry = CHUNK_i * CHUNK_j (2 * CHUNK_SIZE) + CHUNK_i0 * CHUNK_j0 (2 * CHUNK_SIZE) + ..., up to len times,
            // => 2 * CHUNK_SIZE + ADDITIONAL_LEN
            var ADDITIONAL_LEN = i;
            if (i >= CHUNK_NUMBER_LESS){
                ADDITIONAL_LEN = CHUNK_NUMBER_LESS - 1;
            }
            if (i >= CHUNK_NUMBER_GREATER){
                ADDITIONAL_LEN = CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1 - i;
            }
            
            
            num2bits[i] = Num2Bits(CHUNK_SIZE * 2 + ADDITIONAL_LEN);
            
            if (i == 0){
                num2bits[i].in <== bigMultNoCarry.out[i];
            } else {
                num2bits[i].in <== bigMultNoCarry.out[i] + bits2numOverflow[i - 1].out;
            }
            
            bits2numOverflow[i] = Bits2Num(CHUNK_SIZE + ADDITIONAL_LEN);
            for (var j = 0; j < CHUNK_SIZE + ADDITIONAL_LEN; j++){
                bits2numOverflow[i].in[j] <== num2bits[i].out[CHUNK_SIZE + j];
            }
            
            bits2numModulus[i] = Bits2Num(CHUNK_SIZE);
            for (var j = 0; j < CHUNK_SIZE; j++){
                bits2numModulus[i].in[j] <== num2bits[i].out[j];
            }
        }
        for (var i = 0; i < CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS; i++){
            if (i == CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS - 1){
                out[i] <== bits2numOverflow[i - 1].out;
            } else {
                out[i] <== bits2numModulus[i].out;
            }
        }
    } else {
        component bigMult = BigMultOptimised(CHUNK_SIZE, CHUNK_NUMBER_GREATER);
        for (var i = 0; i < CHUNK_NUMBER_LESS; i++){
            bigMult.in[0][i] <== in1[i];
            bigMult.in[1][i] <== in2[i];
        }
        for (var i = CHUNK_NUMBER_LESS; i < CHUNK_NUMBER_GREATER; i++){
            bigMult.in[0][i] <== in1[i];
            bigMult.in[1][i] <== 0;
        }
        for (var i = 0; i < CHUNK_NUMBER_LESS + CHUNK_NUMBER_GREATER; i++){
            out[i] <== bigMult.out[i];
        }
    }
}

// compute mod and div for bigInt, we can`t do it separatly anyway
// use vars to compute them, and this checks to secure witness from changing:
// a / b = c;
// a % b = d;
// first check: 
// a === b * c + d
// we still can change it for many other combinations, so we add next one:
// a < b * (c + 1)
// and convert it to this form:
// a = bc + d so bc + d < bc + b so d < b
// there should be a check that 
// a >= bc
// which can be convert it to this form:
// a = bc + d so bc + d >= bc so d >= 0 
// but we don`t need it for big nums, where we can`t have anyway
// outs are mod with CHUNK_NUMBER_MODULUS and div with CHUNK_NUMBER_BASE - CHUNK_NUMBER_MODULUS + 1 chunks
template BigModNonEqual(CHUNK_SIZE, CHUNK_NUMBER_BASE, CHUNK_NUMBER_MODULUS){
    
    assert(CHUNK_NUMBER_BASE <= 253);
    assert(CHUNK_NUMBER_MODULUS <= 253);
    assert(CHUNK_NUMBER_MODULUS <= CHUNK_NUMBER_BASE);
    
    var CHUNK_NUMBER_DIV = CHUNK_NUMBER_BASE - CHUNK_NUMBER_MODULUS + 1;
    
    signal input base[CHUNK_NUMBER_BASE];
    signal input modulus[CHUNK_NUMBER_MODULUS];
    
    var long_division[2][200] = long_div_dl(CHUNK_SIZE, CHUNK_NUMBER_MODULUS, CHUNK_NUMBER_DIV - 1, base, modulus);
    
    signal output div[CHUNK_NUMBER_DIV];
    signal output mod[CHUNK_NUMBER_MODULUS];
    
    for (var i = 0; i < CHUNK_NUMBER_DIV; i++){
        div[i] <-- long_division[0][i];
    }
    
    for (var i = 0; i < CHUNK_NUMBER_MODULUS; i++){
        mod[i] <-- long_division[1][i];
    }
    
    component multChecks;
    if (CHUNK_NUMBER_DIV >= CHUNK_NUMBER_MODULUS){
        multChecks = BigMultNonEqual(CHUNK_SIZE, CHUNK_NUMBER_DIV, CHUNK_NUMBER_MODULUS);
        
        multChecks.in1 <== div;
        multChecks.in2 <== modulus;
    } else {
        multChecks = BigMultNonEqual(CHUNK_SIZE, CHUNK_NUMBER_MODULUS, CHUNK_NUMBER_DIV);
        
        multChecks.in2 <== div;
        multChecks.in1 <== modulus;
    }
    
    component greaterThan = BigGreaterThan(CHUNK_SIZE, CHUNK_NUMBER_MODULUS);
    
    greaterThan.in[0] <== modulus;
    greaterThan.in[1] <== mod;
    greaterThan.out === 1;
    
    //div * modulus + mod === base
    
    component bigAddCheck = BigAddNonEqual(CHUNK_SIZE, CHUNK_NUMBER_DIV + CHUNK_NUMBER_MODULUS, CHUNK_NUMBER_MODULUS);
    
    bigAddCheck.in1 <== multChecks.out;
    bigAddCheck.in2 <== mod;
    
    component smartEqual = SmartEqual(CHUNK_SIZE, CHUNK_NUMBER_BASE + 2);
    smartEqual.in[0] <== bigAddCheck.out;
    for (var i = 0; i < CHUNK_NUMBER_BASE; i++){
        smartEqual.in[1][i] <== base[i];
    }
    smartEqual.in[1][CHUNK_NUMBER_BASE] <== 0;
    smartEqual.in[1][CHUNK_NUMBER_BASE + 1] <== 0;
    
    smartEqual.out === 1;
}

// computes in1 * in2 mod modulus
// in1, in2, modulus shouldn`t contain overflow
// out is CHUNK_NUMBER_MODULUS chunks number
template BigMultModPNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS, CHUNK_NUMBER_MODULUS){
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal input modulus[CHUNK_NUMBER_MODULUS];
    
    signal output out[CHUNK_NUMBER_MODULUS];
    
    component bigMult = BigMultNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS);
    bigMult.in1 <== in1;
    bigMult.in2 <== in2;
    
    component bigMod = BigModNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER + CHUNK_NUMBER_LESS, CHUNK_NUMBER_MODULUS);
    bigMod.base <== bigMult.out;
    bigMod.modulus <== modulus;
    
    out <== bigMod.mod;
}

// calculates sub of unequal chunks numbers, more chunks for in1, less for in2
// still no overflow alloved
// in[0] >= in[1], else will not work correctly, use only in this case!
template BigSubNonEqual(CHUNK_SIZE, CHUNK_NUMBER_GREATER, CHUNK_NUMBER_LESS){
    signal input in1[CHUNK_NUMBER_GREATER];
    signal input in2[CHUNK_NUMBER_LESS];
    signal output out[CHUNK_NUMBER_GREATER];
    
    component bigSub = BigSub(CHUNK_SIZE, CHUNK_NUMBER_GREATER);
    bigSub.in[0] <== in1;
    for (var i = 0; i < CHUNK_NUMBER_LESS; i++){
        bigSub.in[1][i] <== in2[i];
    }
    for (var i = CHUNK_NUMBER_LESS; i < CHUNK_NUMBER_GREATER; i++){
        bigSub.in[1][i] <== 0;
    }
    
    out <== bigSub.out;
}

// scalar multiplication no carry
// result will contain overflow
// use it if u know that it will be no overflow or reduce it with RemoveOverflow from "./bigIntOverflow" or u know what are u doing
template ScalarMultNoCarry(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[CHUNK_NUMBER];
    signal input scalar;
    
    signal output out[CHUNK_NUMBER];
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        out[i] <== scalar * in[i];
    }
}

// Computes CHUNK_NUMBER number power with EXP = exponent
// EXP is default num, not chunked bigInt!!!
// use for CHUNK_NUMBER!= 2**n, otherwise use "PowerMod"
template PowerModNonOptimised(CHUNK_SIZE, CHUNK_NUMBER, EXP) {

    assert(EXP >= 2);
    
    signal input base[CHUNK_NUMBER];
    signal input modulus[CHUNK_NUMBER];
    
    signal output out[CHUNK_NUMBER];
    
    var exp_process[256] = exp_to_bits_dl(EXP);
    
    component muls[exp_process[0]];
    component resultMuls[exp_process[1] - 1];
    
    for (var i = 0; i < exp_process[0]; i++){
        muls[i] = BigMultModPNonOptimised(CHUNK_SIZE, CHUNK_NUMBER);
        muls[i].in[2] <== modulus;
    }
    
    for (var i = 0; i < exp_process[1] - 1; i++){
        resultMuls[i] = BigMultModPNonOptimised(CHUNK_SIZE, CHUNK_NUMBER);
        resultMuls[i].in[2] <== modulus;
    }
    
    muls[0].in[0] <== base;
    muls[0].in[1] <== base;
    
    for (var i = 1; i < exp_process[0]; i++){
        muls[i].in[0] <== muls[i - 1].out;
        muls[i].in[1] <== muls[i - 1].out;
    }
    
    for (var i = 0; i < exp_process[1] - 1; i++){
        if (i == 0){
            if (exp_process[i + 2] == 0){
                resultMuls[i].in[0] <== base;
            } else {
                resultMuls[i].in[0] <== muls[exp_process[i + 2] - 1].out;
            }
            resultMuls[i].in[1] <== muls[exp_process[i + 3] - 1].out;
        }
        else {
            resultMuls[i].in[0] <== resultMuls[i - 1].out;
            resultMuls[i].in[1] <== muls[exp_process[i + 3] - 1].out;
        }
    }

    if (exp_process[1] == 1){
        out <== muls[exp_process[0] - 1].out;
    } else {
        out <== resultMuls[exp_process[1] - 2].out;
    }
}


//-------------------------------------------------------------------------------------------------------------------------------------------------
// comparators for big numbers

// For next 4 templates interface is the same, difference is only compare operation (<, <=, >, >=)
// input are in[2][CHUNK_NUMBER]
// there is no overflow allowed, so chunk are equal, otherwise this is no sense
// those are very "expensive" by constraints operations, try to reduse num of usage if these if u can

// in[0] < in[1]
template BigLessThan_dl(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    
    signal output out;
    
    component lessThan[CHUNK_NUMBER];
    component isEqual[CHUNK_NUMBER - 1];
    signal result[CHUNK_NUMBER - 1];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        lessThan[i] = LessThan(CHUNK_SIZE);
        lessThan[i].in[0] <== in[0][i];
        lessThan[i].in[1] <== in[1][i];
        
        if (i != 0){
            isEqual[i - 1] = IsEqual();
            isEqual[i - 1].in[0] <== in[0][i];
            isEqual[i - 1].in[1] <== in[1][i];
        }
    }
    
    for (var i = 1; i < CHUNK_NUMBER; i++){
        if (i == 1){
            result[i - 1] <== lessThan[i].out + isEqual[i - 1].out * lessThan[i - 1].out;
        } else {
            result[i - 1] <== lessThan[i].out + isEqual[i - 1].out * result[i - 2];
        }
    }
    out <== result[CHUNK_NUMBER - 2];
}

// in[0] <= in[1]
template BigLessEqThan(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    
    signal output out;
    
    component lessThan[CHUNK_NUMBER];
    component isEqual[CHUNK_NUMBER];
    signal result[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++){
        lessThan[i] = LessThan(CHUNK_SIZE);
        lessThan[i].in[0] <== in[0][i];
        lessThan[i].in[1] <== in[1][i];
        
        isEqual[i] = IsEqual();
        isEqual[i].in[0] <== in[0][i];
        isEqual[i].in[1] <== in[1][i];
    }
    
    for (var i = 0; i < CHUNK_NUMBER; i++){
        if (i == 0){
            result[i] <== lessThan[i].out + isEqual[i].out;
        } else {
            result[i] <== lessThan[i].out + isEqual[i].out * result[i - 1];
        }
    }
    
    out <== result[CHUNK_NUMBER - 1];
    
}

// in[0] > in[1]
template BigGreaterThan(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    
    signal output out;
    
    component lessEqThan = BigLessEqThan(CHUNK_SIZE, CHUNK_NUMBER);
    lessEqThan.in <== in;
    out <== 1 - lessEqThan.out;
}

// in[0] >= in[1]
template BigGreaterEqThan(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    
    signal output out;
    
    component lessThan = BigLessThan_dl(CHUNK_SIZE, CHUNK_NUMBER);
    lessThan.in <== in;
    out <== 1 - lessThan.out;
}

// force equal by all chunks with same position
// u also can do it for 3 constrains with some assumptions, check SmartEqual from "./bigIntOverflow"
// it is possible to save some constraints by log_2(n) operations, not n 
template BigIsEqual(CHUNK_SIZE, CHUNK_NUMBER) {
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
