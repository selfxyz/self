pragma circom 2.0.3;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "fieldElementsFunc.circom";
include "fp.circom";

// add two elements in Fp2
template Fp2Add(CHUNK_SIZE, CHUNK_NUMBER, p) {
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    component adders[2];
    for (var i = 0; i < 2; i++) {
        adders[i] = FpAdd(CHUNK_SIZE, CHUNK_NUMBER, p);
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            adders[i].a[j] <== a[i][j];
            adders[i].b[j] <== b[i][j];
        }   
        for (var j = 0; j < CHUNK_NUMBER; j ++) {
            out[i][j] <== adders[i].out[j];
        }
    }
}


/*
p has CHUNK_NUMBER registers 
Inputs: 
    - a[2][ka] allow signed overflow
    - b[2][kb] 
Outputs:
    - out[2][ka + kb - 1] such that 
        (a0 + a1 u)*(b0 + b1 u) = out[0] + out[1] u  
Notes:
    - if each a[i][j], b[i][j] has abs value < B then out[i][j] has abs val < 2 * CHUNK_NUMBER*B^2 
    - out[i] has ka + kb - 1 registers since that's output of BigMultShortLong
M_OUT is the expected max number of bits in the output registers
*/
template SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, ka, kb, M_OUT){
    signal input a[2][ka];
    signal input b[2][kb];
    signal output out[2][ka + kb - 1];

    component ab[2][2];
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            ab[i][j] = BigMultShortLongUnequal(CHUNK_SIZE, ka, kb, M_OUT); // output has ka + kb - 1 registers
            for(var l = 0; l < ka; l++){
                ab[i][j].a[l] <== a[i][l];
            }
            for(var l = 0; l < kb; l++){
                ab[i][j].b[l] <== b[j][l];
            }
        }
    }
    
    for(var j = 0; j < ka + kb - 1; j++){
        out[0][j] <== ab[0][0].out[j] - ab[1][1].out[j];
        out[1][j] <== ab[0][1].out[j] + ab[1][0].out[j];
    }
}

template SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, M_OUT){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out[2][2 * CHUNK_NUMBER - 1];

    component mult = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, M_OUT);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            mult.a[i][j] <== a[i][j];
            mult.b[i][j] <== b[i][j];
        }
    }
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
           out[i][j] <== mult.out[i][j];
        }
    }
}

// input is 2 x (CHUNK_NUMBER+m) with registers in (-B,B)
//  in[0] + in[1] u
// output is congruent to input (mod p) and represented as 2 x CHUNK_NUMBER where registers have abs val < (m + 1)*2^CHUNK_SIZE*B
// M_OUT is the expected max number of bits in the output registers
template Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, m, p, M_OUT){
    signal input in[2][CHUNK_NUMBER+m]; 
    signal output out[2][CHUNK_NUMBER];
    
    component c[2];
    for(var i = 0; i < 2; i++){
        c[i] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, m, p, M_OUT);
        for(var j = 0; j < CHUNK_NUMBER+m; j++)
            c[i].in[j] <== in[i][j]; 
    }
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[i][j] <== c[i].out[j];
        }
    }
}
// same input as above
// outputs:
//  out[2][CHUNK_NUMBER] such that 
//      out[i] has CHUNK_NUMBER registers because we use the "prime trick" to compress from 2 * CHUNK_NUMBER - 1 to CHUNK_NUMBER registers 
//      if each a[i][j] is in (-B, B) then out[i][j] has abs val < 2k^2 * 2^CHUNK_SIZE*B^2 
//          2k*B^2 from SignedFp2MultiplyNoCarry
//          *CHUNK_NUMBER*2^CHUNK_SIZE from prime trick
// m_in is the expected max number of bits in the input registers (necessary for some intermediate overflow validation)
// M_OUT is the expected max number of bits in the output registers
template SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, p, m_in, M_OUT){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];
    
    var LOGK1 = log_ceil(2 * CHUNK_NUMBER);
    component ab = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * m_in + LOGK1);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            ab.a[i][idx] <== a[i][idx];
            ab.b[i][idx] <== b[i][idx]; 
        }
    }
    
    var LOGK2 = log_ceil(2 * CHUNK_NUMBER*CHUNK_NUMBER);
    component compress = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 2 * m_in + CHUNK_SIZE + LOGK2);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            compress.in[i][j] <== ab.out[i][j]; 
        }
    }
 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[i][j] <== compress.out[i][j];
        }
    }
}


template SignedFp2MultiplyNoCarryCompressThree(CHUNK_SIZE, CHUNK_NUMBER, p, m_in, M_OUT){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal input c[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];
    
    var LOGK = log_ceil(CHUNK_NUMBER);
    component ab = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * m_in + LOGK + 1);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            ab.a[i][idx] <== a[i][idx];
            ab.b[i][idx] <== b[i][idx]; 
        }
    }
    
    component abc = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * m_in + 2 * LOGK + 2);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
            abc.a[i][idx] <== ab.out[i][idx];
        }
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            abc.b[i][idx] <== c[i][idx];
        }
    }
    
    component compress = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, p, 3 * m_in + CHUNK_SIZE + 3 * LOGK + 3);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 3 * CHUNK_NUMBER - 2; j++){
            compress.in[i][j] <== abc.out[i][j]; 
        }
    }
 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[i][j] <== compress.out[i][j];
        }
    }
}

// check if in[0], in[1] both have CHUNK_NUMBER registers in [0,2^CHUNK_SIZE)
// to save constraints, DO NOT CONSTRAIN in[i] < p
template RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    component rangeChecks[2][CHUNK_NUMBER];
    //component lessThan[2];
    
    for(var eps = 0; eps < 2; eps++){
        //lessThan[eps] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for(var i = 0; i < CHUNK_NUMBER; i++){
            rangeChecks[eps][i] = Num2Bits(CHUNK_SIZE);
            rangeChecks[eps][i].in <== in[eps][i];
            //lessThan[eps].a[i] <== in[eps][i];
            //lessThan[eps].b[i] <== p[i];
        }
        //lessThan[eps].out === 1;
    }
}

// solve for in = p * X + out
// X has registers lying in [ - 2^CHUNK_SIZE, 2^CHUNK_SIZE) 
// X has at most Ceil(overflow / CHUNK_SIZE) registers 
// assume in has registers in (- 2^overflow, 2^overflow) 
template SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflow, p){
    signal input in[2][CHUNK_NUMBER]; 
    var m = (overflow + CHUNK_SIZE - 1) \ CHUNK_SIZE; 
    signal output X[2][m];
    signal output out[2][CHUNK_NUMBER];

    assert(overflow < 251);

    component carry[2];
    for(var i = 0; i < 2; i++){
        carry[i] = SignedFpCarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflow, p);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            carry[i].in[idx] <== in[i][idx];
        }
        for(var idx = 0; idx<m; idx++){
            X[i][idx] <== carry[i].X[idx];
        }
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[i][idx] <== carry[i].out[idx];
        }
    }
}

// input is 2 x (CHUNK_NUMBER+m) with registers in (- 2^overflow, 2^overflow)
//  in[0] + in[1] u
// calls Fp2Compress and SignedFp2CarryModP
template SignedFp2CompressCarry(CHUNK_SIZE, CHUNK_NUMBER, m, overflow, p){
    signal input in[2][CHUNK_NUMBER+m]; 
    signal output out[2][CHUNK_NUMBER];
    
    var LOGM = log_ceil(m + 1);
    component compress = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, m, p, overflow + CHUNK_SIZE + LOGM); 
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER+m; idx++){
            compress.in[i][idx] <== in[i][idx];
        }
    }
    
    component carry = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, overflow + CHUNK_SIZE + LOGM, p);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            carry.in[i][idx] <== compress.out[i][idx];
        }
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[i][idx] <== carry.out[i][idx];
        }
    }
}

// outputs a*b in Fp2 
// (a0 + a1 u)*(b0 + b1 u) = (a0*b0 - a1*b1) + (a0*b1 + a1*b0)u 
// out[i] has CHUNK_NUMBER registers each in [0, 2^CHUNK_SIZE)
// out[i] in [0, p)
template Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var LOGK2 = log_ceil(2 * CHUNK_NUMBER*CHUNK_NUMBER);
    assert(3 * CHUNK_SIZE + LOGK2 < 251);

    component c = SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, p, CHUNK_SIZE, 3 * CHUNK_SIZE + LOGK2); 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        c.a[0][i] <== a[0][i];
        c.a[1][i] <== a[1][i];
        c.b[0][i] <== b[0][i];
        c.b[1][i] <== b[1][i];
    }
    
    component carryMod = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, p); 
    for(var i = 0; i < 2; i++)for(var j = 0; j < CHUNK_NUMBER; j++){
        carryMod.in[i][j] <== c.out[i][j]; 
    }
    for(var i = 0; i < 2; i++)for(var j = 0; j < CHUNK_NUMBER; j++){
        out[i][j] <== carryMod.out[i][j]; 
    }
}


template Fp2MultiplyThree(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal input c[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var LOGK3 = log_ceil(4 * CHUNK_NUMBER*CHUNK_NUMBER*(2 * CHUNK_NUMBER - 1));
    assert(4 * CHUNK_SIZE + LOGK3 < 251);

    component compress = SignedFp2MultiplyNoCarryCompressThree(CHUNK_SIZE, CHUNK_NUMBER, p, CHUNK_SIZE, 4 * CHUNK_SIZE + LOGK3); 
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            compress.a[i][idx] <== a[i][idx];
            compress.b[i][idx] <== b[i][idx];
            compress.c[i][idx] <== c[i][idx];
        }
    }
    
    component carryMod = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, p); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            carryMod.in[i][j] <== compress.out[i][j]; 
        }
    }
    
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[i][j] <== carryMod.out[i][j]; 
        }
    }
}


// input: in[0] + in[1] u
// output: (p-in[0]) + (p-in[1]) u
// assume 0 <= in < p
template Fp2Negate(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER]; 
    signal output out[2][CHUNK_NUMBER];
    
    component neg[2];
    for(var j = 0; j < 2; j++){
        neg[j] = FpNegate(CHUNK_SIZE, CHUNK_NUMBER, p);
        for(var i = 0; i < CHUNK_NUMBER; i++){
            neg[j].in[i] <== in[j][i];
        }
        for(var i = 0; i < CHUNK_NUMBER; i++){
            out[j][i] <== neg[j].out[i];
        }
    }
}

// input: a0 + a1 u, b0 + b1 u
// output: (a0-b0) + (a1-b1)u
template Fp2Subtract(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];
    
    component sub0 = FpSubtract(CHUNK_SIZE, CHUNK_NUMBER, p);
    component sub1 = FpSubtract(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        sub0.a[i] <== a[0][i];
        sub0.b[i] <== b[0][i];
        sub1.a[i] <== a[1][i];
        sub1.b[i] <== b[1][i];
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] <== sub0.out[i];
        out[1][i] <== sub1.out[i];
    }
}

// Call find_Fp2_inverse to compute inverse
// Then check out * in = 1, out is an array of shorts
template Fp2Invert(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var inverse[2][150] = find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, in, p); // 2 x 150, only 2 x CHUNK_NUMBER relevant
    for (var i = 0; i < 2; i ++) {
        for (var j = 0; j < CHUNK_NUMBER; j ++) {
            out[i][j] <-- inverse[i][j];
        }
    }

    //range checks
    component outRangeChecks[2][CHUNK_NUMBER];
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            outRangeChecks[i][j] = Num2Bits(CHUNK_SIZE);
            outRangeChecks[i][j].in <== out[i][j];
        }
    }

    component inOut = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            inOut.a[i][j] <== in[i][j];
            inOut.b[i][j] <== out[i][j];
        }
    }

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            if(i == 0 && j == 0){
                inOut.out[i][j] === 1;
            } else {
                inOut.out[i][j] === 0;
            }
        }
    }
}

// a, b are two elements of Fp2 where we use the 2 x CHUNK_NUMBER format 
// solve for out * b - a = p * X 
// assume X has at most m registers, lying in [ - 2^{CHUNK_SIZE + 1}, 2^{CHUNK_SIZE + 1})   NOTE CHUNK_SIZE + 1 not CHUNK_SIZE DIFFERENT FROM Fp2CarryModP
// out has registers in [0, 2^CHUNK_SIZE) 
template SignedFp2Divide(CHUNK_SIZE, CHUNK_NUMBER, OVERFLOW_A, OVERFLOW_B, p){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER]; 
    signal output out[2][CHUNK_NUMBER]; 
     
    var ma = OVERFLOW_A \ CHUNK_SIZE; 
    var mb = OVERFLOW_B \ CHUNK_SIZE;
    // first precompute a, b mod p as shorts 
    var A_MOD[2][150]; 
    var B_MOD[2][150]; 
    for(var eps = 0; eps < 2; eps++){
        // 2^{overflow} <= 2^{CHUNK_SIZE*ceil(overflow/CHUNK_SIZE)} 
        var temp[2][150] = get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, ma, a[eps], p);
        A_MOD[eps] = temp[1];
        temp = get_signed_Fp_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, mb, b[eps], p);
        B_MOD[eps] = temp[1];
    }

    // precompute 1/b 
    var B_INV[2][150] = find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, B_MOD, p);
    // precompute a/b
    var OUT_VAR[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A_MOD, B_INV, p);

    for(var eps = 0; eps < 2; eps++)for(var i = 0; i < CHUNK_NUMBER; i++){
        out[eps][i] <-- OUT_VAR[eps][i]; 
    }
    
    component check = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    for(var eps = 0; eps < 2; eps++)for(var i = 0; i < CHUNK_NUMBER; i++){
        check.in[eps][i] <== out[eps][i];
    }
    
    // constraint is out * b = a + p * X 
    // precompute out * b = p * X' + Y' and a = p * X'' + Y''
    //            should have Y' = Y'' so X = X' - X''
    
    var LOGK2 = log_ceil(2 * CHUNK_NUMBER*CHUNK_NUMBER);
    // out * b, registers overflow in 2 * CHUNK_NUMBER*CHUNK_NUMBER * 2^{2n + OVERFLOW_B}
    component mult = SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, p, max(CHUNK_SIZE, OVERFLOW_B), 2 * CHUNK_SIZE + OVERFLOW_B + LOGK2); 
    for(var eps = 0; eps < 2; eps++)for(var i = 0; i < CHUNK_NUMBER; i++){
        mult.a[eps][i] <== out[eps][i]; 
        mult.b[eps][i] <== b[eps][i]; 
    }
    
    var m = max(mb + CHUNK_NUMBER, ma);
    // get mult = out * b = p*X' + Y'
    var XY[2][2][150] = get_signed_Fp2_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, mult.out, p); // total value is < 2^{nk} * 2^{CHUNK_SIZE*CHUNK_NUMBER + OVERFLOW_B - CHUNK_SIZE + 1}
    // get a = p*X' + Y'
    var XY1[2][2][150] = get_signed_Fp2_carry_witness(CHUNK_SIZE, CHUNK_NUMBER, m, a, p); // same as above, m extra registers enough

    signal x[2][m];
    component xRangeChecks[2][m];
    for(var eps = 0; eps < 2; eps++){    
        for(var i = 0; i<m; i++){
            // x'' = x-x'
            x[eps][i] <-- XY[eps][0][i] - XY1[eps][0][i]; // each XY[eps][0] is in [ - 2^CHUNK_SIZE, 2^CHUNK_SIZE) so difference is in [ - 2^{CHUNK_SIZE + 1}, 2^{CHUNK_SIZE + 1})
            xRangeChecks[eps][i] = Num2Bits(CHUNK_SIZE+2);
            xRangeChecks[eps][i].in <== x[eps][i] + (1<<(CHUNK_SIZE + 1)); // x[eps][i] should be between [ - 2^{CHUNK_SIZE + 1}, 2^{CHUNK_SIZE + 1})
        }
    }
    
    var overflow = max(2 * CHUNK_SIZE + OVERFLOW_B + LOGK2, OVERFLOW_A);
    // finally constrain out * b - a = p * x 
    // out * b - a has overflow in (- 2^{overflow + 1}, 2^{overflow  + 1}) 
    component modCheck[2];  
    for(var eps = 0; eps < 2; eps++){
        modCheck[eps] = CheckCarryModP(CHUNK_SIZE, CHUNK_NUMBER, m, overflow + 1, p);
        for(var i = 0; i < CHUNK_NUMBER; i++){
            modCheck[eps].in[i] <== mult.out[eps][i] - a[eps][i];
            modCheck[eps].Y[i] <== 0;
        }
        for(var i = 0; i<m; i++){
            modCheck[eps].X[i] <== x[eps][i];
        }
    }
}


// input: a+b u
// output: a-b u 
// IF p = 3 mod 4 THEN a - b u = (a+b u)^p <-- Frobenius map 
// aka Fp2FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER)
template Fp2Conjugate(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER]; 
    signal output out[2][CHUNK_NUMBER];
    
    component neg1 = FpNegate(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        neg1.in[i] <== in[1][i];
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] <== in[0][i];
        out[1][i] <== neg1.out[i];
    }
}

// raises to q^power-th power 
template Fp2FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, power, p){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];
    
    var pow = power % 2;
    component neg1 = FpNegate(CHUNK_SIZE,CHUNK_NUMBER,p);
    if(pow == 0){
        for(var i = 0; i < CHUNK_NUMBER; i++){
            out[0][i] <== in[0][i];
            out[1][i] <== in[1][i];
        }
    }else{
        for(var i = 0; i < CHUNK_NUMBER; i++){
            neg1.in[i] <== in[1][i];
        }
        for(var i = 0; i < CHUNK_NUMBER; i++){
            out[0][i] <== in[0][i];
            out[1][i] <== neg1.out[i];
        }
    }
}

// in = in0 + in1 * u, elt of Fp2
// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-11#section-4.1
// NOTE: different from Wahby-Boneh paper https://eprint.iacr.org/2019/403.pdf and python reference code: https://github.com/algorand/bls_sigs_ref/blob/master/python-impl/opt_swu_g2.py
template Fp2Sgn0(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER];
    signal output out;

    component sgn[2];
    for(var i = 0; i < 2; i++){
        sgn[i] = FpSgn0(CHUNK_SIZE, CHUNK_NUMBER, p);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            sgn[i].in[idx] <== in[i][idx];
        }
    }
    component isZero = BigIsZero(CHUNK_NUMBER);
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        isZero.in[idx] <== in[0][idx];
    }
    
    signal sgn1; // (in0 == 0) && (sgn[1])
    sgn1 <== isZero.out * sgn[1].out; 
    out <== sgn[0].out + sgn1 - sgn[0].out * sgn1; // sgn[0] || ((in0 == 0 && sgn[1]))
}

template Fp2IsZero(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[2][CHUNK_NUMBER];
    signal output out;

    // check that in[i] < p 
    component lessThan[2];
    
    component isZeros[2][CHUNK_NUMBER];
    var total = 2 * CHUNK_NUMBER;
    for(var j = 0; j < 2; j++){
        lessThan[j] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for(var i = 0; i < CHUNK_NUMBER; i++) {
            lessThan[j].a[i] <== in[j][i];
            lessThan[j].b[i] <== p[i];

            isZeros[j][i] = IsZero();
            isZeros[j][i].in <== in[j][i];
            total -= isZeros[j][i].out;
        }
        lessThan[j].out === 1;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}

template Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];
    signal output out;

    // check that a[i], b[i] < p 
    component lessThanA[2];
    component lessThanB[2];
    component isEquals[2][CHUNK_NUMBER];
    var total = 2 * CHUNK_NUMBER;
    for(var j = 0; j < 2; j++){
        lessThanA[j] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        lessThanB[j] = BigLessThan(CHUNK_SIZE, CHUNK_NUMBER);
        for (var i = 0; i < CHUNK_NUMBER; i ++) {
            lessThanA[j].a[i] <== a[j][i]; 
            lessThanA[j].b[i] <== p[i]; 

            lessThanB[j].a[i] <== b[j][i]; 
            lessThanB[j].b[i] <== p[i]; 

            isEquals[j][i] = IsEqual();
            isEquals[j][i].in[0] <== a[j][i];
            isEquals[j][i].in[1] <== b[j][i];
            total -= isEquals[j][i].out;
        }
        lessThanA[j].out === 1;
        lessThanB[j].out === 1;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}
