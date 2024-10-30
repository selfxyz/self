pragma circom 2.0.3;

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "fp.circom";
include "fp2.circom";
include "curve.circom";
include "curveFp2.circom";
include "bls12_381Func.circom";

/* 
implementation of optimized simplified SWU map to BLS12-381 G2
following Wahby-Boneh: Section 4.2 of https://eprint.iacr.org/2019/403.pdf
Python reference code: https://github.com/algorand/bls_sigs_ref/blob/master/python-impl/opt_swu_g2.py
Additional exposition: https://hackmd.io/@benjaminion/bls12-381#Simplified-SWU-map

E2 is y^2 = x^3 + 4(1+u) over Fp2
E2' is A curve of form y^2 = x^3 + A x + B that is 3-isogenous to E2
Constants are A = 240 u, B = 1012 + 1012 u where u = sqrt( - 1)
*/

// Simplified SWU map, optimized and adapted to E2' 
// in = t: 2 x CHUNK_NUMBER array, element of Fp2 
// out: 2 x 2 x CHUNK_NUMBER array, point (out[0], out[1]) on curve E2' 
// 
// This is osswu2_help(t) in Python reference code
// See Section 4.2 of Wahby-Boneh: https://eprint.iacr.org/2019/403.pdf
// circom implementation is slightly different since sqrt and inversion are cheap
template OptSimpleSWU2(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER]; 
    //signal output isInfinity; optimized simple SWU should never return point at infinity, exceptional case still returns A normal point 
    
    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    
    var A[2] = [0, 240];
    var B[2] = [1012, 1012];
    
    // distinguished non-square in Fp2 for SWU map: XI =  - 2 - u 
    // this is Z in the suite 8.8.2 of https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-14#section-10
    var XI[2] = [ - 2,  - 1];

    var LOGK = log_ceil(CHUNK_NUMBER);
    // in = t, compute t^2, t^3
    component tSQ = SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, P, CHUNK_SIZE, 3 * CHUNK_SIZE + 2 * LOGK + 1);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            tSQ.a[i][idx] <== in[i][idx];
            tSQ.b[i][idx] <== in[i][idx];
        }
    }
    // compute XI * t^2 
    component xiTSq = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 3, P);

    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        xiTSq.in[0][idx] <== XI[0] * tSQ.out[0][idx] - XI[1] * tSQ.out[1][idx];
        xiTSq.in[1][idx] <== XI[0] * tSQ.out[1][idx] + XI[1] * tSQ.out[0][idx];
    }

    // XI^2 * t^4
    component xi2T4 = SignedFp2MultiplyNoCarryCompress(CHUNK_SIZE, CHUNK_NUMBER, P, CHUNK_SIZE, 3 * CHUNK_SIZE + 2 * LOGK + 1); 

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            xi2T4.a[i][idx] <== xiTSq.out[i][idx];
            xi2T4.b[i][idx] <== xiTSq.out[i][idx];
        }
    }
    // XI^2 * t^4 + XI * t^2
    var NUM_DEN_COMMON[2][CHUNK_NUMBER];
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            NUM_DEN_COMMON[i][idx] = xi2T4.out[i][idx] + xiTSq.out[i][idx];
        }
    }
    // x0(t) = B (XI^2 * t^4 + XI * t^2 + 1) / (-A * (XI^2 * t^4 + XI * t^2)) 
    component x0Den = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2 + 9, P);

    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        x0Den.in[0][idx] <== -A[0] * NUM_DEN_COMMON[0][idx] + A[1] * NUM_DEN_COMMON[1][idx];
        x0Den.in[1][idx] <== -A[0] * NUM_DEN_COMMON[1][idx] - A[1] * NUM_DEN_COMMON[0][idx];
    }

    // if x0Den = 0, replace with X1_DEN = A * XI; this way x1(t) = x0Num / X1_DEN = B / (XI * A)
    // X1_DEN = A * XI = 240 - 480 i 
    assert(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7);

    var X1_DEN[2][CHUNK_NUMBER];
    if(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7){
        X1_DEN = [
            [240,0,0,0,0,0,0],
            [35747322042230987,36025922209447795,1084959616957103,7925923977987733,16551456537884751,23443114579904617,1829881462546425]
        ];
    }

    // Exception if x0Den = 0: 
    component exception = Fp2IsZero(CHUNK_SIZE, CHUNK_NUMBER, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            exception.in[i][idx] <== x0Den.out[i][idx];
        }
    }
    //isInfinity <== exception.out; 
    
    NUM_DEN_COMMON[0][0]++;
    component x0Num = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2 + 11, P);

    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        x0Num.in[0][idx] <== B[0] * NUM_DEN_COMMON[0][idx] - B[1] * NUM_DEN_COMMON[1][idx];
        x0Num.in[1][idx] <== B[0] * NUM_DEN_COMMON[1][idx] + B[1] * NUM_DEN_COMMON[0][idx];
    }
    // division is same cost/constraints as multiplication, so we will compute x0 and avoid using projective coordinates 
    component x0 = SignedFp2Divide(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_SIZE, CHUNK_SIZE, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            x0.a[i][idx] <== x0Num.out[i][idx];
            x0.b[i][idx] <== x0Den.out[i][idx] + exception.out * (X1_DEN[i][idx] - x0Den.out[i][idx]);
        }
    }
    
    // g(x) = x^3 + A x + B 
    // Compute g(x0(t)) 
    component gX0 = EllipticCurveFunction(CHUNK_SIZE, CHUNK_NUMBER, A, B, P);
    // x1(t) = XI * t^2 * x0(t)
    component x1 = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            gX0.in[i][idx] <== x0.out[i][idx];
            x1.a[i][idx] <== xiTSq.out[i][idx];
            x1.b[i][idx] <== x0.out[i][idx];
        }
    }
    
    component xi3T6 = Fp2MultiplyThree(CHUNK_SIZE, CHUNK_NUMBER, P); // shares A hidden component with xi2T4; I'll let compiler optimize that out for readability
    
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){ 
            xi3T6.a[i][idx] <== xiTSq.out[i][idx];
            xi3T6.b[i][idx] <== xiTSq.out[i][idx];
            xi3T6.c[i][idx] <== xiTSq.out[i][idx];
        }
    }
    // g(x1(t)) = XI^3 * t^6 * g(x0(t)) 
    component gX1 = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){ 
            gX1.a[i][idx] <== xi3T6.out[i][idx];
            gX1.b[i][idx] <== gX0.out[i][idx];
        }
    }
    /* 
    XI^3 is not A square, so one of gX0, gX1 must be A square 
    isSquare = 1 if gX0 is A square, = 0 if gX1 is A square
    sqrt = sqrt(gX0) if isSquare = 1, sqrt = sqrt(gX1) if isSquare = 0

    Implementation is special to P^2 = 9 mod 16
    References:
        P. 9 of https://eprint.iacr.org/2019/403.pdf
        F.2.1.1 for general version for any field: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-14#appendix-F.2.1.1

    I do not use the trick for combining division and sqrt from Section 5 of 
    Bernstein, Duif, Lange, Schwabe, and Yang, "High-speed high-security signatures",
    since division is cheap in circom
    */
    
    signal isSquare;
    
    // Precompute SQRT_CANDIDATE = gX0^{(P^2 + 7) / 16} 
    // P^2 + 7
    var C1[150] = long_add_unequal(CHUNK_SIZE, 2 * CHUNK_NUMBER, 1, prod(CHUNK_SIZE, CHUNK_NUMBER, P, P), [7]);
    // (P^2 + 7) // 16
    var C2[2][150] = long_div2(CHUNK_SIZE, 1, 2 * CHUNK_NUMBER - 1, C1, [16]); 

    assert(C2[1][0] == 0); // assert P^2 + 7 is divisible by 16

    var SQRT_CANDIDATE[2][150] = find_Fp2_exp(CHUNK_SIZE, CHUNK_NUMBER, gX0.out, P, C2[0]);
    // if gX0 is A square, square root must be SQRT_CANDIDATE * (8th-root of unity) 
    //  - 1 is A square in Fp2 (because P^2 - 1 is even) so we only need to check half of the 8th ROOTS of unity
    var ROOTS[4][2][150] = get_roots_of_unity(CHUNK_SIZE, CHUNK_NUMBER);
    var SQRT_WITHNESS[2][2][150];

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                SQRT_WITHNESS[i][j][idx] = 0;
            }
        }
    }

    var IS_SQUARE = 0;
    for(var i = 0; i < 4; i++){
        var SQRT_TMP[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, SQRT_CANDIDATE, ROOTS[i], P); 
        if(is_equal_Fp2(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, SQRT_TMP, SQRT_TMP, P), gX0.out) == 1){
            IS_SQUARE = 1;
            SQRT_WITHNESS[0] = SQRT_TMP;
        }
    }
    isSquare <-- IS_SQUARE;
    isSquare * (1 - isSquare) === 0; 
    
    var IS_SQUARE1 = 0;
    var ETAS[4][2][150] = get_etas(CHUNK_SIZE, CHUNK_NUMBER);
    // find square root of gX1 
    // square root of gX1 must be = SQRT_CANDIDATE * t^3 * eta 
    // for one of four precomputed values of eta
    // eta determined by eta^2 = XI^3 * ( - 1)^{ - 1/4}  
    var T_CU[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, in, in, P), in, P);
    SQRT_CANDIDATE = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, SQRT_CANDIDATE, T_CU, P);
    
    for(var i = 0; i < 4; i++){
        var SQRT_TMP[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, SQRT_CANDIDATE, ETAS[i], P); 
        if(is_equal_Fp2(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, SQRT_TMP, SQRT_TMP, P), gX1.out) == 1){
            IS_SQUARE1 = 1;
            SQRT_WITHNESS[1] = SQRT_TMP;
        }
    }
    assert(IS_SQUARE == 1 || IS_SQUARE1 == 1); // one of gX0 or gX1 must be A square!
        
     
    // X = out[0] = x0 if isSquare == 1, else X = x1    
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[0][i][idx] <== isSquare * (x0.out[i][idx] - x1.out[i][idx]) + x1.out[i][idx]; 
        } 
    }

    // sgn0(t) 
    component sgn_in = Fp2Sgn0(CHUNK_SIZE, CHUNK_NUMBER, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            sgn_in.in[i][idx] <== in[i][idx];
        }
    }

    var Y[2][150];
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            Y[i][idx] = IS_SQUARE * SQRT_WITHNESS[0][i][idx] + (1-IS_SQUARE) * SQRT_WITHNESS[1][i][idx];
        }
    }
    // Y = out[1] = +- SQRT_WITHNESS; sign determined by sgn0(Y) = sgn0(t) 
    
    if(get_fp2_sgn0(CHUNK_NUMBER, Y) != sgn_in.out){
        Y[0] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, P, Y[0]);
        Y[1] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, P, Y[1]);
    } 
    
    component ySq = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    // Y^2 == g(X) 
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[1][i][idx] <-- Y[i][idx];
            ySq.a[i][idx] <== out[1][i][idx];
            ySq.b[i][idx] <== out[1][i][idx];
        }   
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            ySq.out[i][idx] === isSquare * (gX0.out[i][idx] - gX1.out[i][idx]) + gX1.out[i][idx]; 
        }
    }

    // sgn0(Y) == sgn0(t)
    component sqnY = Fp2Sgn0(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            sqnY.in[i][idx] <== out[1][i][idx];
        }
    }
    sqnY.out === sgn_in.out;
    
}

/*
3-Isogeny from E2' to E2
References:
    Appendix E.3 of https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-14#appendix-E.3
    Section 4.3 of Wahby-Boneh: https://eprint.iacr.org/2019/403.pdf
    iso3(P) in Python reference code: https://github.com/algorand/bls_sigs_ref/blob/master/python-impl/opt_swu_g2.py
*/ 

// Input:
//  in = (x', y') point on E2' assumed to not be point at infinity
//  inIsInfinity = 1 if input is point at infinity on E2' (in which case x', y' are arbitrary)
// Output:
//  out = (x, y) is point on E2 after applying 3-isogeny to in 
//  isInfinity = 1 if one of exceptional cases occurs and output should be point at infinity
// Exceptions:
//  inIsInfinity = 1
//  input is A pole of the isogeny, i.e., x_den or y_den = 0 

template Iso3Map(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][2][CHUNK_NUMBER];
    //signal input inIsInfinity;
    signal output out[2][2][CHUNK_NUMBER];
    signal output isInfinity;
    
    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    
    // load coefficients of the isogeny (precomputed)
    var COEFFS[4][4][2][150] = get_iso3_coeffs(CHUNK_SIZE, CHUNK_NUMBER);

    // x = x_num / x_den
    // y = y' * y_num / y_den
    // x_num = sum_{i = 0}^3 COEFFS[0][i] * x'^i
    // x_den = x'^2 + COEFFS[1][1] * x' + COEFFS[1][0] 
    // y_num = sum_{i = 0}^3 COEFFS[2][i] * x'^i
    // y_den = x'^3 + sum_{i = 0}^2 COEFFS[3][i] * x'^i
  
    var LOGK = log_ceil(CHUNK_NUMBER); 
    component xp2NoCarry = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK + 1); 
    component xp2 = SignedFp2CompressCarry(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, 2 * CHUNK_SIZE+LOGK+1, P);
    component xp3NoCarry = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2); 
    component xp3 = SignedFp2CompressCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, 3 * CHUNK_SIZE + 2 * LOGK + 2, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            xp2NoCarry.a[i][idx] <== in[0][i][idx];
            xp2NoCarry.b[i][idx] <== in[0][i][idx];
            xp3NoCarry.b[i][idx] <== in[0][i][idx];
        }
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
            xp3NoCarry.a[i][idx] <== xp2NoCarry.out[i][idx];
            xp2.in[i][idx] <== xp2NoCarry.out[i][idx];
        }
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx <  3 * CHUNK_NUMBER - 2; idx++){
            xp3.in[i][idx] <== xp3NoCarry.out[i][idx]; 
        }
    }

    signal xpPow[3][2][CHUNK_NUMBER]; 
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            xpPow[0][i][idx] <== in[0][i][idx];
            xpPow[1][i][idx] <== xp2.out[i][idx];
            xpPow[2][i][idx] <== xp3.out[i][idx];
        }
    }
     
    component COEFFS_XP[4][3]; 
    var deg[4] = [3, 1, 3, 2];
    for(var i = 0; i < 4; i++){
        for(var j = 0; j < deg[i]; j++){
            COEFFS_XP[i][j] = SignedFp2MultiplyNoCarry(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK + 1);
            for(var l = 0; l < 2; l++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    COEFFS_XP[i][j].a[l][idx] <== COEFFS[i][j + 1][l][idx];
                    COEFFS_XP[i][j].b[l][idx] <== xpPow[j][l][idx];
                }
            }
        }
    }
    var x_frac[4][2][150];  
    for(var i = 0; i < 4; i++){
        for(var l = 0; l < 2; l++){
            for(var idx = 0; idx <  2 * CHUNK_NUMBER - 1; idx++){
                if(idx < CHUNK_NUMBER)
                    x_frac[i][l][idx] = COEFFS[i][0][l][idx];
                else
                    x_frac[i][l][idx] = 0;
            }
        }
        for(var j = 0; j < deg[i]; j++){
            for(var l = 0; l < 2; l++){
                for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                    x_frac[i][l][idx] += COEFFS_XP[i][j].out[l][idx];
                }
            }
        }
    } 
    for(var l = 0; l < 2; l++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        x_frac[1][l][idx] += xp2.out[l][idx];
        x_frac[3][l][idx] += xp3.out[l][idx];
    }
    
    // carry the denominators since we need to check whether they are 0
    component den[2];
    component denIsZero[2];
    for(var i = 0; i < 2; i++){
        den[i] = SignedFp2CompressCarry(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, 2 * CHUNK_SIZE + LOGK + 3, P); 
        for(var l = 0; l < 2; l++){
            for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                den[i].in[l][idx] <== x_frac[2 * i + 1][l][idx];                
            }
        }

        denIsZero[i] = Fp2IsZero(CHUNK_SIZE, CHUNK_NUMBER, P);
        for(var l = 0; l < 2; l++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                denIsZero[i].in[l][idx] <== den[i].out[l][idx];
            }
        }
    }

    //component exception = IsZero();
    //exception.in <== inIsInfinity + denIsZero[0].out + denIsZero[1].out; 
    isInfinity <== denIsZero[0].out + denIsZero[1].out - denIsZero[0].out * denIsZero[1].out; // OR gate: if either denominator is 0, output point at infinity 

    component num[2];

    for(var i = 0; i < 2; i++){
        num[i] = Fp2Compress(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + 2 * LOGK + 3); 
        for(var l = 0; l < 2; l++){
            for(var idx = 0; idx < 2 * CHUNK_NUMBER - 1; idx++){
                num[i].in[l][idx] <== x_frac[2 * i][l][idx];
            }
        }
    }

    component x[2];
    // num / den if den != 0, else num / 1
    for(var i = 0; i < 2; i++){
        x[i] = SignedFp2Divide(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 3, CHUNK_SIZE, P);
        for(var l = 0; l < 2; l++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                x[i].a[l][idx] <== num[i].out[l][idx];
                if(l == 0 && idx == 0)
                    x[i].b[l][idx] <== isInfinity * (1 - den[i].out[l][idx]) + den[i].out[l][idx];
                else
                    x[i].b[l][idx] <== - isInfinity * den[i].out[l][idx] + den[i].out[l][idx];
            }
        }
    }

    component y = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            y.a[i][idx] <== in[1][i][idx];
            y.b[i][idx] <== x[1].out[i][idx];
        }
    } 

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[0][i][idx] <== x[0].out[i][idx];
            out[1][i][idx] <== y.out[i][idx];
        }
    }
}

/* 
Cofactor Clearing for BLS12-381 G2
Implementation below follows Appendix G.3 of https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-14#appendix-G.3 
References:
    The endomorphism psi of Budroni-Pintore: https://eprint.iacr.org/2017/419.pdf
    BLS For the Rest of Us: https://hackmd.io/@benjaminion/bls12-381#Cofactor-clearing
*/

// Input: in, A point on the curve E2 : y^2 = x^3 + 4(1+u)
//  coordinates of in are in "proper" representation
// Output: out = psi(in), A point on the same curve.
template EndomorphismPsi(CHUNK_SIZE, CHUNK_NUMBER, P){
    signal input in[2][2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER];
    
    var C[2][2][CHUNK_NUMBER];
    // Constants:
    // c0 = 1 / (1 + I)^((P - 1) / 3)           # in GF(P^2)
    // C1 = 1 / (1 + I)^((P - 1) / 2)           # in GF(P^2)

    assert(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7);
    if(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7){
        C = [[[0, 0, 0, 0, 0, 0, 0],
             [35184372088875693,
              22472499736345367,
              5698637743850064,
              21300661132716363,
              21929049149954008,
              23430044241153146,
              1829881462546425]],
            [[31097504852074146,
              21847832108733923,
              11215546103677201,
              1564033941097252,
              9796175148277139,
              23041766052141807,
              1359550313685033],
             [4649817190157321,
              14178090100713872,
              25898210532243870,
              6361890036890480,
              6755281389607612,
              401348527762810,
              470331148861392]]]; 
    }
    component frob[2];
    component qx[2];
    for(var i = 0; i < 2; i++){
        frob[i] = Fp2FrobeniusMap(CHUNK_SIZE, CHUNK_NUMBER, 1, P);
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                frob[i].in[j][idx] <== in[i][j][idx];
            }
        }
        qx[i] = Fp2Multiply(CHUNK_SIZE, CHUNK_NUMBER, P);
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                qx[i].a[j][idx] <== C[i][j][idx]; 
                qx[i].b[j][idx] <== frob[i].out[j][idx];
            } 
        }
    }

    for(var j = 0; j < 2; j++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[0][j][idx] <== qx[0].out[j][idx];
            out[1][j][idx] <== qx[1].out[j][idx];
        }
    }
}

// Input: in, A point on the curve E2 : y^2 = x^3 + 4(1+u)
//  coordinates of in are in "proper" representation
// Output: out = psi(psi(in)), A point on the same curve.
template EndomorphismPsi2(CHUNK_SIZE, CHUNK_NUMBER, P){
    signal input in[2][2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER];

    var C[CHUNK_NUMBER];
    // Third root of unity:
    // C = 1 / 2^((P - 1) / 3)          # in GF(P)
    
    assert(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7);
    if(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7){
        C = [35184372088875692,
            22472499736345367,
            5698637743850064,
            21300661132716363,
            21929049149954008,
            23430044241153146,
            1829881462546425];
    }

    component qx[2];
    component qy[2];
    for(var i = 0; i < 2; i++){
        qx[i] = FpMultiply(CHUNK_SIZE, CHUNK_NUMBER, P);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            qx[i].a[idx] <== C[idx];
            qx[i].b[idx] <== in[0][i][idx];
        }
        
        qy[i] = BigSub(CHUNK_SIZE, CHUNK_NUMBER);
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            qy[i].a[idx] <== P[idx];
            qy[i].b[idx] <== in[1][i][idx];
        }
    }
    for(var i = 0; i < 2; i++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        out[0][i][idx] <== qx[i].out[idx];
        out[1][i][idx] <== qy[i].out[idx];
    }
}


// in = P, A point on curve E2
// out = [x^2 - x - 1]P + [x - 1]*psi(P) + psi2(2 * P) 
// where x = -15132376222941642752 is the parameter for BLS12-381
template ClearCofactorG2(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][2][CHUNK_NUMBER];
    signal input inIsInfinity;

    signal output out[2][2][CHUNK_NUMBER];
    signal output isInfinity;
    
    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    var X_ABS = get_BLS12_381_parameter(); // this is abs(x). remember x is negative!
    var A[2] = [0,0];
    var B[2] = [4,4];
    var DUMMY_POINT[2][2][150] = get_generator_G2(CHUNK_SIZE, CHUNK_NUMBER);
    
    // Output: [|x|^2 + |x| - 1]*P + [-|x| - 1]*psi(P) + psi2(2 * P) 
    //       = |x| * (|x|*P + P - psi(P)) - P -psi(P) + psi2(2 * P)
    
    // replace `in` with DUMMY_POINT if inIsInfinity = 1 to ensure P is on the curve 
    signal P[2][2][CHUNK_NUMBER];
    component xP = EllipticCurveScalarMultiplyFp2(CHUNK_SIZE, CHUNK_NUMBER, B, X_ABS, P); 
    component psiP = EndomorphismPsi(CHUNK_SIZE, CHUNK_NUMBER, P);
    component negPy = Fp2Negate(CHUNK_SIZE, CHUNK_NUMBER, P);
    component negPsiPy = Fp2Negate(CHUNK_SIZE, CHUNK_NUMBER, P);
    component doubP = EllipticCurveDoubleFp2(CHUNK_SIZE, CHUNK_NUMBER, A, B, P);
     
    xP.inIsInfinity <== inIsInfinity; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                P[i][j][idx] <== in[i][j][idx] + inIsInfinity * (DUMMY_POINT[i][j][idx] - in[i][j][idx]);
                xP.in[i][j][idx] <== P[i][j][idx];
                psiP.in[i][j][idx] <== P[i][j][idx];
                doubP.in[i][j][idx] <== P[i][j][idx];
            }
        }
    }
    for(var j = 0; j < 2; j++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            negPy.in[j][idx] <== P[1][j][idx];
            negPsiPy.in[j][idx] <== psiP.out[1][j][idx];
        }
    }

    component psi22P = EndomorphismPsi2(CHUNK_SIZE, CHUNK_NUMBER, P);
    component add[5];
    for(var i = 0; i < 5; i++)
        add[i] = EllipticCurveAddFp2(CHUNK_SIZE, CHUNK_NUMBER, A, B, P); 
    
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                psi22P.in[i][j][idx] <== doubP.out[i][j][idx];
                add[0].a[i][j][idx] <== xP.out[i][j][idx];
                add[0].b[i][j][idx] <== P[i][j][idx]; 
            }
        }
    }
    add[0].aIsInfinity <== xP.isInfinity; 
    add[0].bIsInfinity <== inIsInfinity;

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                add[1].a[i][j][idx] <== add[0].out[i][j][idx];
                if(i == 0){
                    add[1].b[i][j][idx] <== psiP.out[i][j][idx];
                } else {
                    add[1].b[i][j][idx] <== negPsiPy.out[j][idx];
                }
            }
        }
    }
    add[1].aIsInfinity <== add[0].isInfinity;
    add[1].bIsInfinity <== inIsInfinity;
    
    component xAdd1 = EllipticCurveScalarMultiplyFp2(CHUNK_SIZE, CHUNK_NUMBER, B, X_ABS, P); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                xAdd1.in[i][j][idx] <== add[1].out[i][j][idx];
            }
        }
    }
    xAdd1.inIsInfinity <== add[1].isInfinity; 

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                add[2].a[i][j][idx] <== xAdd1.out[i][j][idx];
                if(i == 0) {
                    add[2].b[i][j][idx] <== P[i][j][idx];
                } else {
                    add[2].b[i][j][idx] <== negPy.out[j][idx];
                }
            }
        }
    }

    add[2].aIsInfinity <== xAdd1.isInfinity;
    add[2].bIsInfinity <== inIsInfinity;
    
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                add[3].a[i][j][idx] <== add[2].out[i][j][idx];
                if(i == 0){
                    add[3].b[i][j][idx] <== psiP.out[i][j][idx];
                } else{
                    add[3].b[i][j][idx] <== negPsiPy.out[j][idx];
                }
            }
        }
    }
    add[3].aIsInfinity <== add[2].isInfinity;
    add[3].bIsInfinity <== inIsInfinity;

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            add[4].a[i][j][idx] <== add[3].out[i][j][idx];
            add[4].b[i][j][idx] <== psi22P.out[i][j][idx];
            }
        }
    }
    add[4].aIsInfinity <== add[3].isInfinity;
    add[4].bIsInfinity <== inIsInfinity;

    // isInfinity = add[4].isInfinity or inIsInfinity (if starting point was O, output must be O)
    isInfinity <== add[4].isInfinity + inIsInfinity - inIsInfinity * add[4].isInfinity; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== add[4].out[i][j][idx] + isInfinity * (DUMMY_POINT[i][j][idx] - add[4].out[i][j][idx]); 
            }
        }
    }
}

// `in` is 2 x 2 x CHUNK_NUMBER representing two field elements in Fp2 
// `out` is 2 x 2 x CHUNK_NUMBER representing A point in subgroup G2 of E2(Fp2) twisted curve for BLS12-381
// isInfinity = 1 if `out` is point at infinity
// Implements steps 2-6 of hash_to_curve as specified in https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-14#section-3 
// In practice `in` = hash_to_field(msg, 2) for an arbitrary-length byte string, in which case `out` = hash_to_curve(msg) 
template MapToG2(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER];
    signal output isInfinity;

    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);

    component Qp[2];
    for(var i = 0; i < 2; i++){
        Qp[i] = OptSimpleSWU2(CHUNK_SIZE, CHUNK_NUMBER);
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            Qp[i].in[j][idx] <== in[i][j][idx];
            }
        }
    }

    // There is A small optimization we can do: Iso3Map is A group homomorphism, so we can add first and then apply isogeny. This uses EllipticCurveAdd on E2' 
    component Rp = EllipticCurveAddFp2(CHUNK_SIZE, CHUNK_NUMBER, [0, 240], [1012, 1012], P); 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                Rp.a[i][j][idx] <== Qp[0].out[i][j][idx];
                Rp.b[i][j][idx] <== Qp[1].out[i][j][idx];
            }
        }
    }
    Rp.aIsInfinity <== 0;
    Rp.bIsInfinity <== 0;
    
    component R = Iso3Map(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                R.in[i][j][idx] <== Rp.out[i][j][idx];
            }
        }
    }
    
    component P = ClearCofactorG2(CHUNK_SIZE, CHUNK_NUMBER);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                P.in[i][j][idx] <== R.out[i][j][idx]; 
            }
        }
    }
    P.inIsInfinity <== R.isInfinity + Rp.isInfinity - R.isInfinity * Rp.isInfinity; 
    
    isInfinity <== P.isInfinity;
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
               out[i][j][idx] <== P.out[i][j][idx]; 
            }
        }
    }
}

/*
Subgroup checks for G1, G2: 
use the latest methods by Scott: https://eprint.iacr.org/2021/1130.pdf
Other references:
    Bowe: https://eprint.iacr.org/2019/814.pdf
    El Housni: https://hackmd.io/@yelhousni/bls12_subgroup_check
*/

// `in` = P is 2 x 2 x CHUNK_NUMBER, pair of Fp2 elements 
// check P is on curve twist E2(Fp2)
// check psi(P) = [x]P where x is parameter for BLS12-381
template SubgroupCheckG2(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][2][CHUNK_NUMBER];
    
    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    var X_ABS = get_BLS12_381_parameter();

    component isOnCurve = PointOnCurveFp2(CHUNK_SIZE, CHUNK_NUMBER, [0,0], [4,4], P);

    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                isOnCurve.in[i][j][idx] <== in[i][j][idx];
            }
        }
    } 

    component psiP = EndomorphismPsi(CHUNK_SIZE, CHUNK_NUMBER, P); 
    component negP = Fp2Negate(CHUNK_SIZE, CHUNK_NUMBER, P);
    component xP = EllipticCurveScalarMultiplyUnequalFp2(CHUNK_SIZE, CHUNK_NUMBER, [4, 4], X_ABS, P); 

    for(var j = 0; j < 2; j++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
           negP.in[j][idx] <== in[1][j][idx];
        }
    }    
            
    for(var j = 0; j < 2; j++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            psiP.in[0][j][idx] <== in[0][j][idx];
            psiP.in[1][j][idx] <== in[1][j][idx];
            xP.in[0][j][idx] <== in[0][j][idx];
            xP.in[1][j][idx] <== negP.out[j][idx]; 
        }
    }
    
    // psi(P) == [x]P
    component isEq[2];
    for(var i = 0; i < 2; i++){
        isEq[i] = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                isEq[i].a[j][idx] <== psiP.out[i][j][idx];
                isEq[i].b[j][idx] <== xP.out[i][j][idx];
            }
        }
    }
    isEq[0].out === 1;
    isEq[1].out === 1;
}

// `in` = P is 2 x CHUNK_NUMBER, pair of Fp elements
// check P is on curve E(Fp)
// check phi(P) == [-x^2] P where phi(x,y) = (omega * x, y) where omega is A cube root of unity in Fp
template SubgroupCheckG1(CHUNK_SIZE, CHUNK_NUMBER){
    signal input in[2][CHUNK_NUMBER];

    var P[150] = get_BLS12_381_prime(CHUNK_SIZE, CHUNK_NUMBER);
    var X_ABS = get_BLS12_381_parameter();
    var B = 4;

    component isOnCurve = PointOnCurve(CHUNK_SIZE, CHUNK_NUMBER, 0, B, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            isOnCurve.in[i][idx] <== in[i][idx];
        }
    }
         
    var omega[CHUNK_NUMBER];
    // Third root of unity:
    // omega = 2^((P - 1) / 3)          # in GF(P)
    assert(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7);
    if(CHUNK_SIZE == 55 && CHUNK_NUMBER == 7){
        omega = [562949953355774,
                 13553422473102428,
                 31415118892071007,
                 22654059864235337,
                 30651204406894710,
                 13070338751470,
                 0];
    }

    component phiPx = FpMultiply(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        phiPx.a[idx] <== omega[idx];
        phiPx.b[idx] <== in[0][idx];
    }
    component phiPyNeg = BigSub(CHUNK_SIZE, CHUNK_NUMBER);
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        phiPyNeg.a[idx] <== P[idx];
        phiPyNeg.b[idx] <== in[1][idx];
    }
    
    // x has hamming weight 6 while x^2 has hamming weight 17 so better to do double-and-add on x twice
    component xP = EllipticCurveScalarMultiplyUnequal(CHUNK_SIZE, CHUNK_NUMBER, B, X_ABS, P); 
    component x2P = EllipticCurveScalarMultiplyUnequal(CHUNK_SIZE, CHUNK_NUMBER, B, X_ABS, P);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            xP.in[i][idx] <== in[i][idx];
        }
    }

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            x2P.in[i][idx] <== xP.out[i][idx];  
        }
    }
    // check -phi(P) == [x^2]P
    component isEq = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P); // using Fp2IsEqual to check two Fp points are equal
    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        isEq.a[0][idx] <== phiPx.out[idx];
        isEq.a[1][idx] <== phiPyNeg.out[idx];

        isEq.b[0][idx] <== x2P.out[0][idx];
        isEq.b[1][idx] <== x2P.out[1][idx];
    }
    isEq.out === 1;
}
