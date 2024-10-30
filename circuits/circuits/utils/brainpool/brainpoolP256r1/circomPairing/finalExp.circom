pragma circom 2.0.3;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "fieldElementsFunc.circom";
include "fp2.circom";
include "fp12.circom";

// assume input is an element of Fp12 in the cyclotomic subgroup GΦ₁₂
// A cyclotomic group is a subgroup of Fp^CHUNK_SIZE defined by
//   GΦₙ(p) = {α ∈ Fpⁿ : α^{Φₙ(p)} = 1}

// below we implement compression and decompression for an element  GΦ₁₂ following Theorem 3.1 of https://eprint.iacr.org/2010/542.pdf
// Fp4 = Fp2(w^3) where (w^3)^2 = 1 + u 
// Fp12 = Fp4(w) where w^3 = w^3 

// in = g0 + g2 w + g4 w^2 + g1 w^3 + g3 w^4 + g5 w^5 where g_i are elements of Fp2
// out = Compress(in) = [ g2, g3, g4, g5 ] 
template Fp12CyclotomicCompress(CHUNK_SIZE, CHUNK_NUMBER) {
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[4][2][CHUNK_NUMBER]; 

    for(var eps = 0; eps < 2; eps++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[0][eps][j] <== in[1][eps][j];
            out[1][eps][j] <== in[4][eps][j];
            out[2][eps][j] <== in[2][eps][j];
            out[3][eps][j] <== in[5][eps][j];
        }
    } 
}

// in = [g2, g3, g4, g5] where g_i are elements of Fp2
// out[6][2][CHUNK_NUMBER] each register in [0, 2^CHUNK_SIZE)
// out = Decompress(in) = g0 + g2 w + g4 w^2 + g1 w^3 + g3 w^4 + g5 w^5 where
// if g2 != 0:
//      g1 = (g5^2 * (1 + u) + 3 g4^2 - 2 g3)/(4g2) 
//      g0 = (2 g1^2 + g2 * g5 - 3 g3*g4) * (1 + u) + 1
// if g2 = 0:
//      g1 = (2 g4 * g5)/g3
//      g0 = (2 g1^2 - 3 g3 * g4) * (1 + u)  + 1    NOTE g0 IS QUARTIC IN THE INPUTS, so I don't think it's worth trying to compute a NoCarry version of g0
// out0 = g0, out1 = g2, out2 = g4, out3 = g1, out4 = g3, out5 = g5
template Fp12CyclotomicDecompress(CHUNK_SIZE, CHUNK_NUMBER, p) {
    signal input in[4][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER]; 

    var XI0 = 1;
    var LOGK = log_ceil(CHUNK_NUMBER); 
    var LOGK2 = log_ceil(((1 + XI0) * 2 * CHUNK_NUMBER + 6 * CHUNK_NUMBER) * CHUNK_NUMBER + 1);
    var LOGK3 = log_ceil((1 + XI0) * 6 * CHUNK_NUMBER * CHUNK_NUMBER + 1);
    assert(3 * CHUNK_SIZE + LOGK2 < 250);

    var len = 2 * CHUNK_NUMBER - 1; // number of registers in output of Fp2MultiplyNoCarry
                     // len = CHUNK_NUMBER if using Fp2MultiplyNoCarryCompress 

    // g2 = in[0], g3 = in[1], g4 = in[2], g5 = in[3]
    for(var eps = 0; eps < 2; eps++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            out[1][eps][j] <== in[0][eps][j]; 
            out[2][eps][j] <== in[2][eps][j]; 
            out[4][eps][j] <== in[1][eps][j]; 
            out[5][eps][j] <== in[3][eps][j]; 
        }
    }

    // detect if g2 is 0
    component g2IsZero = Fp2IsZero(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var eps = 0; eps < 2; eps++){
        for(var i = 0; i < CHUNK_NUMBER; i++){
            g2IsZero.in[eps][i] <== in[0][eps][i];
        }
    }

    // COMPUTATION OF g1 when g2 != 0:
    component g5SQ = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // overflow < 2k * 2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            g5SQ.a[eps][i] <== in[3][eps][i];
            g5SQ.b[eps][i] <== in[3][eps][i];
        }
    }
    // c = XI0 + u
    // g5^2 * c
    var G_5_SQC[4][150] = signed_Fp2_mult_w6(len, g5SQ.out, XI0); // overflow < (1 + XI0)*2k * 2^{2n}
    // 3 g4^2
    component g4Sq3 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 3 + LOGK); // overflow 6k * 2^{2n}

    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            g4Sq3.a[eps][i] <== 3 * in[2][eps][i];
            g4Sq3.b[eps][i] <== in[2][eps][i];
        }
    }
    signal g1Num[2][len];   // g5^2 * (XI0 + u) + 3 g4^2 - 2 g3
                            // overflow ((1 + XI0)*2k + 6k + 2/2^CHUNK_SIZE) * 2^{2n}
    for(var i = 0; i < len; i++){
        for(var eps = 0; eps < 2; eps++){
            if(i < CHUNK_NUMBER){
                g1Num[eps][i] <== G_5_SQC[eps][i] + g4Sq3.out[eps][i] - 2 * in[1][eps][i];
            } else {
                g1Num[eps][i] <== G_5_SQC[eps][i] + g4Sq3.out[eps][i];
            }
        }
    }

    component g1NumRed = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 3 * CHUNK_SIZE + LOGK2);
    // overflow < ((1 + XI0)*2k + 6k + 2/2^CHUNK_SIZE) * CHUNK_NUMBER  * 2^{3n}
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            g1NumRed.in[i][j] <== g1Num[i][j];
        }
    }
    // compute g1NumRed / 4g2
    component g1_1 = SignedFp2Divide(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, CHUNK_SIZE + 2, p); 
    for(var j = 0; j < CHUNK_NUMBER; j++){
        for(var i = 0; i < 2; i++) {
            g1_1.a[i][j] <== g1NumRed.out[i][j]; 
        }
        for(var i = 0; i < 2; i++){
            g1_1.b[i][j] <== 4*in[0][i][j]; 
        }
    }

    // END OF COMPUTATION OF g1 when g2 != 0:



    // COMPUTATION OF g1 when g2 = 0:
    // g1 = 2 * g4*g5 / g3
    component twoG4G5 = SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, p, CHUNK_SIZE + 1,3 * CHUNK_SIZE + 2 + 2 * LOGK); // overflow 4k^2 * 2^{3n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            twoG4G5.a[eps][i] <== 2 * in[2][eps][i];
            twoG4G5.b[eps][i] <== in[3][eps][i];
        }
    }
    component g1_0 = SignedFp2Divide(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 + 2 * LOGK, CHUNK_SIZE, p);
    for(var j = 0; j < CHUNK_NUMBER; j++){
        for(var i = 0; i < 2; i++)
            g1_0.a[i][j] <== twoG4G5.out[i][j]; 
        for(var i = 0; i < 2; i++){
            g1_0.b[i][j] <== in[1][i][j]; 
        }
    }
    // END OF COMPUTATION OF g1 when g2 = 0.

    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            out[3][eps][i] <== g1_1.out[eps][i] + g2IsZero.out * (g1_0.out[eps][i] - g1_1.out[eps][i]);
        }
    }

    // COMPUTATION OF g0 when g2 != 0:
    // g0 = (2 g1^2 + g2 g5 - 3 g3 g4)(1 + u) + 1
    component twoG1Sq= SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 2 + LOGK); // overflow 4 * CHUNK_NUMBER * 2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            twoG1Sq.a[eps][i] <== 2 * g1_1.out[eps][i];
            twoG1Sq.b[eps][i] <== g1_1.out[eps][i];
        }
    }
    
    component g2G5 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // overflow 2k * 2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            g2G5.a[eps][i] <== in[0][eps][i];
            g2G5.b[eps][i] <== in[3][eps][i];
        }
    }
    
    component threeG3G4 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 3 + LOGK); // overflow 6 * CHUNK_NUMBER * 2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            threeG3G4.a[eps][i] <== 3 * in[1][eps][i];
            threeG3G4.b[eps][i] <== in[2][eps][i];
        }
    }
    // 2 g1^2 + g2 g5 - 3 g3 g4 
    var TEMP[2][len]; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < len; j++){
            TEMP[i][j] = twoG1Sq.out[i][j] + g2G5.out[i][j] - threeG3G4.out[i][j];
        }
    }
    
    // (2 g1^2 + g2 g5 - 3 g3 g4)(1 + u)
    var TEMP_C[2][150] = signed_Fp2_mult_w6(len, TEMP, XI0); // overflow abs val < (1 + XI0)*6k * 2^{2n}
    // (2 g1^2 + g2 g5 - 3 g3 g4)(1 + u) + 1 
    TEMP_C[0][0]++;
    component compress01 = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 3 * CHUNK_SIZE + LOGK3); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            compress01.in[i][j] <== TEMP_C[i][j];
        }
    }
    component carryMod01 = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK3, p);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            carryMod01.in[i][j] <== compress01.out[i][j];
        }
    }
    signal g0_1[2][CHUNK_NUMBER]; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            g0_1[i][j] <== carryMod01.out[i][j]; 
        }
    }
    // END OF COMPUTATION OF g0 when g2 != 0. 
    
    // COMPUTATION OF g0 when g2 = 0:
    // g0 = (2g1^2 - 3g3g4)(1 + u) + 1
    component twoG1_0Sq= SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 2 + LOGK); // overflow 4k * 2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            twoG1_0Sq.a[eps][i] <== 2 * g1_0.out[eps][i];
            twoG1_0Sq.b[eps][i] <== g1_0.out[eps][i];
        }
    }
    // can reuse threeG3G4 ! 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < len; j++){
            TEMP[i][j] = twoG1_0Sq.out[i][j] - threeG3G4.out[i][j];
        }
    }
    // overflow 6 * CHUNK_NUMBER * 2^{2n}
    TEMP_C = signed_Fp2_mult_w6(len, TEMP, XI0);
    TEMP_C[0][0]++;
    component compress0_0 = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 3 * CHUNK_SIZE + LOGK3); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            compress0_0.in[i][j] <== TEMP_C[i][j];
        }
    }
    component carryMod0_0 = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK3, p);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            carryMod0_0.in[i][j] <== compress0_0.out[i][j];
        }
    }
    signal g0_0[2][CHUNK_NUMBER]; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            g0_0[i][j] <== carryMod0_0.out[i][j]; 
        }
    }
    // END OF COMPUTATION OF g0 when g2 = 0.    
        
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var eps = 0; eps < 2; eps++){
            out[0][eps][i] <== g0_1[eps][i] + g2IsZero.out * (g0_0[eps][i] - g0_1[eps][i]);
        }
    }

}

// input is [g2, g3, g4, g5] = C(g) in compressed format of Fp12cyclotomicCompress 
//  input[i][2] keeps track of positive and negatives 
//  don't assume anything about overflow in registers in case we want to square twice before carry
// output is C(g^2) = [h2, h3, h4, h5] computed using Theorem 3.2 of https://eprint.iacr.org/2010/542.pdf 
//  c = XI0 + u
//  h2 = 2(g2 + 3 * c*B_45) 
//  h3 = 3(A_45 - (c + 1)B_45) - 2g3
//  h4 = 3(A_23 - (c + 1)B_23) - 2g4
//  h5 = 2(g5 + 3B_23) 
//  A_ij = (g_i + g_j)(g_i + c g_j)
//  B_ij = g_i g_j 

// everything computed with no carries 
// If registers of in[] are in [0, B), then registers of out[] have abs val < (18(XI0 + 2)CHUNK_NUMBER + 2/B)* B^2 
template SignedFp12CyclotomicSquareNoCarry(CHUNK_SIZE, CHUNK_NUMBER) {
    signal input in[4][2][CHUNK_NUMBER];
    signal output out[4][2][2 * CHUNK_NUMBER - 1];

    var XI0 = 1;
    var LOGK = log_ceil(CHUNK_NUMBER);

    component B23 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // overflow in 2 * CHUNK_NUMBER * 2^{2N} 
    component B45 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            B23.a[i][j] <== in[0][i][j];
            B23.b[i][j] <== in[1][i][j];

            B45.a[i][j] <== in[2][i][j];
            B45.b[i][j] <== in[3][i][j];
        }
    }

    component A23 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 5 + LOGK); // overflow in 4*(2 + XI0) * CHUNK_NUMBER  * 2^{2N}     
    component A45 = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 5 + LOGK);
    // c*g3 = (1 + u)*g3
    var cg3[2][150] = signed_Fp2_mult_w6(CHUNK_NUMBER, in[1], XI0); 
    var cg5[2][150] = signed_Fp2_mult_w6(CHUNK_NUMBER, in[3], XI0);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < CHUNK_NUMBER; j++){
            A23.a[i][j] <== in[0][i][j] + in[1][i][j];  // 2 * 2^{N}
            A23.b[i][j] <== in[0][i][j] + cg3[i][j];    // (2 + XI0) * 2^{N}

            A45.a[i][j] <== in[2][i][j] + in[3][i][j];
            A45.b[i][j] <== in[2][i][j] + cg5[i][j];
        }
    }
    
    var cB45[2][150] = signed_Fp2_mult_w6(2 * CHUNK_NUMBER - 1, B45.out, XI0);  // (1 + XI0)*2k * 2^{2N}
    var cB23[2][150] = signed_Fp2_mult_w6(2 * CHUNK_NUMBER - 1, B23.out, XI0); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            if(j < CHUNK_NUMBER){
                out[0][i][j] <== 2 * (in[0][i][j] + 3 * cB45[i][j]);    // (2 + 6 * (1 + XI0)CHUNK_NUMBER) * 2^{2N}
                out[3][i][j] <== 2 * (in[3][i][j] + 3 * B23.out[i][j]); // (2 + 6 * (1 + XI0)CHUNK_NUMBER) * 2^{2N}
                out[1][i][j] <== 3 * (A45.out[i][j] - cB45[i][j] - B45.out[i][j]) - 2 * in[1][i][j]; 
                                                                    // 3 * 4*(2 + XI0) * CHUNK_NUMBER * 2^{2N} 
                out[2][i][j] <== 3 * (A23.out[i][j] - cB23[i][j] - B23.out[i][j]) - 2 * in[2][i][j]; 
            } else {
                out[0][i][j] <== 2 * (3 * cB45[i][j]);   
                out[3][i][j] <== 2 * (3 * B23.out[i][j]); 
                out[1][i][j] <== 3 * (A45.out[i][j] - cB45[i][j] - B45.out[i][j]); 
                out[2][i][j] <== 3 * (A23.out[i][j] - cB23[i][j] - B23.out[i][j]); 
            }
        }
    }
}

// input is [g2, g3, g4, g5] = C(g) is output of Fp12cyclotomicCompress 
// assume in[4][2][CHUNK_NUMBER] has registers in [0, 2^CHUNK_SIZE) with in[i][j] in [0, p)
// output is C(g^2) 
// out[4][2][CHUNK_NUMBER] has registers in [0, 2^CHUNK_SIZE) with out[i][j] in [0, p) 
template Fp12CyclotomicSquare(CHUNK_SIZE, CHUNK_NUMBER, p) {
    signal input in[4][2][CHUNK_NUMBER]; 
    signal output out[4][2][CHUNK_NUMBER];

    var XI0 = 1;
    var LOGK2 = log_ceil(18 * (2 + XI0) * CHUNK_NUMBER  * CHUNK_NUMBER + 1); 
    assert(3 * CHUNK_SIZE + LOGK2 < 251);

    component sq = SignedFp12CyclotomicSquareNoCarry(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 4; i++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                sq.in[i][eps][j] <== in[i][eps][j]; 
            }
        }
    }
    component sqRed[4]; 
    component sqMod[4];
    for(var i = 0; i < 4; i++){
        sqRed[i] = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, p, 3 * CHUNK_SIZE + LOGK2); 
        for(var eps = 0; eps < 2; eps++)
        {
            for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
                sqRed[i].in[eps][j] <== sq.out[i][eps][j]; 
            }
        }
        sqMod[i] = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, p);
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                sqMod[i].in[eps][j] <== sqRed[i].out[eps][j]; 
            }
        }
    }
    for(var i = 0; i < 4; i++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[i][eps][j] <== sqMod[i].out[eps][j];
            }
        }
    }
}

// assume input is an element of Fp12 in the cyclotomic subgroup GΦ12
// output is input raised to the e-th power
// use the square and multiply method
// assume 0 < e < 2^254
template Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, e, p) {
    assert(e > 0);

    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    var TEMP = e;
    // get bitlength of e 
    var BITLENGTH;
    for(var i = 0; i < 254; i++){
        if(TEMP != 0){
            BITLENGTH = i; 
        }
        TEMP = TEMP>>1;
    }
    BITLENGTH++;

    // Compress in[]
    component cIn = Fp12CyclotomicCompress(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 6; i++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                cIn.in[i][eps][j] <== in[i][eps][j];
            }
        }
    }
    
    component pow2[BITLENGTH]; // pow2[i] = C(in^{2^i})
    component dPow2[BITLENGTH];
    component mult[BITLENGTH];

    signal first[6][2][CHUNK_NUMBER];
    var CUR_ID = 0; // tracks current index in mult[] 

    for(var i = 0; i < BITLENGTH; i++){
        // compute pow2[i] = pow2[i - 1]* * 2
        if(i > 0){ // pow2[0] is never defined since there is no squaring involved
            pow2[i] = Fp12CyclotomicSquare(CHUNK_SIZE, CHUNK_NUMBER, p);
            if(i == 1){
                for(var id = 0; id < 4; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            pow2[i].in[id][eps][j] <== cIn.out[id][eps][j];
                        }
                    }
                }
            } else {
                for(var id = 0; id < 4; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            pow2[i].in[id][eps][j] <== pow2[i - 1].out[id][eps][j];
                        }
                    }
                }
            }
        }
        if(((e >> i) & 1) == 1){
            // decompress pow2[i] so we can use it 
            if(i > 0){
                dPow2[CUR_ID] = Fp12CyclotomicDecompress(CHUNK_SIZE, CHUNK_NUMBER, p);
                for(var id = 0; id < 4; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            dPow2[CUR_ID].in[id][eps][j] <== pow2[i].out[id][eps][j];
                        }
                    }
                }
            }
            if(CUR_ID == 0){ // this is the least significant bit
                if(i == 0){
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++){
                                first[id][eps][j] <== in[id][eps][j];
                            }
                        }
                    }
                } else {
                    for(var id = 0; id < 6; id++){
                        for(var eps = 0; eps < 2; eps++){
                            for(var j = 0; j < CHUNK_NUMBER; j++){
                                first[id][eps][j] <== dPow2[CUR_ID].out[id][eps][j];
                            }
                        }
                    }
                }
            } else {
                // multiply what we already have with pow2[i]
                mult[CUR_ID] = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p); 
                for(var id = 0; id < 6; id++){
                    for(var eps = 0; eps < 2; eps++){
                        for(var j = 0; j < CHUNK_NUMBER; j++){
                            mult[CUR_ID].a[id][eps][j] <== dPow2[CUR_ID].out[id][eps][j];
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

// hard part of final exponentiation
// use equation at top of p.14 from https://eprint.iacr.org/2020/875.pdf
template FinalExpHardPart(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[6][2][CHUNK_NUMBER]; 
    signal output out[6][2][CHUNK_NUMBER];

    var x = get_BLS12_381_parameter();  // absolute value of parameter for BLS12-381
    
    // in^{(x + 1)/3} 
    component pow1 = Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, (x + 1) \ 3, p); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow1.in[id][eps][j] <== in[id][eps][j];
            }
        }
    }
    
    // in^{(x + 1)/3 * (x + 1)}
    component pow2 = Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, x + 1, p); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow2.in[id][eps][j] <== pow1.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 *  - 1} = pow2^ - 1  inverse = frob(6) in cyclotomic subgroup
    component pow3 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 6);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow3.in[id][eps][j] <== pow2.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * -x} = pow3^x 
    component pow4 = Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, x, p); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow4.in[id][eps][j] <== pow3.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * p} = pow2^p 
    component pow5 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 1);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow5.in[id][eps][j] <== pow2.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * (-x+p)} = pow4 * pow5
    component pow6 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow6.a[id][eps][j] <== pow4.out[id][eps][j];
                pow6.b[id][eps][j] <== pow5.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * (-x+p) * x}  = pow6^x
    component pow7 = Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, x, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow7.in[id][eps][j] <== pow6.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * (-x+p) * x^2}  = pow7^x
    component pow8 = Fp12CyclotomicExp(CHUNK_SIZE, CHUNK_NUMBER, x, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow8.in[id][eps][j] <== pow7.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * (-x+p) * q^2} = pow6^{q^2}
    component pow9 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 2);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow9.in[id][eps][j] <== pow6.out[id][eps][j];
            }
        }
    }
    
    // in^{(x + 1)^2/3 * (-x+p) *  - 1} = pow6^{ - 1} = pow6^{q^6}
    component pow10 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 6);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow10.in[id][eps][j] <== pow6.out[id][eps][j];
            }
        }
    }
    
    // in^{(x + 1)^2/3 * (-x+p) * (x^2 + q^2)} = pow8 * pow9
    component pow11 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow11.a[id][eps][j] <== pow8.out[id][eps][j];
                pow11.b[id][eps][j] <== pow9.out[id][eps][j];
            }
        }
    }

    // in^{(x + 1)^2/3 * (-x+p) * (x^2 + q^2 - 1)} = pow10 * pow11
    component pow12 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow12.a[id][eps][j] <== pow10.out[id][eps][j];
                pow12.b[id][eps][j] <== pow11.out[id][eps][j];
            }
        }
    }

    // final answer
    // in^{(x + 1)^2/3 * (-x+p) * (x^2 + q^2 - 1) + 1} = pow12 * in 
    component pow13 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                pow13.a[id][eps][j] <== pow12.out[id][eps][j];
                pow13.b[id][eps][j] <== in[id][eps][j];
            }
        }
    }

    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[id][eps][j] <== pow13.out[id][eps][j];
            }
        }
    }
}

// easy part of final exponentiation 
// out = in^{ (q^6 - 1)*(q^2 + 1) }
template FinalExpEasyPart(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];
    
    // in^{q^6} 
    component f1 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 6); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f1.in[id][eps][j] <== in[id][eps][j];
            }
        }
    }

    // in^{ - 1}
    component f2 = Fp12Invert(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f2.in[id][eps][j] <== in[id][eps][j];
            }
        }
    }

    // in^{q^6 - 1}
    component f3 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f3.a[id][eps][j] <== f1.out[id][eps][j];
                f3.b[id][eps][j] <== f2.out[id][eps][j];
            }
        }
    }

    // in^{(q^6 - 1)*q^2} = f3^{q^2}
    component f4 = Fp12FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 2); 
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f4.in[id][eps][j] <== f3.out[id][eps][j];
            }
        }
    }
    
    // in^{(q^6 - 1)(q^2 + 1)} = f4 * f3
    component f5 = Fp12Multiply(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f5.a[id][eps][j] <== f3.out[id][eps][j];
                f5.b[id][eps][j] <== f4.out[id][eps][j];
            }
        }
    }
    
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[id][eps][j] <== f5.out[id][eps][j];
            }
        }
    }

}

// out = in^{(q^12 - 1)/r} = FinalExpHardPart(FinalExpEasyPart(in))
template FinalExponentiate(CHUNK_SIZE, CHUNK_NUMBER, p){
    signal input in[6][2][CHUNK_NUMBER];
    signal output out[6][2][CHUNK_NUMBER];

    component f1 = FinalExpEasyPart(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f1.in[id][eps][j] <== in[id][eps][j];
            }
        }
    }
    
    component f = FinalExpHardPart(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                f.in[id][eps][j] <== f1.out[id][eps][j];
            }
        }
    }

    for(var id = 0; id < 6; id++){
        for(var eps = 0; eps < 2; eps++){
            for(var j = 0; j < CHUNK_NUMBER; j++){
                out[id][eps][j] <== f.out[id][eps][j];
            }
        }
    }
}
