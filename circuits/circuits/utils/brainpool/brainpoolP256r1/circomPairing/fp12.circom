pragma circom 2.0.3;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "fieldElementsFunc.circom";
include "fp.circom";
include "fp2.circom";
include "fp12Func.circom";
include "bls12_381Func.circom";

template Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, POWER){
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    var FP12_FROBENIUS_COEFFICIENTS[12][6][2][20] = get_Fp12_frobenius(CHUNK_SIZE, CHUNK_NUMBER);
    var POW = POWER % 12;
 
    component inFrob[6]; 
 
    // multiply inFrob[i] by FP12_FROBENIUS_COEFFICIENTS[POW][i] 
    // if POW is even, then FP12_FROBENIUS_COEFFICIENTS[POW][i] is in Fp instead of Fp2, so can optimize 
    component multOdd[6];
    component multEven[6][2];
    if((POW % 2) == 0){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[0][0][j] <== in[0][0][j];
            out[0][1][j] <== in[0][1][j];
        } 
        for(var i = 1; i < 6; i++){
            multEven[i][0] = FpMultiply(CHUNK_SIZE, CHUNK_NUMBER, P);
            multEven[i][1] = FpMultiply(CHUNK_SIZE, CHUNK_NUMBER, P);
            for(var j = 0; j < CHUNK_NUMBER; j++){
                multEven[i][0].a[j] <== in[i][0][j];
                multEven[i][1].a[j] <== in[i][1][j];

                multEven[i][0].b[j] <== FP12_FROBENIUS_COEFFICIENTS[POW][i][0][j];
                multEven[i][1].b[j] <== FP12_FROBENIUS_COEFFICIENTS[POW][i][0][j];
            }
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[i][0][j] <== multEven[i][0].out[j];
                out[i][1][j] <== multEven[i][1].out[j];
            }
        }
    } else {
        // apply Frob to coefficients first
        for(var i = 0; i < 6; i++){
            inFrob[i] = Fp2FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, POW, P); 
            for(var j = 0; j < CHUNK_NUMBER; j++){
                inFrob[i].in[0][j] <== in[i][0][j];
                inFrob[i].in[1][j] <== in[i][1][j];
            }
        }
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[0][0][j] <== inFrob[0].out[0][j];
            out[0][1][j] <== inFrob[0].out[1][j];
        } 
        for(var i = 1; i < 6; i++){
            multOdd[i] = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
            for(var j = 0; j < CHUNK_NUMBER; j++){
                for(var eps = 0; eps < 2; eps++){
                    multOdd[i].a[eps][j] <== inFrob[i].out[eps][j];
                    multOdd[i].b[eps][j] <== FP12_FROBENIUS_COEFFICIENTS[POW][i][eps][j];
                }
            }
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[i][0][j] <== multOdd[i].out[0][j];
                out[i][1][j] <== multOdd[i].out[1][j];
            }
        }
    }
}

template Fp12Add(CHUNK_SIZE, CHUNK_NUMBER, P) {
    signal input a[6][2][CHUNK_NUMBER];
    signal input b[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];
    component adders[6][2];
    for (var i = 0; i < 6; i ++) {
        for (var j = 0; j < 2; j ++) {
            adders[i][j] = FpAdd(CHUNK_SIZE,CHUNK_NUMBER, P);
            for (var M = 0; M < CHUNK_NUMBER; M ++) {
                adders[i][j].a[M] <== a[i][j][M];
                adders[i][j].b[M] <== b[i][j][M];
                adders[i][j].P[M] <== P[M];
            }
            for (var M = 0; M < CHUNK_NUMBER; M ++) {
                out[i][j][M] <== adders[i][j].out[M];
            }
        }
    }
}

// a is CHUNK_NUMBER array representing element a of Fp allowing negative registers
// b is 6 x 2 x CHUNK_NUMBER array representing element b0 + b1 u of Fp12 allowing negative registers
//      where b_i = b[][i][] is 6 x CHUNK_NUMBER array
// out is a*b in Fp12 as 6 x 2 x (2k - 1) array
// M_OUT is the expected max number of bits in the output registers
template SignedFp12ScalarMultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, M_OUT){
    signal input a[CHUNK_NUMBER];
    signal input b[6][2][CHUNK_NUMBER];
    signal output out[6][2][2 * CHUNK_NUMBER - 1];

    component ab[6][2]; 
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            ab[i][j] = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, M_OUT); // 2k - 1 registers 

            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                ab[i][j].a[idx] <== a[idx];
                ab[i][j].b[idx] <== b[i][j][idx]; 
            } 
        }
    }
    
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                out[i][j][idx] <== ab[i][j].out[idx];
            }
        }
    }
}

// M_OUT is the expected max number of bits in the output registers
template SignedFp12ScalarMultiplyNoCarryUnequal(CHUNK_SIZE, ka, kb, M_OUT){
    signal input a[ka];
    signal input b[6][2][kb];
    signal output out[6][2][ka + kb - 1];

    component ab[6][2]; 
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            ab[i][j] = BigMultShortLongUnequal(CHUNK_SIZE, ka, kb, M_OUT); // 2k - 1 registers 

            for(var idx = 0; idx < ka; idx++){
                ab[i][j].a[idx] <== a[idx];
            }
            for(var idx = 0; idx < kb; idx++){
                ab[i][j].b[idx] <== b[i][j][idx]; 
            }
        }
    }
    
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < ka + kb - 1; idx++){
                out[i][j][idx] <== ab[i][j].out[idx];
            }
        }
    }
}

// a is 2 x CHUNK_NUMBER array representing element a of Fp2 allowing negative registers
// b is 6 x 2 x CHUNK_NUMBER array representing element b0 + b1 u of Fp12 allowing negative registers
//      where b_i = b[][i][] is 6 x CHUNK_NUMBER array
// out is a*b in Fp12 as 6 x 2 x (2k - 1) array
// M_OUT is the expected max number of bits in the output registers
template SignedFp12Fp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, M_OUT){
    signal input a[2][CHUNK_NUMBER];
    signal input b[6][2][CHUNK_NUMBER];
    signal output out[6][2][2 * CHUNK_NUMBER - 1];

    component ab[6][2];
    component abi[6][2];
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            ab[i][j] = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, M_OUT); // 2k - 1 registers
            abi[i][j] = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, M_OUT); // 2k - 1 registers 

            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                ab[i][j].a[idx] <== a[0][idx];
                ab[i][j].b[idx] <== b[i][j][idx]; 
            } 
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                abi[i][j].a[idx] <== a[1][idx];
                abi[i][j].b[idx] <== b[i][j][idx]; 
            }
        }
    }
    
    for(var i = 0; i < 6; i++){
        for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++) {
            out[i][0][idx] <== ab[i][0].out[idx] - abi[i][1].out[idx];
            out[i][1][idx] <== abi[i][0].out[idx] + ab[i][1].out[idx];
        }
    }
    
}

// M_OUT is the expected max number of bits in the output registers
template SignedFp12Fp2MultiplyNoCarryUnequal(CHUNK_SIZE, ka, kb, M_OUT){
    signal input a[2][ka];
    signal input b[6][2][kb];
    signal output out[6][2][ka + kb - 1];

    component ab[6][2];
    component abi[6][2];
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            ab[i][j] = BigMultShortLongUnequal(CHUNK_SIZE, ka, kb, M_OUT); // 2k - 1 registers
            abi[i][j] = BigMultShortLongUnequal(CHUNK_SIZE, ka, kb, M_OUT); // 2k - 1 registers 

            for(var idx = 0; idx < ka; idx++){
                ab[i][j].a[idx] <== a[0][idx];
                abi[i][j].a[idx] <== a[1][idx];
            }
            for(var idx = 0; idx < kb; idx++){
                ab[i][j].b[idx] <== b[i][j][idx];
                abi[i][j].b[idx] <== b[i][j][idx];
            }
        }
    }
    
    for(var i = 0; i < 6; i++){
        for(var idx = 0; idx < ka + kb - 1; idx++){
            out[i][0][idx] <== ab[i][0].out[idx] - abi[i][1].out[idx];
            out[i][1][idx] <== abi[i][0].out[idx] + ab[i][1].out[idx];
        }
    }
}

// we first write a = a0 + a1 u, b = b0 + b1 u for ai, bi being:
//     * length 6 vectors with ka, kb registers in (-B_a, B_a) and (-B_b, B_b)
// ab = (a0 b0 - a1 b1) + (a0 b1 + a1 b0) u
// a_i b_j is degree 10 polynomial in w
// Assume w^6 = XI0 + u and convert ab into degree 5 polynomials in w by substitution
// The real and imaginary parts are
//     * length 6 vectors with ka + kb - 1 registers abs val < B_a * B_b * 6 * min(ka, kb) * (2 + XI0)
// M_OUT is the expected max number of bits in the output registers
template SignedFp12MultiplyNoCarryUnequal(CHUNK_SIZE, ka, kb, M_OUT){
    var L = 6;
    var XI0 = 1;
    signal input a[L][2][ka];
    signal input b[L][2][kb];
    signal output out[L][2][ka + kb  - 1];

    component a0b0 = BigMultShortLong2DUnequal(CHUNK_SIZE, ka, kb, L, L);
    component a0b1 = BigMultShortLong2DUnequal(CHUNK_SIZE, ka, kb, L, L);
    component a1b0 = BigMultShortLong2DUnequal(CHUNK_SIZE, ka, kb, L, L);
    component a1b1 = BigMultShortLong2DUnequal(CHUNK_SIZE, ka, kb, L, L);
    
    for (var i = 0; i < L; i ++) {
        for (var j = 0; j < ka; j ++) {
            a0b0.a[i][j] <== a[i][0][j];
            a0b1.a[i][j] <== a[i][0][j];

            a1b0.a[i][j] <== a[i][1][j];
            a1b1.a[i][j] <== a[i][1][j];
        }
        for (var j = 0; j < kb; j ++) {
            a0b0.b[i][j] <== b[i][0][j];
            a1b0.b[i][j] <== b[i][0][j];

            a0b1.b[i][j] <== b[i][1][j];
            a1b1.b[i][j] <== b[i][1][j];
        }
	}
    
    // X[][0] = a0 b0 - a1 b1
    // X[][1] = a0 b1 + a1 b0 
    // X[][0] = sum_{i = 0}^10 X[i][0] * w^i 
    signal X[2 * L - 1][2][ka + kb - 1];
    for (var i = 0; i < 2 * L - 1; i++) {
        for (var j = 0; j < ka + kb - 1; j++) {
            X[i][0][j] <== a0b0.out[i][j] - a1b1.out[i][j];
            X[i][1][j] <== a0b1.out[i][j] + a1b0.out[i][j];
        }
    }

    // X[i+6][0] w^{i+6} = X[i+6][0] * XI0 * w^i + X[i+6][0] * w^i       * u 
    // X[i+6][1] w^{i+6} = - X[i+6][1] * w^i       X[i+6][1] * XI0 * w^i * u 
    for (var i = 0; i < L; i++){
        for (var j = 0; j < ka + kb - 1; j++) {
            if (i < L - 1) {
                out[i][0][j] <== X[i][0][j] + X[L + i][0][j] * XI0 - X[L + i][1][j];
                out[i][1][j] <== X[i][1][j] + X[L + i][0][j]       + X[L + i][1][j];
            } else {
                out[i][0][j] <== X[i][0][j];
                out[i][1][j] <== X[i][1][j];
            }
        }
    }
}

template SignedFp12MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, M_OUT){
    var L = 6;
    signal input a[L][2][CHUNK_NUMBER];
    signal input b[L][2][CHUNK_NUMBER];
    signal output out[L][2][2 * CHUNK_NUMBER - 1];
    
    component mult = SignedFp12MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, M_OUT);
    for(var i = 0; i < L; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                mult.a[i][j][idx] <== a[i][j][idx];
                mult.b[i][j][idx] <== b[i][j][idx];
            }
        }
    }

    for(var i = 0; i < L; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                out[i][j][idx] <== mult.out[i][j][idx]; 
            }
        }
    }
}

// M_OUT is the expected max number of bits in the output registers
template Fp12Compress(CHUNK_SIZE, CHUNK_NUMBER, M, P, M_OUT){
    var L = 6;
    signal input in[L][2][CHUNK_NUMBER+M];
    signal output out[L][2][CHUNK_NUMBER];

    component reduce[L][2];
    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            reduce[i][j] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, M, P, M_OUT);
            for (var idx = 0; idx < CHUNK_NUMBER + M; idx++){
                reduce[i][j].in[idx] <== in[i][j][idx];
            }
        }
    }

    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            for (var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== reduce[i][j].out[idx];
            }
        }
    }
}

// Input is same as for Fp12MultiplyNoCarry
// Our answer is the prime reduction of output of Fp12MultiplyNoCarry to
//     * length 6 vectors with CHUNK_NUMBER registers in [0, B_a * B_b * 2^CHUNK_SIZE * 6 * (2 + XI0) * CHUNK_NUMBER^2)
// P is length CHUNK_NUMBER
// m_in is the expected max number of bits in the input registers (necessary for some intermediate overflow validation)
// M_OUT is the expected max number of bits in the output registers
template SignedFp12MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, P, m_in, M_OUT) {
    var L = 6;
    var XI0 = 1;
    signal input a[L][2][CHUNK_NUMBER];
    signal input b[L][2][CHUNK_NUMBER];
    signal output out[L][2][CHUNK_NUMBER];

    var LOGK1 = log_ceil(6 * CHUNK_NUMBER * (2 + XI0));
    component noCarry = SignedFp12MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * m_in + LOGK1);
    for (var i = 0; i < L; i ++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){ 
                noCarry.a[i][j][idx] <== a[i][j][idx];
                noCarry.b[i][j][idx] <== b[i][j][idx];
            }
        }
    }

    component reduce = Fp12Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, M_OUT);
    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            for (var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                reduce.in[i][j][idx] <== noCarry.out[i][j][idx];
            }
        }
    }

    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            for (var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== reduce.out[i][j][idx];
            }
        }
    }
}

// solve for: in = X * P + out
// X has Ceil(overflow / CHUNK_SIZE) registers, lying in [-2^CHUNK_SIZE, 2^CHUNK_SIZE)
// assume in has registers in [0, 2^overflow)
template SignedFp12CarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflow, P) {
    var L = 6;
    var M = (overflow + CHUNK_SIZE - 1) \ CHUNK_SIZE;
    signal input in[L][2][CHUNK_NUMBER];
    signal output X[L][2][M];
    signal output out[L][2][CHUNK_NUMBER];

    assert(overflow < 251);

    component carry[L][2];
    for(var i = 0; i < L; i++){
        for(var j = 0; j < 2; j++){
            carry[i][j] = SignedFpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflow, P);
            for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                carry[i][j].in[idx] <== in[i][j][idx];
            for(var idx = 0; idx<M; idx++)
                X[i][j][idx] <== carry[i][j].X[idx];
            for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                out[i][j][idx] <== carry[i][j].out[idx];
        }
    }
}


// version of Fp12Multiply that uses the prime reduction trick
// takes longer to compile
// assumes P has CHUNK_NUMBER registers with kth register nonzero
template Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, P) {
    var L = 6;
    var XI0 = 1;
    signal input a[L][2][CHUNK_NUMBER];
    signal input b[L][2][CHUNK_NUMBER];
    
    signal output out[L][2][CHUNK_NUMBER];

    var LOGK2 = log_ceil(6 * CHUNK_NUMBER * CHUNK_NUMBER * (2 + XI0)); 
    component noCarry = SignedFp12MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, P, CHUNK_SIZE, 3 * CHUNK_SIZE + LOGK2);
    // registers abs val < 2^{3n} * 6 * (2 + XI0) * CHUNK_NUMBER^2)
    for (var i = 0; i < L; i++){
        for(var j = 0; j < 2; j++){
            for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                noCarry.a[i][j][idx] <== a[i][j][idx];
                noCarry.b[i][j][idx] <== b[i][j][idx];
            }
        }
    }
    component carryMod;
    carryMod = SignedFp12CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, P);
    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            for (var idx = 0; idx < CHUNK_NUMBER; idx++){
		        carryMod.in[i][j][idx] <== noCarry.out[i][j][idx];
            }
        }
    }   
    
    for (var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++){
            for (var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== carryMod.out[i][j][idx];
            }
        }
    }
}

// unoptimized squaring, just takes two elements of Fp12 and multiplies them
template Fp12Square(CHUNK_SIZE, CHUNK_NUMBER, P) {
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    // for now just use plain multiplication, this can be optimized later
    component square = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var i = 0; i < 6; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            square.a[i][0][j] <== in[i][0][j];
            square.a[i][1][j] <== in[i][1][j];
        
            square.b[i][0][j] <== in[i][0][j];
            square.b[i][1][j] <== in[i][1][j];
        }
    }

    for(var i = 0; i < 6; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[i][0][j] <== square.out[i][0][j];
            out[i][1][j] <== square.out[i][1][j];
        }
    }
}


// not actually a relevant circuit - this only exists to test find_Fp6_inverse
template Fp6Invert(CHUNK_SIZE, CHUNK_NUMBER, P) {
    signal input a0[2][CHUNK_NUMBER];
    signal input a1[2][CHUNK_NUMBER];
    signal input a2[2][CHUNK_NUMBER];
    var out[6][2][150] = find_Fp6_inverse(CHUNK_SIZE, CHUNK_NUMBER, P, a0, a1, a2);
    signal output real_out[6][2][CHUNK_NUMBER];
    for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 2; j ++) {
            for (var idx = 0; idx < CHUNK_NUMBER; idx++) {
                real_out[i][j][idx] <-- out[i][j][idx];
            }
        }
    }
}

// Call find_Fp12_inverse to compute INVERSE
// Then check out * in = 1, out is an array of shorts
template Fp12Invert(CHUNK_SIZE, CHUNK_NUMBER, P){
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var INVERSE[6][2][150] = find_Fp12_inverse(CHUNK_SIZE, CHUNK_NUMBER, P, in); // 6 x 2 x 150, only 6 x 2 x CHUNK_NUMBER relevant
    for (var i = 0; i < 6; i ++) {
        for (var j = 0; j < 2; j ++) {
            for (var M = 0; M < CHUNK_NUMBER; M ++) {
                out[i][j][M] <-- INVERSE[i][j][M];
            }
        }
    }

    component outRangeChecks[6][2][CHUNK_NUMBER];
    for(var i = 0; i < 6; i++) {
        for(var j = 0; j < 2; j++) {
            for(var M = 0; M < CHUNK_NUMBER; M++) {
                outRangeChecks[i][j][M] = Num2Bits(CHUNK_SIZE);
                outRangeChecks[i][j][M].in <== out[i][j][M];
            }
        }
    }

    component inOut = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var i = 0; i < 6; i++) {
        for(var j = 0; j < 2; j++) {
            for(var M = 0; M < CHUNK_NUMBER; M++) {
                inOut.a[i][j][M] <== in[i][j][M];
                inOut.b[i][j][M] <== out[i][j][M];
            }
        }
    }

    for(var i = 0; i < 6; i++){
        for(var j = 0; j < 2; j++){
            for(var M = 0; M < CHUNK_NUMBER; M ++) {
                if(i == 0 && j == 0 && M == 0){
                    inOut.out[i][j][M] === 1;
                } else {
                    inOut.out[i][j][M] === 0;
                }
            }
        }
    }
}

// input is an element of Fp12 
// output is input raised to the e-th POWER
// use the square and multiply method
// assume 0 < e < 2^254
template Fp12Exp(CHUNK_SIZE, CHUNK_NUMBER, e, P) {
    assert(e > 0);

    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var temp = e;
    var BITLENGTH;
    for(var i = 0; i < 254; i++){
        if(temp != 0){
            BITLENGTH = i; 
        }
        temp = temp >> 1;
    }
    BITLENGTH++;
    component pow2[BITLENGTH]; // pow2[i] = in^{2^i} 
    component mult[BITLENGTH];

    signal first[6][2][CHUNK_NUMBER];
    var CUR_ID = 0;

    for(var i = 0; i < BITLENGTH; i++){
        // compute pow2[i] = pow2[i - 1]**2
        if(i > 0){ // pow2[0] is never defined since there is no squaring involved
            pow2[i] = Fp12Square(CHUNK_SIZE, CHUNK_NUMBER, P);
            for(var j = 0; j < CHUNK_NUMBER; j++) {
                pow2[i].P[j] <== P[j];
            }
            if(i == 1){
                for(var id = 0; id < 6; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            pow2[i].in[id][eps][j] <== in[id][eps][j];
                        }
                    }
                }
            } else {
                for(var id = 0; id < 6; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            pow2[i].in[id][eps][j] <== pow2[i - 1].out[id][eps][j];
                        }
                    }
                }
            }
        }
        if(((e >> i) & 1) == 1){
            if(CUR_ID == 0){ // this is the least significant bit
                if(i == 0){
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++)
                                first[id][eps][j] <== in[id][eps][j];
                        }
                    }
                } else {
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++){
                                first[id][eps][j] <== pow2[i].out[id][eps][j];
                            }
                        }
                    }
                }
            } else {
                // multiply what we already have with pow2[i]
                mult[CUR_ID] = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, P); 
                for(var id = 0; id < 6; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            mult[CUR_ID].a[id][eps][j] <== pow2[i].out[id][eps][j];
                        }
                    }
                }
                if(CUR_ID == 1){
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++){
                                mult[CUR_ID].b[id][eps][j] <== first[id][eps][j];
                            }
                        }
                    }
                } else {
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++){
                                mult[CUR_ID].b[id][eps][j] <== mult[CUR_ID - 1].out[id][eps][j];
                            }
                        }
                    }
                }
            } 
            CUR_ID++; 
        }
    }
    CUR_ID--;
    if(CUR_ID == 0){
        for(var id = 0; id < 6; id++){
            for(var eps = 0; eps < 2; eps++){
                for(var j = 0; j < CHUNK_NUMBER; j++){
                    out[id][eps][j] <== first[id][eps][j];
                }
            }
        }
    } else {
        for(var id = 0; id < 6; id++){
            for(var eps = 0; eps < 2; eps++){
                for(var j = 0; j < CHUNK_NUMBER; j++){
                    out[id][eps][j] <== mult[CUR_ID].out[id][eps][j];
                }
            }
        }
    }
}

