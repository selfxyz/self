pragma circom 2.0.3;

function find_Fp12_sum(CHUNK_SIZE, CHUNK_NUMBER, a, b, p) {
    var out[6][2][150];
    for(var i = 0; i < 6; i++){
        out[i] = find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, a[i], b[i], p);
    }
    return out;
}

function find_Fp12_diff(CHUNK_SIZE, CHUNK_NUMBER, a, b, p) {
    var out[6][2][150];
    for(var i = 0; i < 6; i++){
        out[i] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, a[i], b[i], p);
    }
    return out;
}

function find_Fp12_product(CHUNK_SIZE, CHUNK_NUMBER, a, b, p) {
    var l = 6;
    var A0[l][150];
    var A1[l][150];
    var B0[l][150];
    var B1[l][150];
    var NEG_B0[l][150];
    var NEG_B1[l][150];
    var out[l][2][150];
    for (var i = 0; i < l; i++) { 
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            A0[i][j] = a[i][0][j];
            A1[i][j] = a[i][1][j];
            B0[i][j] = b[i][0][j];
            B1[i][j] = b[i][1][j];
        }
    }
    for (var i = 0; i < l; i++) {
        NEG_B0[i] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, B0[i]);
        NEG_B1[i] = long_sub(CHUNK_SIZE, CHUNK_NUMBER, p, B1[i]);
    }

    var REAL_INIT[20][150];
    var INAG_INIT[20][150];
    var INAG_INIT_NEG[20][150];
    // var real[l][2][150];
    // var imag[l][2][150];
    // each product will be 2l-1 x 2k
    var A0B0_VAR[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A0, B0);
    var A1B1_NEG[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A1, NEG_B1);
    var A0B1_VAR[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A0, B1);
    var A1B0_VAR[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A1, B0);
    var A0B1_NEG[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A0, NEG_B1);
    var A1B0_NEG[20][150] = prod2D(CHUNK_SIZE, CHUNK_NUMBER, l, A1, NEG_B0);
    for (var i = 0; i < 2 * l - 1; i++) { // compute initial rep (deg w = 10)
        REAL_INIT[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, A0B0_VAR[i], A1B1_NEG[i]); // 2 * CHUNK_NUMBER + 1 registers each
        INAG_INIT[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, A0B1_VAR[i], A1B0_VAR[i]);
        INAG_INIT_NEG[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER, A0B1_NEG[i], A1B0_NEG[i]);
    }
    var REAL_CARRY[l][150];
    var IMAG_CARRY[l][150];
    var REAL_FINAL[l][150];
    var IMAG_FINAL[l][150];
    var zeros[150]; // to balance register sizes
    for (var i = 0; i < 150; i++) {
        zeros[i] = 0;
    }
    for (var i = 0; i < l; i++) {
        if (i == l - 1) {
            REAL_CARRY[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER + 1, zeros, zeros);
            IMAG_CARRY[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER + 1, zeros, zeros);
        } else {
            REAL_CARRY[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER + 1, REAL_INIT[i + l], INAG_INIT_NEG[i + l]); // now 2 * CHUNK_NUMBER + 2 registers
            IMAG_CARRY[i] = long_add(CHUNK_SIZE, 2 * CHUNK_NUMBER + 1, INAG_INIT[i + l], REAL_INIT[i + l]);
        }
    }
    for (var i = 0; i < l; i++) {
        REAL_FINAL[i] = long_add_unequal(CHUNK_SIZE, 2 * CHUNK_NUMBER + 2, 2 * CHUNK_NUMBER + 1, REAL_CARRY[i], REAL_INIT[i]); // now 2 * CHUNK_NUMBER + 3 registers
        IMAG_FINAL[i] = long_add_unequal(CHUNK_SIZE, 2 * CHUNK_NUMBER + 2, 2 * CHUNK_NUMBER + 1, IMAG_CARRY[i], INAG_INIT[i]);
    }
    var X_Y_REAL_TEMP[l][2][150];
    var X_Y_IMAG_TEMP[l][2][150];
    for (var i = 0; i < l; i++) {
        X_Y_REAL_TEMP[i] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER + 3, REAL_FINAL[i], p); // CHUNK_NUMBER+4 register quotient, CHUNK_NUMBER register remainder
        X_Y_IMAG_TEMP[i] = long_div2(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER + 3, IMAG_FINAL[i], p);
    }
    for (var i = 0; i < l; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            out[i][0][j] = X_Y_REAL_TEMP[i][1][j];
            out[i][1][j] = X_Y_IMAG_TEMP[i][1][j];
        }
    }
    return out;
}

// a is 6 x 2 x CHUNK_NUMBER element of Fp^12
// compute inverse. first multiply by conjugate a + bw (a,b in Fp^6, w^6=1+u, u^2=-1)
// then reduce to inverting in Fp^6
function find_Fp12_inverse(CHUNK_SIZE, CHUNK_NUMBER, p, a) {
    var A[6][2][150];
    var B[6][2][150];
    var BW[6][2][150];
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 2; j++) {
            for (var m = 0; m < CHUNK_NUMBER; m++) {
                A[2 * i + 1][j][m] = 0;
                B[2 * i + 1][j][m] = 0;
                A[2 * i][j][m] = a[2 * i][j][m];
                B[2 * i][j][m] = a[2 * i + 1][j][m];
                BW[2 * i][j][m] = 0;
                BW[2 * i + 1][j][m] = a[2 * i + 1][j][m];
            }
        }
    }
    var A2[6][2][150] = find_Fp12_product(CHUNK_SIZE, CHUNK_NUMBER, A, A, p);
    var B2[6][2][150] = find_Fp12_product(CHUNK_SIZE, CHUNK_NUMBER, B, B, p);
    var CONJ[6][2][150] = find_Fp12_diff(CHUNK_SIZE, CHUNK_NUMBER, A, BW, p);
    var W2[6][2][150];
    for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 2; j++) {
            for (var m = 0; m < CHUNK_NUMBER; m++) {
                if (i == 2 && j == 0 && m == 0) {
                    W2[i][j][m] = 1;
                } else {
                    W2[i][j][m] = 0;
                }
            }
        }
    }
    var B2_W2[6][2][150] = find_Fp12_product(CHUNK_SIZE, CHUNK_NUMBER, B2, W2, p);
    var CONJ_PROD[6][2][150] = find_Fp12_diff(CHUNK_SIZE, CHUNK_NUMBER, A2, B2_W2, p);
    var A0[2][150];
    var A1[2][150];
    var A2[2][150];
    for (var i = 0; i < 2; i++) {
        for (var m = 0; m < CHUNK_NUMBER; m++) {
            A0[i][m] = CONJ_PROD[0][i][m];
            A1[i][m] = CONJ_PROD[2][i][m];
            A2[i][m] = CONJ_PROD[4][i][m];
        }
    }
    var conjProdInv[6][2][150] = find_Fp6_inverse(CHUNK_SIZE, CHUNK_NUMBER, p, A0, A1, A2);
    var out[6][2][150] = find_Fp12_product(CHUNK_SIZE, CHUNK_NUMBER, CONJ, conjProdInv, p);
    return out;
}

// compute the inverse of A0 + a1v + a2v^2 in Fp6, where 
// v^3 = 1+u, u^2 = -1, A0 A1 A2 in Fp2 (2 x CHUNK_NUMBER)
// returns an element in standard Fp12 representation (6 x 2 x CHUNK_NUMBER)
function find_Fp6_inverse(CHUNK_SIZE, CHUNK_NUMBER, p, A0, A1, A2) {
    var out[6][2][150];

    var A0_SQUARED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0, A0, p);
    var A1_SQUARED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A1, A1, p);
    var A2_SQUARED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A2, A2, p);
    var A0_A1[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0, A1, p);
    var A0_A2[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0, A2, p);
    var A1_A2[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A1, A2, p);
    var A0_A1_A2[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0_A1, A2, p);

    var V3[2][150]; // v^3 = 1 + u
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            if (j == 0) {
                V3[i][j] = 1;
            } else {
                V3[i][j] = 0;
            }
        }
    }

    var THREE_V3[2][150]; // 3v^3 = 3 + 3u
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            if (j == 0) {
                THREE_V3[i][j] = 3;
            } else {
                THREE_V3[i][j] = 0;
            }
        }
    }

    var V6[2][150]; // v^6 = 2u
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            if (i == 1 && j == 0) {
                V6[i][j] = 2;
            } else {
                V6[i][j] = 0;
            }
        }
    }

    var V0_1[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A1_A2, V3, p);
    var V0_TEMP[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, A0_SQUARED, V0_1, p); // A0^2 - a1a2v^3
    var V1_1[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A2_SQUARED, V3, p);
    var V1_TEMP[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, V1_1, A0_A1, p); // v^3a2^2 - A0_A1
    var V2_TEMP[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, A1_SQUARED, A0_A2, p); // A1^2 - A0_A2

    var A0_CUBED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0, A0_SQUARED, p);
    var A1_CUBED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A1, A1_SQUARED, p);
    var A2_CUBED[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A2, A2_SQUARED, p);
    var A1_3V3[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A1_CUBED, V3, p);
    var A2_3V6[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A2_CUBED, V6, p);
    var A0_A1_A2_3V3[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, A0_A1_A2, THREE_V3, p);

    var DENOM_1[2][150] = find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, A0_CUBED, A1_3V3, p);
    var DENOM_2[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, A2_3V6, A0_A1_A2_3V3, p);
    var DENOM[2][150] = find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, DENOM_1, DENOM_2, p); // A0^3 + A1^3v^3 + A2^3v^6 - 3a0a1a2v^3

    var DENOM_INV[2][150] = find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, DENOM, p);

    var V0_FINAL[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, V0_TEMP, DENOM_INV, p);
    var V1_FINAL[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, V1_TEMP, DENOM_INV, p);
    var V2_FINAL[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, V2_TEMP, DENOM_INV, p);

    for (var i = 1; i < 6; i = i + 2) {
        for (var j = 0; j < 2; j++) {
            for (var m = 0; m < 150; m++) {
                if (i > 1){
                    out[i][j][m] = 0;
                } else { 
                    out[i][j][m] = 0;//V3[j][m];
                }
            }
        }
    }
    out[0] = V0_FINAL;
    out[2] = V1_FINAL;
    out[4] = V2_FINAL;
    return out;
}

