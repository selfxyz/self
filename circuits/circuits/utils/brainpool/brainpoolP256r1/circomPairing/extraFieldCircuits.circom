pragma circom 2.0.2;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "fp2.circom";
include "fp12.circom";

// Extra circuits with different approaches to field operations. 
// Kept here for reference; less efficient or specialized than the ones in field_elements.circom


// a, b are elements of Fp^L
// a[i] represents a[i][0] + a[i][1] * 2 * *CHUNK_SIZE + ... + a[i][L - 1] * 2 * *(CHUNK_SIZE*(CHUNK_NUMBER - 1))
// compute a+b in Fp^L
template FieldAdd2D(CHUNK_SIZE, CHUNK_NUMBER, L) {
    signal input a[L][CHUNK_NUMBER];
    signal input b[L][CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output c[L][CHUNK_NUMBER];

    component adders[L];
    for (var i = 0; i < L; i++) {
        adders[i] = BigAddModP(CHUNK_SIZE, CHUNK_NUMBER);
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            adders[i].a[j] <== a[i][j];
            adders[i].b[j] <== b[i][j];
            adders[i].p[j] <== p[j];
        }   
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            c[i][j] <== adders[i].out[j];
        }
    }
}

// take a polynomial expression a[0] + omega^1 a[1] + ... + omega^(2l - 2) a[2l - 2]
// reduce it to degree L - 1 using omega^L + omega^(L - 1) POLY[L - 1] + ... + POLY[0] = 0
// WARNING: can produce incorrectly handled negative coefficients. only here for reference; do not use
template PolynomialReduce(L) {
    signal input a[2 * L - 1];
    signal input POLY[L];
    signal output out[L];

    var residue[2 * L - 1];
    signal quotient[L - 1];
    for (var i = 0; i < 2 * L - 1; i++) {
        residue[i] = a[i];
    }
    for (var i = L - 2; i >= 0; i --) {
        for (var j = 0; j < L; j++) {
            residue[i + j] = residue[i + j] - residue[i + L] * POLY[j];
        }
        quotient[i] <-- residue[i + L];
        residue[i + L] = 0;
    }
    component mult = BigMultShortLong(1, L + 1);
    for (var i = 0; i < L - 1; i++) {
        mult.a[i] <== quotient[i];
        mult.b[i] <== POLY[i];
    }
    mult.a[L - 1] <== 0;
    mult.a[L] <== 0;
    mult.b[L - 1] <== POLY[L - 1];
    mult.b[L] <== 1;
    signal aOut[2 * L - 1];
    for (var i = 0; i < 2 * L - 1; i++) {
        aOut[i] <== mult.out[i];
    }
    for (var i = 0; i < L; i++ ) {
        out[i] <-- residue[i];
    }
    for (var i = 0; i < L; i++) {
        a[i] === aOut[i] + out[i];
    }
    for (var i = L; i < 2 * L - 1; i++) {
        a[i] === aOut[i];
    }
}

template Fp2PolynomialReduce(CHUNK_SIZE, CHUNK_NUMBER, p) {
    var L = 2;
    signal input a[2 * L - 1][CHUNK_NUMBER];
    var POLY[2] = [1, 0]; // x^2 + 1 = 0
    signal output out[L][CHUNK_NUMBER];

    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[1][i] <== a[1][i];
    }
    component sub = FpSubtract(CHUNK_SIZE, CHUNK_NUMBER, p);
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        sub.a[i] <== a[0][i];
        sub.b[i] <== a[2][i];
    }
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        out[0][i] <== sub.out[i];
    }
}


// very un-optimized version: 

// outputs a*b in Fp2 
// (a0 + a1 u)*(b0 + b1 u) = (a0*b0 - a1*b1) + (a0*b1 + a1*b0)u 
// out[i] has CHUNK_NUMBER registers each in [0, 2^CHUNK_SIZE)
// out[i] in [0, p)
// A similar circuit can do multiplication in different fields. 
// The only difference is that Fp2PolynomialReduce (which reduces quadratics by x^2 + 1) 
// must be replaced with a different circuit specialized to the minimal polynomial
template Fp2Multiply1(CHUNK_SIZE, CHUNK_NUMBER, p) {
    // L is always 2. POLY is always [1, 0]
    var L = 2;
    signal input a[L][CHUNK_NUMBER];
    signal input b[L][CHUNK_NUMBER];
    signal output out[L][CHUNK_NUMBER];

    component mult = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, L);
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            mult.a[i][j] <== a[i][j];
            mult.b[i][j] <== b[i][j];
        }
    } // out: 2l - 1 x 2k - 1 array of longs
    component longShorts[2 * L - 1];
    for (var i = 0; i < 2 * L - 1; i++) {
        longShorts[i] = LongToShortNoEndCarry(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1);
        for (var j = 0; j < 2 * CHUNK_NUMBER - 1; j++) {
            longShorts[i].in[j] <== mult.out[i][j];
        }
    } // out: 2l - 1 x 2k array of shorts
    component bigmods[2 * L - 1];
    for (var i = 0; i < 2 * L - 1; i++) {
        bigmods[i] = BigMod(CHUNK_SIZE, CHUNK_NUMBER);
        for (var j = 0; j < 2 * CHUNK_NUMBER; j++) {
            bigmods[i].a[j] <== longShorts[i].out[j];
        }
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            bigmods[i].b[j] <== p[j];
        }
    } // out: 2l - 1 x CHUNK_NUMBER array of shorts
    component reduce = Fp2PolynomialReduce(CHUNK_SIZE, CHUNK_NUMBER, p);
    for (var i = 0; i < 2 * L - 1; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            reduce.a[i][j] <== bigmods[i].mod[j];
        }
    } // out: L x CHUNK_NUMBER array of shorts
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            out[i][j] <== reduce.out[i][j];
        }
    } // out: L x CHUNK_NUMBER array of shorts
}


// squaring can be optimized to save 2 multiplication
// (a**2-b**2) = (a+b)(a-b) 
// (a+b u)**2 = (a+b)(a-b) + (a*b+a*b)u
template Fp2Square(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];
    
    component SUM = BigAdd(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        SUM.a[i] <== in[0][i];
        SUM.b[i] <== in[1][i];
    }
    component diff = BigSubModP(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        diff.a[i] <== in[0][i];
        diff.b[i] <== in[1][i];
        diff.p[i] <== p[i];
    }
    component prod = BigMult(CHUNK_SIZE, CHUNK_NUMBER + 1);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        prod.a[i] <== SUM.out[i];
        prod.b[i] <== diff.out[i];
    }
    prod.a[CHUNK_NUMBER] <== SUM.out[CHUNK_NUMBER];
    prod.b[CHUNK_NUMBER] <== 0;

    component prodMod = BigMod2(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 2);
    for(var i = 0; i < 2 * CHUNK_NUMBER + 2; i++){
        prodMod.a[i] <== prod.out[i];
        if(i < CHUNK_NUMBER){
            prodMod.b[i] <== p[i];
        }
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] <== prodMod.mod[i];
    }
    
    component aB = BigMult(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        aB.a[i] <== in[0][i];
        aB.b[i] <== in[1][i];
    }
    component twoAB = BigAdd(CHUNK_SIZE, 2 * CHUNK_NUMBER); 
    for(var i = 0; i < 2 * CHUNK_NUMBER; i++){
        twoAB.a[i] <== aB.out[i];
        twoAB.b[i] <== aB.out[i];
    }
    component twoABMod = BigMod2(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 1);
    for(var i = 0; i < 2 * CHUNK_NUMBER + 1; i++){
        twoABMod.a[i] <== twoAB.out[i];
        if(i < CHUNK_NUMBER){
            twoABMod.b[i] <== p[i];
        }
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[1][i] <== twoABMod.mod[i];
    }
}

// a[2][CHUNK_NUMBER] all registers in [0, 2 * *CHUNK_SIZE)
// b[2][CHUNK_NUMBER] all registers in [0, 2 * *CHUNK_SIZE)
// p[CHUNK_NUMBER]
// consider a,b as elements of Fp2 
// out[2][2][CHUNK_NUMBER] solving
//      a0*b0 + (p-a1)*b1 = p * out[0][0] + out[0][1] with out[0][1] in [0,p) 
//      a0*b1 + a1*b0 = p * out[1][0] + out[1][1] with out[1][1] in [0,p) 
// out[i][0] has CHUNK_NUMBER + 2 registers in short BigInt format [0, 2 * *CHUNK_SIZE)
// out[i][1] has CHUNK_NUMBER registers in short BigInt format
// a * b = out[0][1] + out[1][1] * u in Fp2 
function Fp2prod(CHUNK_SIZE, CHUNK_NUMBER, a, b, p){
    var out[2][2][20];
    // solve for x and Y such that a0*b0 + (p-a1)*b1 = p*x + Y with Y in [0,p) 
    // -a1*b1 = (p-a1)*b1 mod p
    var A0B0_VAR[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, a[0], b[0]);
    var A1_NEG[20] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, a[1]); 
    var A1B1_NEG[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, A1_NEG, b[1]);
    var diff[20] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, A0B0_VAR, A1B1_NEG); // 2 * CHUNK_NUMBER + 1 registers
    out[0] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER + 1, diff, p); 
    // x = out[0][0] has CHUNK_NUMBER + 2 registers, Y = out[0][1] has CHUNK_NUMBER registers 
    
    // solve for x and Y such that a0*b1 + a1*b0 = p*x + Y with Y in [0,p) 
    var A0B1_VAR[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, a[0], b[1]);
    var A1B0_VAR[20] = prod(CHUNK_SIZE, CHUNK_NUMBER, a[1], b[0]);
    var SUM[20] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, A0B1_VAR, A1B0_VAR); // output 2 * CHUNK_NUMBER + 1 registers
    out[1] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER + 1, SUM, p); 
    // x = out[1][0] has CHUNK_NUMBER + 2 registers, Y = out[1][1] has CHUNK_NUMBER registers 

    return out;
}

// output (a0 + a1 u)*(b0 + b1 u) = (a0*b0 + (p-a1)*b1) + (a0*b1 + a1*b0)u 
//      where no carries are performed 
// out[0], out[1] have 2 * CHUNK_NUMBER - 1 registers 
// out[0][i] in (-(CHUNK_NUMBER + 1)*2^{2n}, (CHUNK_NUMBER + 1)*2^{2n + 1})
// out[1][i] in [0, (CHUNK_NUMBER + 1)*2^{2n + 1}) 
template Fp2multiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[2][2 * CHUNK_NUMBER - 1];
    
    component a0b0 = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER);
    component a1b1 = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER);
    component pb1 =  BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER); 
    component a0b1 = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER); 
    component a1b0 = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER);
    
    for(var i = 0; i < CHUNK_NUMBER; i++){
        a0b0.a[i] <== a[0][i];
        a0b0.b[i] <== b[0][i];

        a1b1.a[i] <== a[1][i];
        a1b1.b[i] <== b[1][i];

        pb1.a[i] <== p[i];
        pb1.b[i] <== b[1][i];

        a0b1.a[i] <== a[0][i];
        a0b1.b[i] <== b[1][i];

        a1b0.a[i] <== a[1][i];
        a1b0.b[i] <== b[0][i];
    }
 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        out[0][i] <== a0b0.out[i] + pb1.out[i] - a1b1.out[i];
        out[1][i] <== a0b1.out[i] + a1b0.out[i];
    }
}

// multiplication specialized to Fp^2 
// (a0 + a1 u)*(b0 + b1 u) = (a0*b0 - a1*b1) + (a0*b1 + a1*b0)u
template Fp2multiply(CHUNK_SIZE, CHUNK_NUMBER){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal input p[CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    assert(2 * CHUNK_SIZE + 1 + LOGK < 254);

    var X_VAR[2][2][20] = Fp2prod(CHUNK_SIZE, CHUNK_NUMBER, a, b, p); 
    component rangeChecks[2][CHUNK_NUMBER];
    component lT[2];
    signal x[2][CHUNK_NUMBER + 2]; 
    component xRangeChecks[2][CHUNK_NUMBER + 2];
    
    for(var eps = 0; eps < 2; eps++){
        lT[eps] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for(var i = 0; i < CHUNK_NUMBER; i++){
            out[eps][i] <-- X_VAR[eps][1][i];
            rangeChecks[eps][i] = Num2Bits(CHUNK_SIZE);
            rangeChecks[eps][i].in <== out[eps][i];
            
            lT[eps].a[i] <== out[eps][i];
            lT[eps].b[i] <== p[i];
        }
        lT[eps].out === 1;
        
        for(var i = 0; i < CHUNK_NUMBER + 2; i++){
            x[eps][i] <-- X_VAR[eps][0][i];
            xRangeChecks[eps][i] = Num2Bits(CHUNK_SIZE);
            xRangeChecks[eps][i].in <== x[eps][i];
        }
        
    }

    
    // out[0] constraint: x = x[0], Y = out[0] 
    // constrain by Carry(a0 *' b0 +' p *' b1 -' a1 *' b1 - p *' x - Y ) = 0 
    // where all operations are performed without CARRY 
    // each register is an overflow representation in the range (-CHUNK_NUMBER*2^{2n + 1} - 2^CHUNK_SIZE, CHUNK_NUMBER*2^{2n + 1} )
    //                                          which is inside (- 2^{2n + 1+LOGK}, 2^{2n + 1+LOGK})

    // out[1] constraint: x = x[1], Y = out[1]
    // constrain by Carry(a0 *' b1 +' a1 *' b0 -' p *' x - Y) = 0 
    // each register is an overflow representation in the range (-CHUNK_NUMBER*2^{2n} - 2^CHUNK_SIZE, CHUNK_NUMBER*2^{2n + 1} )
    //                                          which is inside (- 2^{2n + 1+LOGK}, 2^{2n + 1+LOGK})
    
    component aB = Fp2multiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER); 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        aB.p[i] <== p[i];
        aB.a[0][i] <== a[0][i];
        aB.a[1][i] <== a[1][i];
        aB.b[0][i] <== b[0][i];
        aB.b[1][i] <== b[1][i];
    }
    component pX[2];
    component carryCheck[2];
    for(var eps = 0; eps < 2; eps++){
        pX[eps] = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER + 2); // 2 * CHUNK_NUMBER + 3 registers
        for(var i = 0; i < CHUNK_NUMBER; i++){
            pX[eps].a[i] <== p[i];
            pX[eps].b[i] <== x[eps][i];
        }
        for(var i = CHUNK_NUMBER; i < CHUNK_NUMBER + 2; i++){
            pX[eps].a[i] <== 0;
            pX[eps].b[i] <== x[eps][i];
        }

        carryCheck[eps] = CheckCarryToZero(CHUNK_SIZE, 2 * CHUNK_SIZE + 2 + LOGK, 2 * CHUNK_NUMBER + 3); 
        for(var i = 0; i < CHUNK_NUMBER; i++)
            carryCheck[eps].in[i] <== aB.out[eps][i] - pX[eps].out[i] - out[eps][i]; 
        for(var i = CHUNK_NUMBER; i < 2 * CHUNK_NUMBER - 1; i++)
            carryCheck[eps].in[i] <== aB.out[eps][i] - pX[eps].out[i]; 
        for(var i = 2 * CHUNK_NUMBER - 1; i < 2 * CHUNK_NUMBER + 3; i++)
            carryCheck[eps].in[i] <== -pX[eps].out[i];
    }

}


// adapted from BigMultShortLong2D and LongToShortNoEndCarry2 witness computation
function prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a, b, c) {
    // first compute the intermediate values. taken from BigMulShortLong
    var PROD_VAL[20][20]; // length is 3l - 2 by 3k - 2
    for (var i = 0; i < 3 * CHUNK_NUMBER; i++) {
        for (var j = 0; j < 3 * L; j++) {
            PROD_VAL[j][i] = 0;
        }
    }
    for (var i1 = 0; i1 < CHUNK_NUMBER; i1++) {
        for (var i2 = 0; i2 < CHUNK_NUMBER; i2++) {
            for (var i3 = 0; i3 < CHUNK_NUMBER; i3++) {
                for (var j1 = 0; j1 < L; j1++) {
                    for (var j2 = 0; j2 < L; j2++) {
                        for (var j3 = 0; j3 < L; j3++) {
                            PROD_VAL[j1 + j2 + j3][i1 + i2 + i3] = PROD_VAL[j1 + j2 + j3][i1 + i2 + i3] + a[j1][i1] * b[j2][i2] * c[j3][i3];
                        }
                    }
                }
            }
        }
    }

    // now do a bunch of carrying to make sure registers not overflowed. taken from LongToShortNoEndCarry2
    var out[20][20]; // length is 3 * L by 3 * CHUNK_NUMBER

    var SPLIT[20][20][3]; // second dimension has length 3 * CHUNK_NUMBER - 1
    for (var j = 0; j < 3 * L - 1; j++) {
        for (var i = 0; i < 3 * CHUNK_NUMBER - 1; i++) {
            SPLIT[j][i] = SplitThreeFn(PROD_VAL[j][i], CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
        }
    }

    var CARRY[20][20]; // length is 3l - 1 x 3k
    var SUM_AND_CARRY[20][2];
    for (var j = 0; j < 3 * L - 1; j++) {
        CARRY[j][0] = 0;
        out[j][0] = SPLIT[j][0][0];
        if (3 * CHUNK_NUMBER - 1 > 1) {
            SUM_AND_CARRY[j] = SplitFn(SPLIT[j][0][1] + SPLIT[j][1][0], CHUNK_SIZE, CHUNK_SIZE);
            out[j][1] = SUM_AND_CARRY[j][0];
            CARRY[j][1] = SUM_AND_CARRY[j][1];
        }
        if (3 * CHUNK_NUMBER - 1 > 2) {
            for (var i = 2; i < 3 * CHUNK_NUMBER - 1; i++) {
                SUM_AND_CARRY[j] = SplitFn(SPLIT[j][i][0] + SPLIT[j][i - 1][1] + SPLIT[j][i - 2][2] + CARRY[j][i - 1], CHUNK_SIZE, CHUNK_SIZE);
                out[j][i] = SUM_AND_CARRY[j][0];
                CARRY[j][i] = SUM_AND_CARRY[j][1];
            }
            out[j][3 * CHUNK_NUMBER - 1] = SPLIT[j][3 * CHUNK_NUMBER - 2][1] + SPLIT[j][3 * CHUNK_NUMBER-3][2] + CARRY[j][3 * CHUNK_NUMBER - 2];
        }
    }

    return out;
}


// a = SUM w^i u^j a_ij for w^6=u + 1, u^2= - 1. similarly for b, c
// we first write a = A + B u, b = C + D u, c = E + F u and compute 
// abc = (ACE - BDE - ADF - BCF) + (ADE + BCE + ACF - BCF) u, and then simplify the representation
// assumes CHUNK_SIZE, CHUNK_NUMBER are chosen so that cubic carries are OK
template Fp12MultiplyThree(CHUNK_SIZE, CHUNK_NUMBER, p) {
    var L = 6;
    signal input a[L][2][CHUNK_NUMBER];
    signal input b[L][2][CHUNK_NUMBER];
    signal input c[L][2][CHUNK_NUMBER];
    signal output out[L][2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGL = 4;
    assert(L < 15);
    assert(CHUNK_NUMBER < 7);
    assert(2 * CHUNK_SIZE + 1 + LOGK + LOGL  < 254);

    var a0[L][CHUNK_NUMBER];
    var a1[L][CHUNK_NUMBER];
    var b0[L][CHUNK_NUMBER];
    var b1[L][CHUNK_NUMBER];
    var c0[L][CHUNK_NUMBER];
    var c1[L][CHUNK_NUMBER];
    var NEG_A0[L][20];
    var NEG_A1[L][20];
    for (var i = 0; i < L; i++) { 
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            a0[i][j] = a[i][0][j];
            a1[i][j] = a[i][1][j];
            b0[i][j] = b[i][0][j];
            b1[i][j] = b[i][1][j];
            c0[i][j] = c[i][0][j];
            c1[i][j] = c[i][1][j];
        }
    }
    for (var i = 0; i < L; i++) {
        NEG_A0[i] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, a0[i]);
        NEG_A1[i] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, a1[i]);
    }

    var REAL_INIT[3 * L - 1][20];
    var IMAG_INIT[3 * L - 1][20];
    var IMAG_INIT_NEG[3 * L - 1][20];
    // each product will be 3l - 1 x 3k
    var A0B0C0_VAR[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a0, b0, c0);
    var A1B1C0_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A1, b1, c0);
    var A1B0C1_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A1, b0, c1);
    var A0B1C1_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A0, b1, c1);

    var A1B0C0_VAR[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a1, b0, c0);
    var A0B1C0_VAR[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a0, b1, c0);
    var A0B0C1_VAR[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a0, b0, c1);
    var A1B1C1_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A0, b1, c1);

    var A1B0C0_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A1, b0, c0);
    var A0B1C0_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A0, b1, c0);
    var A0B0C1_NEG[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, NEG_A0, b0, c1);
    var A1B1C1_VAR[20][20] = prod3D(CHUNK_SIZE, CHUNK_NUMBER, L, a0, b1, c1);

    for (var i = 0; i < 3 * L - 1; i++) { // compute initial rep (deg w = 10)
        REAL_INIT[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER, A0B0C0_VAR[i], A1B1C0_NEG[i], A1B0C1_NEG[i], A0B1C1_NEG[i]); // 3 * CHUNK_NUMBER + 1 registers each
        IMAG_INIT[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER, A1B0C0_VAR[i], A0B1C0_VAR[i], A0B0C1_VAR[i], A1B1C1_NEG[i]);
	    IMAG_INIT_NEG[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER, A1B0C0_NEG[i], A0B1C0_NEG[i], A0B0C1_NEG[i], A1B1C1_VAR[i]);
    }

    // carries using w^6 = u + 1, w^12 = 2 u
    var REAL_CARRY[L][20];
    var IMAG_CARRY[L][20];
    var REAL_FINAL[L][20];
    var IMAG_FINAL[L][20];
    var ZEROS[20]; // to balance register sizes
    for (var i = 0; i < 20; i++) {
        ZEROS[i] = 0;
    }
    for (var i = 0; i < L; i++) {
        if (i == L - 1) {
            REAL_CARRY[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER + 1, ZEROS, ZEROS, REAL_INIT[i + L], IMAG_INIT_NEG[i + L]);
            IMAG_CARRY[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER + 1, ZEROS, ZEROS, REAL_INIT[i + L], IMAG_INIT[i + L]);
        } else {
            REAL_CARRY[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER + 1, REAL_INIT[i + L], IMAG_INIT_NEG[i + L], IMAG_INIT_NEG[i + 2 * L], IMAG_INIT_NEG[i + 2 * L]); // now 3 * CHUNK_NUMBER + 2 registers
            IMAG_CARRY[i] = long_add4(CHUNK_SIZE, 3 * CHUNK_NUMBER + 1, IMAG_INIT[i + L], REAL_INIT[i + L], REAL_INIT[i + 2 * L], REAL_INIT[i + 2 * L]);
        }
    }    
    for (var i = 0; i < L; i++) {
        REAL_FINAL[i] = long_add_unequal(CHUNK_SIZE, 3 * CHUNK_NUMBER + 2, 3 * CHUNK_NUMBER + 1, REAL_CARRY[i], REAL_INIT[i]); // now 3 * CHUNK_NUMBER + 3 registers
        IMAG_FINAL[i] = long_add_unequal(CHUNK_SIZE, 3 * CHUNK_NUMBER + 2, 3 * CHUNK_NUMBER + 1, IMAG_CARRY[i], IMAG_INIT[i]);
    }

    // reduction mod p
    var PROD_REAL_TEMP[L][2][20];
    var PROD_IMAG_TEMP[L][2][20];

    // PROD_REAL[*][0][2 * CHUNK_NUMBER + 4] * p + PROD_REAL[*][1][CHUNK_NUMBER] = REAL_FINAL[*]
    // PROD_IMAG[*][0][2 * CHUNK_NUMBER + 4] * p + PROD_IMAG[*][1][CHUNK_NUMBER] = IMAG_FINAL[*]
    signal PROD_REAL[L][2][2 * CHUNK_NUMBER + 4];
    signal PROD_IMAG[L][2][2 * CHUNK_NUMBER + 4];
    for (var i = 0; i < L; i++) {
        PROD_REAL_TEMP[i] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 3, REAL_FINAL[i], p); // 2 * CHUNK_NUMBER + 4 register quotient, CHUNK_NUMBER register remainder
        PROD_IMAG_TEMP[i] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 3, IMAG_FINAL[i], p);
    }
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < 2 * CHUNK_NUMBER + 4; j++) {
            PROD_REAL[i][0][j] <-- PROD_REAL_TEMP[i][0][j];
            PROD_IMAG[i][0][j] <-- PROD_IMAG_TEMP[i][0][j];
            if (j < CHUNK_NUMBER) {
                PROD_REAL[i][1][j] <-- PROD_REAL_TEMP[i][1][j];
                PROD_IMAG[i][1][j] <-- PROD_IMAG_TEMP[i][1][j];
            } else {
                PROD_REAL[i][1][j] <== 0;
                PROD_IMAG[i][1][j] <== 0;
            }
        }
    }
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            out[i][0][j] <== PROD_REAL[i][1][j];
            out[i][1][j] <== PROD_IMAG[i][1][j];
        }
    }

    component outRangeChecks[L][2][CHUNK_NUMBER];
    for(var i = 0; i < L; i++){
        for (var j = 0; j < 2; j++) {
            for (var m = 0; m < CHUNK_NUMBER; m++) {
                outRangeChecks[i][j][m] = Num2Bits(CHUNK_SIZE);
                outRangeChecks[i][j][m].in <== out[i][j][m];
            }
        }
    }
    component lT[L][2];
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < 2; j++) {
            lT[i][j] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
            for (var m = 0; m < CHUNK_NUMBER; m++) {
                lT[i][j].a[m] <== out[i][j][m];
                lT[i][j].b[m] <== p[m];
            }
            lT[i][j].out === 1;
        }
    }

    component divRangeChecks[L][2][2 * CHUNK_NUMBER + 4];
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < 2 * CHUNK_NUMBER + 4; j++) {
            divRangeChecks[i][0][j] = Num2Bits(CHUNK_SIZE);
            divRangeChecks[i][1][j] = Num2Bits(CHUNK_SIZE);
            divRangeChecks[i][0][j].in <== PROD_REAL[i][0][j];
            divRangeChecks[i][1][j].in <== PROD_IMAG[i][0][j];
        }
    }

    // constrain by:
    // x = a0 *' b0 *' c0 +' (p -' a1) *' b1 *' c0 +' (p -' a1) *' b0 *' c1 +' (p -' a0) *' b1 *' c1
    // Y = a1 *' b0 *' c0 +' a0 *' b1 *' c0 +' a0 *' b0 *' c1 +' (p -' a1) *' b1 *' c1
    // Carry(X_0 +' X_1 -' Y_1 -' Y_2 -' Y_2 -' p *' PROD_REAL[0] -' PROD_REAL[1] ) = 0
    // Carry(Y_0 +' X_1 +' Y_1 +' X_2 +' X_2 -' p *' PROD_IMAG[0] -' PROD_IMAG[1] ) = 0
    // where all operations are performed without CARRY 
    // X_0 is the coeffs of w^0, ..., w^5
    // X_1 is the coeffs of w^6, ..., w^11
    // X_2 is the coeffs of w^12, ..., w^17
    // each register is an overflow representation in the range (-kl*2^{3n+4}, kl*2^{3n + 4} )    
    component b0c0 = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, L);
    component b0c1 = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, L);
    component b1c0 = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, L);
    component b1c1 = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, L);
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            b0c0.a[i][j] <== b[i][0][j];
            b0c0.b[i][j] <== c[i][0][j];
            b0c1.a[i][j] <== b[i][0][j];
            b0c1.b[i][j] <== c[i][1][j];
            b1c0.a[i][j] <== b[i][1][j];
            b1c0.b[i][j] <== c[i][0][j];
            b1c1.a[i][j] <== b[i][1][j];
            b1c1.b[i][j] <== c[i][1][j];
	    }
    }
    
    component a0b0c0 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a1b0c0 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a0b0c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a1b0c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a0b1c0 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a1b1c0 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a0b1c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component a1b1c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);

    component pb0c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component pb1c0 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    component pb1c1 = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, L, 2 * L - 1);
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            a0b0c0.a[i][j] <== a[i][0][j];
            a0b0c1.a[i][j] <== a[i][0][j];
            a0b1c0.a[i][j] <== a[i][0][j];
            a0b1c1.a[i][j] <== a[i][0][j];
            a1b0c0.a[i][j] <== a[i][1][j];
            a1b0c1.a[i][j] <== a[i][1][j];
            a1b1c0.a[i][j] <== a[i][1][j];
            a1b1c1.a[i][j] <== a[i][1][j];

            pb0c1.a[i][j] <== p[j];
            pb1c0.a[i][j] <== p[j];
            pb1c1.a[i][j] <== p[j];
	    }
    }
    for (var i = 0; i < 2 * L - 1; i++) {
        for (var j = 0; j < 2 * CHUNK_NUMBER - 1; j++) {
            a0b0c0.b[i][j] <== b0c0.out[i][j];
            a1b0c0.b[i][j] <== b0c0.out[i][j];
            a0b0c1.b[i][j] <== b0c1.out[i][j];
            a1b0c1.b[i][j] <== b0c1.out[i][j];
            a0b1c0.b[i][j] <== b1c0.out[i][j];
            a1b1c0.b[i][j] <== b1c0.out[i][j];
            a0b1c1.b[i][j] <== b1c1.out[i][j];
            a1b1c1.b[i][j] <== b1c1.out[i][j];

            pb0c1.b[i][j] <== b0c1.out[i][j];
            pb1c0.b[i][j] <== b1c0.out[i][j];
            pb1c1.b[i][j] <== b1c1.out[i][j];
        }
    }
    
    component pProdReal0[L];
    component pProdImag0[L];
    for (var i = 0; i < L; i++) {
        pProdReal0[i] = BigMultShortLongUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 4);
        pProdImag0[i] = BigMultShortLongUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER + 4);

        for (var j = 0; j < CHUNK_NUMBER; j++) {
            pProdReal0[i].a[j] <== p[j];
            pProdImag0[i].a[j] <== p[j];
        }
        for (var j = 0; j < 2 * CHUNK_NUMBER + 4; j++) {
            pProdReal0[i].b[j] <== PROD_REAL[i][0][j];
            pProdImag0[i].b[j] <== PROD_IMAG[i][0][j];
        }
    }    

    var X0[L][3 * CHUNK_NUMBER - 2];
    var X1[L][3 * CHUNK_NUMBER - 2];
    var X2[L][3 * CHUNK_NUMBER - 2];
    var Y0[L][3 * CHUNK_NUMBER - 2];
    var Y1[L][3 * CHUNK_NUMBER - 2];
    var Y2[L][3 * CHUNK_NUMBER - 2];
    for (var i = 0; i < L; i++) {
        for (var j = 0; j < 3 * CHUNK_NUMBER - 2; j++) {
            X0[i][j] = a0b0c0.out[i][j] + pb1c0.out[i][j] - a1b1c0.out[i][j] + pb0c1.out[i][j] - a1b0c1.out[i][j] + pb1c1.out[i][j] - a0b1c1.out[i][j];
            X1[i][j] = a0b0c0.out[i + L][j] + pb1c0.out[i + L][j] - a1b1c0.out[i + L][j] + pb0c1.out[i + L][j] - a1b0c1.out[i + L][j] + pb1c1.out[i + L][j] - a0b1c1.out[i + L][j];
            Y0[i][j] = a1b0c0.out[i][j] + a0b1c0.out[i][j] + a0b0c1.out[i][j] + pb1c1.out[i][j] - a1b1c1.out[i][j];
            Y1[i][j] = a1b0c0.out[i + L][j] + a0b1c0.out[i + L][j] + a0b0c1.out[i + L][j] + pb1c1.out[i + L][j] - a1b1c1.out[i + L][j];
            if (i < L - 2) {
                X2[i][j] = a0b0c0.out[i + 2 * L][j] + pb1c0.out[i + 2 * L][j] - a1b1c0.out[i + 2 * L][j] + pb0c1.out[i + 2 * L][j] - a1b0c1.out[i + 2 * L][j] + pb1c1.out[i + 2 * L][j] - a0b1c1.out[i + 2 * L][j];	    
                Y2[i][j] = a1b0c0.out[i + 2 * L][j] + a0b1c0.out[i + 2 * L][j] + a0b0c1.out[i + 2 * L][j] + pb1c1.out[i + 2 * L][j] - a1b1c1.out[i + 2 * L][j];
            } else {
                X2[i][j] = 0;
                Y2[i][j] = 0;
            }    
	}
    }
    
    component carryCheck[L][2];
    for (var i = 0; i < L; i++) {
        if (3 * CHUNK_NUMBER - 2 < 2 * CHUNK_NUMBER + 4) {
                carryCheck[i][0] = CheckCarryToZero(CHUNK_SIZE, 3 * CHUNK_SIZE + 4 + LOGK + LOGL, 2 * CHUNK_NUMBER + 4);
                carryCheck[i][1] = CheckCarryToZero(CHUNK_SIZE, 3 * CHUNK_SIZE + 4 + LOGK + LOGL, 2 * CHUNK_NUMBER + 4);
        } else {
                carryCheck[i][0] = CheckCarryToZero(CHUNK_SIZE, 3 * CHUNK_SIZE + 4 + LOGK + LOGL, 3 * CHUNK_NUMBER - 2);
                carryCheck[i][1] = CheckCarryToZero(CHUNK_SIZE, 3 * CHUNK_SIZE + 4 + LOGK + LOGL, 3 * CHUNK_NUMBER - 2);
        }
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            carryCheck[i][0].in[j] <== X0[i][j] + X1[i][j] - Y1[i][j] - Y2[i][j] - Y2[i][j] - pProdReal0[i].out[j] - PROD_REAL[i][1][j];
	        carryCheck[i][1].in[j] <== Y0[i][j] + X1[i][j] + Y1[i][j] + X2[i][j] + X2[i][j] - pProdImag0[i].out[j] - PROD_IMAG[i][1][j];
        }
	if (3 * CHUNK_NUMBER - 2 < 2 * CHUNK_NUMBER + 4) {
            for (var j = CHUNK_NUMBER; j < 3 * CHUNK_NUMBER - 2; j++) {
                carryCheck[i][0].in[j] <== X0[i][j] + X1[i][j] - Y1[i][j] - Y2[i][j] - Y2[i][j] - pProdReal0[i].out[j] - PROD_REAL[i][1][j];
                carryCheck[i][1].in[j] <== Y0[i][j] + X1[i][j] + Y1[i][j] + X2[i][j] + X2[i][j] - pProdImag0[i].out[j] - PROD_IMAG[i][1][j];
            }
            for (var j = 3 * CHUNK_NUMBER - 2; j < 2 * CHUNK_NUMBER + 4; j++) {
                carryCheck[i][0].in[j] <== - PROD_REAL[i][1][j];
                carryCheck[i][1].in[j] <== - PROD_IMAG[i][1][j];
            }
        } else {
            for (var j = CHUNK_NUMBER; j < 2 * CHUNK_NUMBER + 4; j++) {
                    carryCheck[i][0].in[j] <== X0[i][j] + X1[i][j] - Y1[i][j] - Y2[i][j] - Y2[i][j] - pProdReal0[i].out[j] - PROD_REAL[i][1][j];
                    carryCheck[i][1].in[j] <== Y0[i][j] + X1[i][j] + Y1[i][j] + X2[i][j] + X2[i][j] - pProdImag0[i].out[j] - PROD_IMAG[i][1][j];
                }
                for (var j = 2 * CHUNK_NUMBER + 4; j < 3 * CHUNK_NUMBER - 2; j++) {
                    carryCheck[i][0].in[j] <== X0[i][j] + X1[i][j] - Y1[i][j] - Y2[i][j] - Y2[i][j] - pProdReal0[i].out[j];
                    carryCheck[i][1].in[j] <== Y0[i][j] + X1[i][j] + Y1[i][j] + X2[i][j] + X2[i][j] - pProdImag0[i].out[j];
	            }
	    }
    }
}

