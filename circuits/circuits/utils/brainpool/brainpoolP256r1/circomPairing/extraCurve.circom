pragma circom 2.0.2;

include "circomlib/circuits/bitify.circom";

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "./fp.circom";
include "./fp2.circom";
include "./fp12.circom";
include "./curve.circom";

// requires a[0] != b[0]
//
// Implements:
// lamb = (b[1] - a[1]) / (b[0] - a[0]) % Q
// out[0] = lamb ** 2 - a[0] - b[0] % Q
// out[1] = lamb * (a[0] - out[0]) - a[1] % Q
template EllipticCurveAddUnequal3Reg(CHUNK_SIZE, Q0, Q1, Q2) {
    var CHUNK_NUMBER = 3;
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    var Q[20];
    Q[0] = Q0;
    Q[1] = Q1;
    Q[2] = Q2;
    for (var idx = 3; idx < 20; idx++) {
	    Q[idx] = 0;
    }
    
    // b[1] - a[1]
    component sub1 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub1.a[i] <== b[1][i];
        sub1.b[i] <== a[1][i];
        sub1.p[i] <== Q[i];
    }

    // b[0] - a[0]
    component sub0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub0.a[i] <== b[0][i];
        sub0.b[i] <== a[0][i];
        sub0.p[i] <== Q[i];
    }

    signal LAMBDA[CHUNK_NUMBER];
    var SUB_0_INV[20] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, sub0.out, Q);
    var SUB1_SUB_0_INV[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, sub1.out, SUB_0_INV);
    var LAMB_ARR[2][20] = long_div(CHUNK_SIZE, CHUNK_NUMBER, SUB1_SUB_0_INV, Q);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        LAMBDA[i] <-- LAMB_ARR[1][i];
    }
    component rangeChecks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        rangeChecks[i] = Num2Bits(CHUNK_SIZE);
        rangeChecks[i].in <== LAMBDA[i];
    }
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lessThan.a[i] <== LAMBDA[i];
        lessThan.b[i] <== Q[i];
    }
    lessThan.out === 1;

    component lambdaCheck = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaCheck.a[i] <== sub0.out[i];
        lambdaCheck.b[i] <== LAMBDA[i];
        lambdaCheck.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaCheck.out[i] === sub1.out[i];
    }

    component lambdaSq = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaSq.a[i] <== LAMBDA[i];
        lambdaSq.b[i] <== LAMBDA[i];
        lambdaSq.p[i] <== Q[i];
    }
    component out0Pre = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0Pre.a[i] <== lambdaSq.out[i];
        out0Pre.b[i] <== a[0][i];
        out0Pre.p[i] <== Q[i];
    }
    component out0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0.a[i] <== out0Pre.out[i];
        out0.b[i] <== b[0][i];
        out0.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[0][i] <== out0.out[i];
    }

    component out1_0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_0.a[i] <== a[0][i];
        out1_0.b[i] <== out[0][i];
        out1_0.p[i] <== Q[i];
    }
    component out1_1 = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_1.a[i] <== LAMBDA[i];
        out1_1.b[i] <== out1_0.out[i];
        out1_1.p[i] <== Q[i];
    }
    component out1 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1.a[i] <== out1_1.out[i];
        out1.b[i] <== a[1][i];
        out1.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[1][i] <== out1.out[i];
    }    
}

// requires a[0] != b[0]
//
// Implements:
// lamb = (b[1] - a[1]) / (b[0] - a[0]) % Q
// out[0] = lamb ** 2 - a[0] - b[0] % Q
// out[1] = lamb * (a[0] - out[0]) - a[1] % Q
template EllipticCurveAddUnequal4Reg(CHUNK_SIZE, Q0, Q1, Q2, q3) {
    var CHUNK_NUMBER = 4;
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    var Q[20];
    Q[0] = Q0;
    Q[1] = Q1;
    Q[2] = Q2;
    Q[3] = q3;
    for (var idx = 4; idx < 20; idx++) {
	    Q[idx] = 0;
    }
    
    // b[1] - a[1]
    component sub1 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub1.a[i] <== b[1][i];
        sub1.b[i] <== a[1][i];
        sub1.p[i] <== Q[i];
    }

    // b[0] - a[0]
    component sub0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub0.a[i] <== b[0][i];
        sub0.b[i] <== a[0][i];
        sub0.p[i] <== Q[i];
    }

    signal LAMBDA[CHUNK_NUMBER];
    var SUB_0_INV[20] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, sub0.out, Q);
    var SUB1_SUB_0_INV[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, sub1.out, SUB_0_INV);
    var LAMB_ARR[2][20] = long_div(CHUNK_SIZE, CHUNK_NUMBER, SUB1_SUB_0_INV, Q);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        LAMBDA[i] <-- LAMB_ARR[1][i];
    }
    component rangeChecks[CHUNK_NUMBER];
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        rangeChecks[i] = Num2Bits(CHUNK_SIZE);
        rangeChecks[i].in <== LAMBDA[i];
    }
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lessThan.a[i] <== LAMBDA[i];
        lessThan.b[i] <== Q[i];
    }
    lessThan.out === 1;

    component lambdaCheck = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaCheck.a[i] <== sub0.out[i];
        lambdaCheck.b[i] <== LAMBDA[i];
        lambdaCheck.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaCheck.out[i] === sub1.out[i];
    }

    component lambdaSq = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaSq.a[i] <== LAMBDA[i];
        lambdaSq.b[i] <== LAMBDA[i];
        lambdaSq.p[i] <== Q[i];
    }
    component out0Pre = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0Pre.a[i] <== lambdaSq.out[i];
        out0Pre.b[i] <== a[0][i];
        out0Pre.p[i] <== Q[i];
    }
    component out0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0.a[i] <== out0Pre.out[i];
        out0.b[i] <== b[0][i];
        out0.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[0][i] <== out0.out[i];
    }

    component out1_0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_0.a[i] <== a[0][i];
        out1_0.b[i] <== out[0][i];
        out1_0.p[i] <== Q[i];
    }
    component out1_1 = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_1.a[i] <== LAMBDA[i];
        out1_1.b[i] <== out1_0.out[i];
        out1_1.p[i] <== Q[i];
    }
    component out1 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1.a[i] <== out1_1.out[i];
        out1.b[i] <== a[1][i];
        out1.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[1][i] <== out1.out[i];
    }    
}

// Elliptic curve is E : y**2 = x**3 + a x + b
// Note that for BLS12-381, a = 0, b = 4

// Implements:
// computing 2P on elliptic curve E for P = (in[0], in[1])
// formula from https://crypto.stanford.edu/pbc/notes/elliptic/explicit.html

// lamb =  (3 * in[0] ** 2 + a) / (2 * in[1]) % Q
// out[0] = lamb ** 2 - 2 * in[0] % Q
// out[1] = lamb * (in[0] - out[0]) - in[1] % Q
template EllipticCurveDouble0(CHUNK_SIZE, CHUNK_NUMBER, a, Q0, Q1, Q2, q3) {
    signal input in[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    // assuming Q < 2 *  * (4n) 
    // represent Q = Q0 + Q1 * 2 * *CHUNK_SIZE + Q2 * 2 *  * (2n) + q3 * 2 *  * (3n)
    // not sure how I feel about this convention...
    var Q[20];
    Q[0] = Q0;
    Q[1] = Q1;
    Q[2] = Q2;
    Q[3] = q3;
    for (var idx = 4; idx < 20; idx++) {
	    Q[idx] = 0;
    }

    // assuming a is small 
    var LONG_A[20];
    LONG_A[0] = a;
    for (var i = 1; i < 20; i++) {
        LONG_A[i] = 0;   
    }

    component in0Sq = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        in0Sq.a[i] <== in[0][i];
        in0Sq.b[i] <== in[0][i];
        in0Sq.p[i] <== Q[i];
    }

    var LONG_2[20];
    var LONG_3[20];
    LONG_2[0] = 2;
    LONG_3[0] = 3;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        LONG_A[i] = 0;
        LONG_2[i] = 0;
        LONG_3[i] = 0;
    }
    var INV_2[20] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, LONG_2, Q);
    var LONG_3_DIV_2[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, LONG_3, INV_2);
    var LONG_3_DIV_2_MOD_Q[2][20] = long_div(CHUNK_SIZE, CHUNK_NUMBER, LONG_3_DIV_2, Q);

    // numerator = 3/2 * in[0]**2 + a
    // numer1 = 3/2 * in[0]**2
    component numer1 = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        numer1.a[i] <== LONG_3_DIV_2_MOD_Q[1][i];
        numer1.b[i] <== in0Sq.out[i];
        numer1.p[i] <== Q[i];
    }
    component numer = BigAddModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        numer.a[i] <== numer1.out[i];
        numer.b[i] <== LONG_A[i];
        numer.p[i] <== Q[i];
    }

    signal LAMBDA[CHUNK_NUMBER];
    var DENOM_INV[20] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, in[1], Q);
    var PRODUCT[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, numer.out, DENOM_INV);
    var LAMB_ARR[2][20] = long_div(CHUNK_SIZE, CHUNK_NUMBER, PRODUCT, Q);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        LAMBDA[i] <-- LAMB_ARR[1][i];
    }
    component lessThan = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lessThan.a[i] <== LAMBDA[i];
        lessThan.b[i] <== Q[i];
    }
    lessThan.out === 1;

    component lambdaRangeChecks[CHUNK_NUMBER];
    component lambdaCheck = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaRangeChecks[i] = Num2Bits(CHUNK_SIZE);
        lambdaRangeChecks[i].in <== LAMBDA[i];

        lambdaCheck.a[i] <== in[1][i];
        lambdaCheck.b[i] <== LAMBDA[i];
        lambdaCheck.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaCheck.out[i] === numer.out[i];
    }

    component lambdaSq = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        lambdaSq.a[i] <== LAMBDA[i];
        lambdaSq.b[i] <== LAMBDA[i];
        lambdaSq.p[i] <== Q[i];
    }
    component out0Pre = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0Pre.a[i] <== lambdaSq.out[i];
        out0Pre.b[i] <== in[0][i];
        out0Pre.p[i] <== Q[i];
    }
    // out0 = LAMBDA**2 - 2 * in[0]
    component out0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out0.a[i] <== out0Pre.out[i];
        out0.b[i] <== in[0][i];
        out0.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[0][i] <== out0.out[i];
    }

    component out1_0 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_0.a[i] <== in[0][i];
        out1_0.b[i] <== out[0][i];
        out1_0.p[i] <== Q[i];
    }
    component out1_1 = BigMultModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1_1.a[i] <== LAMBDA[i];
        out1_1.b[i] <== out1_0.out[i];
        out1_1.p[i] <== Q[i];
    }
    component out1 = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out1.a[i] <== out1_1.out[i];
        out1.b[i] <== in[1][i];
        out1.p[i] <== Q[i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[1][i] <== out1.out[i];
    }
}

/*
// P = (x, y)
// a = - 3x^2 
// b = 2 y
// c = 3 x^3 - 2 y^2 
// a, c registers in [0, 2^CHUNK_SIZE), b registers in [0, 2^{CHUNK_SIZE})
// out = [a, b, c]
template LineEqualCoefficients(CHUNK_SIZE, CHUNK_NUMBER, Q){
    signal input P[2][CHUNK_NUMBER]; 
    signal output out[3][CHUNK_NUMBER];
    
    component xsq3 = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER); // 2k - 1 registers [0, 3 * CHUNK_NUMBER* 2^{2n})
    component ysq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER); // 2k - 1 registers [0, CHUNK_NUMBER*2^{2n}) 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        xsq3.a[i] <== 3 * P[0][i];
        xsq3.b[i] <== P[0][i];
        
        ysq.a[i] <== P[1][i];
        ysq.b[i] <== P[1][i];
    }
    
    component xcube3 = BigMultShortLongUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER); // 3k - 2  registers [0, 3 * CHUNK_NUMBER^2 *  2^{3n})
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        xcube3.a[i] <== xsq3.out[i];
    for(var i = 0; i < CHUNK_NUMBER; i++)
        xcube3.b[i] <== P[0][i];

    
    component xsq3red = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, Q); // CHUNK_NUMBER registers in [0, CHUNK_NUMBER^2 * 2^{3n})
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) 
        xsq3red.in[i] <== xsq3.out[i];
    
    component a = FpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + log_ceil(CHUNK_NUMBER * CHUNK_NUMBER), Q);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        a.in[0][i] <== 0;
        a.in[1][i] <== xsq3red.out[i];
    }
    for(var i = 0; i < CHUNK_NUMBER; i++)
        out[0][i] <== a.out[i];
    
    // I think reducing registers of b to [0, 2^CHUNK_SIZE) is still useful for future multiplications
    component b = BigAddModP(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        b.a[i] <== P[1][i];
        b.b[i] <== P[1][i];
        b.p[i] <== Q[i];
    }
    for(var i = 0; i < CHUNK_NUMBER; i++)
        out[1][i] <== b.out[i];
    
    component xcube3red = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, Q); // CHUNK_NUMBER registers in [0, 3 * CHUNK_NUMBER^2 * (2 * CHUNK_NUMBER - 2 ) * 2^{4n})
    for(var i = 0; i < 3 * CHUNK_NUMBER - 2; i++) 
        xcube3red.in[i] <== xcube3.out[i];
    
    component ysqred = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, Q); 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) 
        ysqred.in[i] <== ysq.out[i];

    component c = FpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + log_ceil(3 * CHUNK_NUMBER * CHUNK_NUMBER * (2 * CHUNK_NUMBER - 2 )), Q); 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        c.in[0][i] <== xcube3red.out[i];
        c.in[1][i] <== 2 * ysqred.out[i];
    }
    for(var i = 0; i < CHUNK_NUMBER; i++)
        out[2][i] <== c.out[i];
    
}*/



// Assuming curve is of form Y^2 = X^3 + b for now (a = 0) for better register bounds 
// Inputs:
//  P is 2 x CHUNK_NUMBER array where P = (x, y) is a point in E[r](Fq) 
//  Q is 2 x 6 x 2 x CHUNK_NUMBER array representing point (X, Y) in E(Fq12) 
// Output:
// f_r(Q) where <f_r >= [r]P - [r]O is computed using Miller's algorithm
// Assume:
//  r has CHUNK_NUMBER registers in [0, 2^CHUNK_SIZE)
//  Q has CHUNK_NUMBER registers in [0, 2^CHUNK_SIZE)
//  r is prime
//  P != O so the order of P in E(Fq) is r, so [i]P != [j]P for i != j in Z/r 
template MillerLoop1(CHUNK_SIZE, CHUNK_NUMBER, b, r, q){
    signal input P[2][CHUNK_NUMBER]; 
    signal input Q[2][6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    var XI0 = 1;
    var LOGK2 = log_ceil(36 * (2 + XI0) * (2 + XI0) * CHUNK_NUMBER * CHUNK_NUMBER);
    var LOGK3 = log_ceil(36 * (2 + XI0) * (2 + XI0) * CHUNK_NUMBER * CHUNK_NUMBER * (2 * CHUNK_NUMBER - 1));
    assert(4 * CHUNK_SIZE + LOGK3 < 251);


    var BITS[513]; // length is CHUNK_NUMBER * CHUNK_SIZE
    var BIT_LENGTH;
    var SIG_BITS = 0;
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        for (var j = 0; j < CHUNK_SIZE; j++) {
            BITS[j + CHUNK_SIZE * i] = (r[i] >> j) & 1;
            if(BITS[j + CHUNK_SIZE * i] == 1){
                SIG_BITS++;
                BIT_LENGTH = j + CHUNK_SIZE * i + 1;
            }
        }
    }

    signal pInterMed[BIT_LENGTH][2][CHUNK_NUMBER]; 
    signal f[BIT_LENGTH][6][2][CHUNK_NUMBER];

    component pDouble[BIT_LENGTH];
    component fDouble[BIT_LENGTH];
    component square[BIT_LENGTH];
    component line[BIT_LENGTH];
    component compress[BIT_LENGTH];
    component noCarry[BIT_LENGTH];
    component pAdd[SIG_BITS];
    component fAdd[SIG_BITS]; 
    component fAddPre[SIG_BITS]; 
    var CUR_ID = 0;

    for(var i=BIT_LENGTH - 1; i >= 0; i--){
        if(i == BIT_LENGTH - 1){
            // f = 1 
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        if(l == 0 && j == 0 && idx == 0){
                            f[i][l][j][idx] <== 1;
                        } else {    
                            f[i][l][j][idx] <== 0;
                        }
                    }
                }
            }
            for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                pInterMed[i][j][idx] <== P[j][idx];
        } else {
            // compute fDouble[i] = f[i+1]^2 * l_{pInterMed[i+1], pInterMed[i+1]}(Q) 
            square[i] = SignedFp12MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 4 + LOGK); // 6 x 2 x 2k - 1 registers in [0, 6 * CHUNK_NUMBER * (2 + XI0) * 2^{2n})
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        square[i].a[l][j][idx] <== f[i+1][l][j][idx];
                        square[i].b[l][j][idx] <== f[i+1][l][j][idx];
                    }
                }
            }

            line[i] = LineFunctionEqual(CHUNK_SIZE, CHUNK_NUMBER, q); // 6 x 2 x CHUNK_NUMBER registers in [0, 2^CHUNK_SIZE) 
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    line[i].P[j][idx] <== pInterMed[i+1][j][idx];            
                }
            }
            for(var eps = 0; eps < 2; eps++){
                for(var l = 0; l < 6; l++){
                    for(var j = 0; j < 2; j++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            line[i].Q[eps][l][j][idx] <== Q[eps][l][j][idx];
                        }
                    }
                }
            }

            noCarry[i] = SignedFp12MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2); // 6 x 2 x 3k - 2  registers < (6 * (2 + XI0))^2 * CHUNK_NUMBER^2 * 2^{3n}) 
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                        noCarry[i].a[l][j][idx] <== square[i].out[l][j][idx];
                    }
                }
            }
            
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        noCarry[i].b[l][j][idx] <== line[i].out[l][j][idx];
                    }
                }
            }
            
            compress[i] = Fp12Compress(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, q, 4 * CHUNK_SIZE + LOGK3); // 6 x 2 x CHUNK_NUMBER registers < (6 * (2 +  XI0))^2 * CHUNK_NUMBER^2 * (2k - 1) * 2^{4n})
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < 3 * CHUNK_NUMBER - 2; idx++){
                        compress[i].in[l][j][idx] <== noCarry[i].out[l][j][idx];
                    }
                }
            }

            fDouble[i] = SignedFp12CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, q);
            for(var l = 0; l < 6; l++){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        fDouble[i].in[l][j][idx] <== compress[i].out[l][j][idx];
                    }
                }
            }

            pDouble[i] = EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, 0, b, q);  
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    pDouble[i].in[j][idx] <== pInterMed[i+1][j][idx]; 
                }
            }
            
            if(BITS[i] == 0){
                for(var l = 0; l < 6; l++){
                    for(var j = 0; j < 2; j++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            f[i][l][j][idx] <== fDouble[i].out[l][j][idx]; 
                        }
                    }
                }
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pInterMed[i][j][idx] <== pDouble[i].out[j][idx];
                    }
                }
            } else {
                // fAdd[CUR_ID] = fDouble * l_{pDouble[i], P}(Q) 
                fAdd[CUR_ID] = Fp12MultiplyWithLineUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, CHUNK_SIZE, Q); 
                for(var l = 0; l < 6; l++){
                    for(var j = 0; j < 2; j++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            fAdd[CUR_ID].g[l][j][idx] <== fDouble[i].out[l][j][idx];
                        }
                    }
                }
                
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        fAdd[CUR_ID].P[0][j][idx] <== pDouble[i].out[j][idx];            
                        fAdd[CUR_ID].P[1][j][idx] <== P[j][idx];    
                    }        
                }
                for(var eps = 0; eps < 2; eps++){
                    for(var l = 0; l < 6; l++){
                        for(var j = 0; j < 2; j++){
                            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                                fAdd[CUR_ID].Q[eps][l][j][idx] <== Q[eps][l][j][idx];
                            }
                        }
                    }
                }

                for(var l = 0; l < 6; l++){
                    for(var j = 0; j < 2; j++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            f[i][l][j][idx] <== fAdd[CUR_ID].out[l][j][idx]; 
                        }
                    }
                }

                // pAdd[CUR_ID] = pDouble[i] + P 
                pAdd[CUR_ID] = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, q); 
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pAdd[CUR_ID].a[j][idx] <== pDouble[i].out[j][idx];
                        pAdd[CUR_ID].b[j][idx] <== P[j][idx];
                    }
                }

                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pInterMed[i][j][idx] <== pAdd[CUR_ID].out[j][idx];
                    }
                }
                CUR_ID++;
            }
        }
    }
    for(var l = 0; l < 6; l++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[l][j][idx] <== f[0][l][j][idx];
            }
        }
    }
    
}

/*
// Input:
//  g is 6 x 4 x kg array representing element of Fp12, allowing overflow and negative
//  P, Q are as in inputs of LineFunctionEqualNoCarry
// Assume:
//  all registers of g are in [0, 2^{overflowg}) 
//  all registers of P, Q are in [0, 2^CHUNK_SIZE) 
// Output:
//  out = g * l_{P, P}(Q) as element of Fp12 with carry 
//  out is 6 x 2 x CHUNK_NUMBER
template Fp12MultiplyWithLineEqual(CHUNK_SIZE, CHUNK_NUMBER, kg, overflowg, Q){
    signal input g[6][4][kg];
    signal input P[2][CHUNK_NUMBER];
    signal input Q[2][6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    component line = LineFunctionEqualNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2); // 6 x 4 x (3k - 2) registers in [0, 2^{3n + 2log(CHUNK_NUMBER) + 2})
    for(var l = 0; l < 2; l++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        line.P[l][idx] <== P[l][idx];
    for(var l = 0; l < 2; l++)for(var i = 0; i < 6; i++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        line.Q[l][i][j][idx] <== Q[l][i][j][idx];

    var mink;
    if(kg < 3 * CHUNK_NUMBER - 2)
        mink = kg;
    else
        mink = 3 * CHUNK_NUMBER - 2;
    var logc = log_ceil(12 * (2 * CHUNK_NUMBER + kg - 2) * mink * CHUNK_NUMBER * CHUNK_NUMBER);
    assert(overflowg + 4 * CHUNK_SIZE + logc + 2 < 252);
    var log2kkg = log_ceil (2 * CHUNK_NUMBER + kg - 2);
    component mult = Fp12MultiplyNoCarryUnequal(CHUNK_SIZE, kg, 3 * CHUNK_NUMBER - 2, overflowg + 3 * CHUNK_SIZE + logc + 2 - log2kkg); // 3k + kg - 3 registers in [0, 12 * min(kg, 3k - 2) * 2^{overflowg + 3n + 2log(CHUNK_NUMBER) + 2})
    
    for(var i = 0; i < 6; i++)for(var j = 0; j<4; j++)for(var idx = 0; idx<kg; idx++)
        mult.a[i][j][idx] <== g[i][j][idx];
    for(var i = 0; i < 6; i++)for(var j = 0; j<4; j++)for(var idx = 0; idx < 3 * CHUNK_NUMBER - 2; idx++)
        mult.b[i][j][idx] <== line.out[i][j][idx];
    component reduce = Fp12Compress(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + kg - 3, Q, overflowg + 4 * CHUNK_SIZE + logc + 2); // CHUNK_NUMBER registers in [0, 12 * (2k + kg - 2) * min(kg, 3k - 2) * 2^{overflowg + 4n + 2log(CHUNK_NUMBER) + 2})
    for(var i = 0; i < 6; i++)for(var j = 0; j<4; j++)for(var idx = 0; idx < 3 * CHUNK_NUMBER + kg - 3; idx++)
        reduce.in[i][j][idx] <== mult.out[i][j][idx];

    component carry = Fp12CarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflowg + 4 * CHUNK_SIZE + logc + 2, Q);

    for(var i = 0; i < 6; i++)for(var j = 0; j<4; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        carry.in[i][j][idx] <== reduce.out[i][j][idx];

    for(var i = 0; i < 6; i++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        out[i][j][idx] <== carry.out[i][j][idx];
}
*/

/*
// version with one less carry per loop that requires 6n + ... overflow 
// doesn't actually reduce constraints for some reason
template MillerLoop2(CHUNK_SIZE, CHUNK_NUMBER, b, r, Q){
    signal input P[2][CHUNK_NUMBER]; 
    signal input Q[2][6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var rBits[513]; // length is CHUNK_NUMBER * CHUNK_SIZE
    var rBitLength;
    var rSigBits = 0;
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        for (var j = 0; j < CHUNK_SIZE; j++) {
            rBits[j + CHUNK_SIZE * i] = (r[i] >> j) & 1;
            if(rBits[j + CHUNK_SIZE * i] == 1){
                rSigBits++;
                rBitLength = j + CHUNK_SIZE * i + 1;
            }
        }
    }

    signal pInterMed[rBitLength][2][CHUNK_NUMBER]; 
    signal f[rBitLength][6][2][CHUNK_NUMBER];

    component pDouble[rBitLength];
    component pAdd[rSigBits];
    component fDouble[rBitLength];
    component square[rBitLength];
    component fAdd[rSigBits]; 
    var CUR_ID = 0;

    var LOGK = log_ceil(CHUNK_NUMBER);
    assert(6*CHUNK_SIZE + LOGK + 6 + log_ceil(12 * (4 * CHUNK_NUMBER-3) * (2 * CHUNK_NUMBER - 1) * CHUNK_NUMBER * CHUNK_NUMBER) < 252);
    
    for(var i=rBitLength - 1; i >= 0; i--){
        if(i == rBitLength - 1){
            // f = 1 
            for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                if(l == 0 && j == 0 && idx == 0)
                    f[i][l][j][idx] <== 1;
                else
                    f[i][l][j][idx] <== 0;
            }
            for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                pInterMed[i][j][idx] <== P[j][idx];
        } else {
            // compute fDouble[i] = f[i+1]^2 * l_{pInterMed[i+1], pInterMed[i+1]}(Q) 
            square[i] = Fp12MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK + 4); // 2k - 1 registers in [0, 12 * CHUNK_NUMBER * 2^{2n})
            for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                square[i].a[l][j][idx] <== f[i+1][l][j][idx];
                square[i].a[l][j+2][idx] <== 0;
                square[i].b[l][j][idx] <== f[i+1][l][j][idx];
                square[i].b[l][j+2][idx] <== 0;
            }

            fDouble[i] = Fp12MultiplyWithLineEqual(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, 2 * CHUNK_SIZE + LOGK + 4, Q);
            // assert (6n + log(CHUNK_NUMBER) + 6 + log(12 * (4k-3) * (2k - 1) * CHUNK_NUMBER * CHUNK_NUMBER)) < 252
            for(var l = 0; l < 6; l++)for(var j = 0; j<4; j++)for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++)
                fDouble[i].g[l][j][idx] <== square[i].out[l][j][idx];
            for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                fDouble[i].P[j][idx] <== pInterMed[i+1][j][idx];            
            for(var eps = 0; eps < 2; eps++)for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                fDouble[i].Q[eps][l][j][idx] <== Q[eps][l][j][idx];

            if(i != 0 || (i == 0 && rBits[i] == 1)){
                pDouble[i] = EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, 0, b, Q);  
                for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                    pDouble[i].in[j][idx] <== pInterMed[i+1][j][idx]; 
            }
            
            if(rBits[i] == 0){
                for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                    f[i][l][j][idx] <== fDouble[i].out[l][j][idx]; 
                if(i != 0){
                    for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                        pInterMed[i][j][idx] <== pDouble[i].out[j][idx];
                }
            } else {
                // fAdd[CUR_ID] = fDouble * l_{pDouble[i], P}(Q) 
                fAdd[CUR_ID] = Fp12MultiplyWithLineUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, CHUNK_SIZE, Q); 
                for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    fAdd[CUR_ID].g[l][j][idx] <== fDouble[i].out[l][j][idx];
                    fAdd[CUR_ID].g[l][j+2][idx] <== 0;
                }
                for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    fAdd[CUR_ID].P[0][j][idx] <== pDouble[i].out[j][idx];            
                    fAdd[CUR_ID].P[1][j][idx] <== P[j][idx];            
                }
                for(var eps = 0; eps < 2; eps++)for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                    fAdd[CUR_ID].Q[eps][l][j][idx] <== Q[eps][l][j][idx];

                for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                    f[i][l][j][idx] <== fAdd[CUR_ID].out[l][j][idx]; 

                if(i != 0){
                    // pAdd[CUR_ID] = pDouble[i] + P 
                    pAdd[CUR_ID] = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, Q); 
                    for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pAdd[CUR_ID].a[j][idx] <== pDouble[i].out[j][idx];
                        pAdd[CUR_ID].b[j][idx] <== P[j][idx];
                    }

                    for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                        pInterMed[i][j][idx] <== pAdd[CUR_ID].out[j][idx];
                }
                
                CUR_ID++;
            }
        }
    }
    for(var l = 0; l < 6; l++)for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        out[l][j][idx] <== f[0][l][j][idx];
    
}
*/
