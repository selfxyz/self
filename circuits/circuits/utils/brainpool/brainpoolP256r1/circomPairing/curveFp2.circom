pragma circom 2.0.3;

include "circomlib/circuits/bitify.circom";

include "../../../bigInt/bigInt.circom";
include "../../../bigInt/bigIntFunc.circom";
include "./fp.circom";
include "./fp2.circom";
include "./fp12.circom";
include "./curve.circom";
include "./bls12_381Func.circom";

// in[i] = (x_i, y_i) 
// Implements constraint: (y_1 + y_3) * (x_2 - x_1) - (y_2 - y_1) * (x_1 - x_3) = 0 mod P
// used to show (x1, y1), (x2, y2), (x3, -y3) are co-linear
template PointOnLineFp2(CHUNK_SIZE, CHUNK_NUMBER, P) {
    signal input in[3][2][2][CHUNK_NUMBER]; 

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK2 = log_ceil(6 * CHUNK_NUMBER*CHUNK_NUMBER);
    assert(3 * CHUNK_SIZE + LOGK2 < 251);

    // AKA check point on line 
    component left = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, 2); // 3 x 2k - 1 registers abs val < 4k*2^{2n}
    for(var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            left.a[i][j] <== in[0][1][i][j] + in[2][1][i][j];
            left.b[i][j] <== in[1][0][i][j] - in[0][0][i][j];
        }
    }

    component right = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, 2); // 3 x 2k - 1 registers abs val < 2k*2^{2n}
    for(var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            right.a[i][j] <== in[1][1][i][j] - in[0][1][i][j];
            right.b[i][j] <== in[0][0][i][j] - in[2][0][i][j];
        }
    }
    
    component diffRed[2]; 
    diffRed[0] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + 2 * LOGK + 2);
    diffRed[1] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + 2 * LOGK + 1);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
        diffRed[0].in[i] <== left.out[0][i] - left.out[2][i] - right.out[0][i] + right.out[2][i];
        diffRed[1].in[i] <== left.out[1][i] - right.out[1][i]; 
    }
    // diffRed has CHUNK_NUMBER registers abs val < 6 * CHUNK_NUMBER^2 * 2^{3n} -- to see this, easier to use SignedFp2MultiplyNoCarry instead of BigMultShortLong2D 
    component diffMod[2];
    for (var j = 0; j < 2; j++) {
        diffMod[j] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, P);
        for (var i = 0; i < CHUNK_NUMBER; i++) {
            diffMod[j].in[i] <== diffRed[j].out[i];
        }
    }
}

// in = (x, y)
// Implements:
// x^3 + ax + B - y^2 = 0 mod P
// Assume: A, B in [0, 2^CHUNK_SIZE). A, B are complex 
template PointOnCurveFp2(CHUNK_SIZE, CHUNK_NUMBER, A, B, P){
    signal input in[2][2][CHUNK_NUMBER]; 

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil((2 * CHUNK_NUMBER - 1) * (4 * CHUNK_NUMBER*CHUNK_NUMBER) + 1);
    assert(4 * CHUNK_SIZE + LOGK3 < 251);

    // compute x^3, y^2 
    component xSq = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // 2k - 1 registers in [0, 2 * CHUNK_NUMBER*2^{2n}) 
    component ySq = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // 2k - 1 registers in [0, 2 * CHUNK_NUMBER*2^{2n}) 
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            xSq.a[i][j] <== in[0][i][j];
            xSq.b[i][j] <== in[0][i][j];
            ySq.a[i][j] <== in[1][i][j];
            ySq.b[i][j] <== in[1][i][j];
        }
    }
    component xCu = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2); // 3k - 2 registers in [0, 4 * CHUNK_NUMBER^2 * 2^{3n}) 
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2 * CHUNK_NUMBER - 1; j++) {
            xCu.a[i][j] <== xSq.out[i][j];
        }
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            xCu.b[i][j] <== in[0][i][j];
        }
    }

    // xCu + A x + B has 3k - 2 registers < (4k^2 + 1/2^CHUNK_SIZE + 1/2^2n)2^{3n} <= (4 * CHUNK_NUMBER^2 + 2/2^CHUNK_SIZE)2^{3n} 
    component cuRed[2];
    for (var j = 0; j < 2; j++) {
        cuRed[j] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, P, 4 * CHUNK_SIZE + 3 * LOGK + 4);
        for(var i = 0; i < 3 * CHUNK_NUMBER - 2; i++){
            if(i == 0) {
                if(j == 0)
                    cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][0][i] - A[1] * in[0][1][i] + B[j];
                else
                    cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][1][i] + A[1] * in[0][0][i] + B[j]; 
            }
            else{
                if(i < CHUNK_NUMBER){
                    if(j == 0)
                        cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][0][i] - A[1] * in[0][1][i];
                    else
                        cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][1][i] + A[1] * in[0][0][i]; 
                }
                else
                    cuRed[j].in[i] <== xCu.out[j][i];
            }
        }
    }
    // cuRed has CHUNK_NUMBER registers < (2k - 1) * (4 * CHUNK_NUMBER^2 + 2/2^CHUNK_SIZE)2^{4n} < 2^{4n + 3LOGK + 4}

    component ySqRed[2]; // CHUNK_NUMBER registers < 2k^2 * 2^{3n} 
    for (var i = 0; i < 2; i++) {
        ySqRed[i] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + 2 * LOGK + 1);
        for(var j = 0; j < 2 * CHUNK_NUMBER - 1; j++){
            ySqRed[i].in[j] <== ySq.out[i][j];
        }
    }

    component constraint[2];
    constraint[0] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, P);
    constraint[1] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, P);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        constraint[0].in[i] <== cuRed[0].out[i] - ySqRed[0].out[i]; 
        constraint[1].in[i] <== cuRed[1].out[i] - ySqRed[1].out[i];
    }
}

// in = x
// Implements:
// out = x^3 + ax + B mod P
// Assume: A, B are in Fp2, coefficients in [0, 2^CHUNK_SIZE)
template EllipticCurveFunction(CHUNK_SIZE, CHUNK_NUMBER, A, B, P){
    signal input in[2][CHUNK_NUMBER]; 
    signal output out[2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil((2 * CHUNK_NUMBER - 1) * (4 * CHUNK_NUMBER*CHUNK_NUMBER) + 1);
    assert(4 * CHUNK_SIZE + LOGK3 < 251);

    // compute x^3, y^2 
    component xSq = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // 2k - 1 registers in [0, 2 * CHUNK_NUMBER*2^{2n}) 
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            xSq.a[i][j] <== in[i][j];
            xSq.b[i][j] <== in[i][j];
        }
    }
    component xCu = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 2); // 3k - 2 registers in [0, 4 * CHUNK_NUMBER^2 * 2^{3n}) 
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 2 * CHUNK_NUMBER - 1; j++) {
            xCu.a[i][j] <== xSq.out[i][j];
        }
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            xCu.b[i][j] <== in[i][j];
        }
    }

    // xCu + A x + B has 3k - 2 registers < (4 * CHUNK_NUMBER^2 + 1)2^{3n} 
    component cuRed[2];
    for (var j = 0; j < 2; j++) {
        cuRed[j] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, P, 4 * CHUNK_SIZE + 3 * LOGK + 4);
        for(var i = 0; i < 3 * CHUNK_NUMBER - 2; i++){
            if(i == 0) {
                if(j == 0)
                    cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][i] - A[1] * in[1][i] + B[j];
                else
                    cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[1][i] + A[1] * in[0][i] + B[j]; 
            }
            else{
                if(i < CHUNK_NUMBER){
                    if(j == 0)
                        cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[0][i] - A[1] * in[1][i];
                    else
                        cuRed[j].in[i] <== xCu.out[j][i] + A[0] * in[1][i] + A[1] * in[0][i]; 
                }
                else
                    cuRed[j].in[i] <== xCu.out[j][i];
            }
        }
    }
    // cuRed has CHUNK_NUMBER registers < (2k - 1) * (4 * CHUNK_NUMBER^2 + 1)2^{4n} < 2^{4n + 3LOGK + 4}

    component carry = SignedFp2CarryModP(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, P);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++)
        carry.in[j][i] <== cuRed[j].out[i];
    
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++)
        out[j][i] <== carry.out[j][i];
}


// in[0] = (x_1, y_1), in[1] = (x_3, y_3) 
// Checks that the line between (x_1, y_1) and (x_3, -y_3) is equal to the tangent line to the elliptic curve at the point (x_1, y_1)
// Implements: 
// (y_1 + y_3) = lambda * (x_1 - x_3)
// where lambda = (3 x_1^2 + A)/(2 y_1) 
// Actual constraint is 2y_1 (y_1 + y_3) = (3 x_1^2 + A) (x_1 - x_3)
// A is complex 
template PointOnTangentFp2(CHUNK_SIZE, CHUNK_NUMBER, A, P){
    signal input in[2][2][2][CHUNK_NUMBER];
    
    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil((2 * CHUNK_NUMBER - 1) * (12*CHUNK_NUMBER*CHUNK_NUMBER) + 1);
    assert(4 * CHUNK_SIZE + LOGK3 < 251);
    component xSq = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, 2 * CHUNK_SIZE + 1 + LOGK); // 2k - 1 registers in [0, 2 * CHUNK_NUMBER*2^{2n}) 
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            xSq.a[i][j] <== in[0][0][i][j];
            xSq.b[i][j] <== in[0][0][i][j];
        }
    }
    component right = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 3); // 3k - 2 registers < 2(6 * CHUNK_NUMBER^2 + 2k/2^CHUNK_SIZE)*2^{3n} 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        if(i == 0) {
            right.a[0][i] <== 3 * xSq.out[0][i] + A[0]; // registers in [0, 3 * CHUNK_NUMBER*2^{2n} + 2^CHUNK_SIZE)  
            right.a[1][i] <== 3 * xSq.out[1][i] + A[1];
        }
        else {
            right.a[0][i] <== 3 * xSq.out[0][i];
            right.a[1][i] <== 3 * xSq.out[1][i];
        }
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        right.b[0][i] <== in[0][0][0][i] - in[1][0][0][i]; 
        right.b[1][i] <== in[0][0][1][i] - in[1][0][1][i];
    }
    
    component left = SignedFp2MultiplyNoCarryUnequal(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER, 2 * CHUNK_SIZE + 3 + LOGK); // 2k - 1 registers in [0, 8k * 2^{2n})
    for(var i = 0; i < CHUNK_NUMBER; i++){
        left.a[0][i] <== 2 * in[0][1][0][i];
        left.a[1][i] <== 2 * in[0][1][1][i];
        left.b[0][i] <== in[0][1][0][i] + in[1][1][0][i];
        left.b[1][i] <== in[0][1][1][i] + in[1][1][1][i];
    }
    
    // prime reduce right - left 
    component diffRed[2];
    for (var i = 0; i < 2; i++) {
        diffRed[i] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, P, 4 * CHUNK_SIZE + LOGK3);
        for (var j = 0; j < 3 * CHUNK_NUMBER - 2; j++) {
            if (j < 2 * CHUNK_NUMBER - 1) {
                diffRed[i].in[j] <== right.out[i][j] - left.out[i][j];
            }
            else {
                diffRed[i].in[j] <== right.out[i][j];
            }
        }
    }
    // inputs of diffRed has registers < (12k^2 + 12k/2^CHUNK_SIZE)*2^{3n} 
    // diffRed.out has registers < ((2k - 1)*12k^2 + 1) * 2^{4n} assuming 12k(2k - 1) <= 2^CHUNK_SIZE
    component constraint[2];
    for (var i = 0; i < 2; i++) {
        constraint[i] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3, P);
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            constraint[i].in[j] <== diffRed[i].out[j];
        }
    }
}

// requires x_1 != x_2
// assume P is size CHUNK_NUMBER array, the prime that curve lives over 
//
// Implements:
//  Given A = (x_1, y_1) and B = (x_2, y_2), 
//      assume x_1 != x_2 and A != -B, 
//  Find A + B = (x_3, y_3)
// By solving:
//  x_1 + x_2 + x_3 - lambda^2 = 0 mod P
//  y_3 = lambda (x_1 - x_3) - y_1 mod P
//  where lambda = (y_2-y_1)/(x_2-x_1) is the slope of the line between (x_1, y_1) and (x_2, y_2)
// these equations are equivalent to:
//  (x_1 + x_2 + x_3) * (x_2 - x_1)^2 = (y_2 - y_1)^2 mod P
//  (y_1 + y_3) * (x_2 - x_1) = (y_2 - y_1) * (x_1 - x_3) mod P
template EllipticCurveAddUnequalFp2(CHUNK_SIZE, CHUNK_NUMBER, P) { 
    signal input a[2][2][CHUNK_NUMBER];
    signal input b[2][2][CHUNK_NUMBER];

    signal output out[2][2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil((12*CHUNK_NUMBER*CHUNK_NUMBER) * (2 * CHUNK_NUMBER - 1) + 1); 
    assert(4 * CHUNK_SIZE + LOGK3 + 2< 251);

    // precompute lambda and x_3 and then y_3
    var dy[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, B[1], A[1], P);
    var dx[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, B[0], A[0], P); 
    var dx_inv[2][150] = find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, dx, P);
    var lambda[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, dy, dx_inv, P);
    var lambda_sq[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, lambda, lambda, P);
    // out[0] = x_3 = lamb^2 - A[0] - B[0] % P
    // out[1] = y_3 = lamb * (A[0] - x_3) - A[1] % P
    var x3[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, lambda_sq, A[0], P), B[0], P);
    var y3[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, lambda, find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, A[0], x3, P), P), A[1], P);

    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][0][i] <-- x3[0][i];
        out[0][1][i] <-- x3[1][i];
        out[1][0][i] <-- y3[0][i];
        out[1][1][i] <-- y3[1][i];
    }
    
    // constrain x_3 by CUBIC (x_1 + x_2 + x_3) * (x_2 - x_1)^2 - (y_2 - y_1)^2 = 0 mod P
    
    component dx_sq = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, 2); // 2k - 1 registers abs val < 2k*2^{2n} 
    component dy_sq = BigMultShortLong2D(CHUNK_SIZE, CHUNK_NUMBER, 2); // 2k - 1 registers abs val < 2k*2^{2n}
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < CHUNK_NUMBER; j++) {
            dx_sq.a[i][j] <== B[0][i][j] - A[0][i][j];
            dx_sq.b[i][j] <== B[0][i][j] - A[0][i][j];
            dy_sq.a[i][j] <== B[1][i][j] - A[1][i][j];
            dy_sq.b[i][j] <== B[1][i][j] - A[1][i][j];
        }
    }

    // x_1 + x_2 + x_3 has registers in [0, 3 * 2^CHUNK_SIZE) 
    component cubic = BigMultShortLong2DUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, 2, 2); // 3k - 2 x 3 registers < 12 * CHUNK_NUMBER^2 * 2^{3n}) 
    for(var i = 0; i < CHUNK_NUMBER; i++) {
        cubic.a[0][i] <== A[0][0][i] + B[0][0][i] + out[0][0][i]; 
        cubic.a[1][i] <== A[0][1][i] + B[0][1][i] + out[0][1][i];
    }
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        cubic.b[0][i] <== dx_sq.out[0][i] - dx_sq.out[2][i];
        cubic.b[1][i] <== dx_sq.out[1][i];
    }

    component cubic_red[2];
    cubic_red[0] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, P, 4 * CHUNK_SIZE + LOGK3 + 2);
    cubic_red[1] = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 2, P, 4 * CHUNK_SIZE + LOGK3 + 2);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++) {
        // get i^2 parts too!
        cubic_red[0].in[i] <== cubic.out[0][i] - cubic.out[2][i] - dy_sq.out[0][i] + dy_sq.out[2][i]; // registers abs val < 12*CHUNK_NUMBER^2 * 2^{3n} + 2k*2^{2n} <= (12k^2 + 2k/2^CHUNK_SIZE) * 2^{3n}
        cubic_red[1].in[i] <== cubic.out[1][i] - dy_sq.out[1][i]; // registers in < 12*CHUNK_NUMBER^2 * 2^{3n} + 4k*2^{2n} < (12k + 1)CHUNK_NUMBER * 2^{3n})
    }
    for(var i=2 * CHUNK_NUMBER - 1; i < 3 * CHUNK_NUMBER - 2; i++) {
        cubic_red[0].in[i] <== cubic.out[0][i] - cubic.out[2][i]; 
        cubic_red[1].in[i] <== cubic.out[1][i];
    }
    // cubic_red has CHUNK_NUMBER registers < ((2k - 1)*12k^2 + 1) * 2^{4n} assuming 2k(2k - 1) <= 2^CHUNK_SIZE
    
    component cubic_mod[2];
    cubic_mod[0] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3 + 2, P);
    cubic_mod[1] = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4 * CHUNK_SIZE + LOGK3 + 2, P);
    for(var i = 0; i < CHUNK_NUMBER; i++) {
        cubic_mod[0].in[i] <== cubic_red[0].out[i];
        cubic_mod[1].in[i] <== cubic_red[1].out[i];
    }
    // END OF CONSTRAINING x3
    
    // constrain y_3 by (y_1 + y_3) * (x_2 - x_1) = (y_2 - y_1) * (x_1 - x_3) mod P
    component y_constraint = PointOnLineFp2(CHUNK_SIZE, CHUNK_NUMBER, P); 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        for(var j = 0; j < 2; j++){
            for(var ind = 0; ind < 2; ind++) {
                y_constraint.in[0][j][ind][i] <== A[j][ind][i];
                y_constraint.in[1][j][ind][i] <== B[j][ind][i];
                y_constraint.in[2][j][ind][i] <== out[j][ind][i];
            }
        }
    }
    // END OF CONSTRAINING y3

    // check if out[][] has registers in [0, 2^CHUNK_SIZE)
    component range_check[2];
    range_check[0] = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    range_check[1] = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    for(var j = 0; j < 2; j++){
        for(var i = 0; i < CHUNK_NUMBER; i++) {
            range_check[0].in[j][i] <== out[0][j][i];
            range_check[1].in[j][i] <== out[1][j][i];
        }
    }
}

// Elliptic curve is E : y**2 = x**3 + ax + B
// assuming A < 2^CHUNK_SIZE for now, B is complex
// Note that for BLS12-381 twisted, A = 0, B = 4+4u

// Implements:
// computing 2P on elliptic curve E for P = (x_1, y_1)
// formula from https://crypto.stanford.edu/pbc/notes/elliptic/explicit.html
// x_1 = in[0], y_1 = in[1]
// assume y_1 != 0 (otherwise 2P = O)

// lamb =  (3x_1^2 + A) / (2 y_1) % P
// x_3 = out[0] = lambda^2 - 2 x_1 % P
// y_3 = out[1] = lambda (x_1 - x_3) - y_1 % P

// We precompute (x_3, y_3) and then constrain by showing that:
// * (x_3, y_3) is A valid point on the curve 
// * the slope (y_3 - y_1)/(x_3 - x_1) equals 
// * x_1 != x_3 
template EllipticCurveDoubleFp2(CHUNK_SIZE, CHUNK_NUMBER, A, B, P) {
    signal input in[2][2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER];

    var long_a[2][CHUNK_NUMBER];
    var long_3[2][CHUNK_NUMBER];
    long_a[0][0] = A[0];
    long_3[0][0] = 3;
    long_a[1][0] = A[1];
    long_3[1][0] = 0;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        long_a[0][i] = 0;
        long_3[0][i] = 0;
        long_a[1][i] = 0;
        long_3[1][i] = 0;
    }

    // precompute lambda 
    var lamb_num[2][150] = find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, long_a, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, long_3, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, in[0], in[0], P), P), P);
    var lamb_denom[2][150] = find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, in[1], in[1], P);
    var lamb[2][150] = find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, lamb_num, find_Fp2_inverse(CHUNK_SIZE, CHUNK_NUMBER, lamb_denom, P), P);

    // precompute x_3, y_3
    var x3[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, lamb, lamb, P), find_Fp2_sum(CHUNK_SIZE, CHUNK_NUMBER, in[0], in[0], P), P);
    var y3[2][150] = find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, find_Fp2_product(CHUNK_SIZE, CHUNK_NUMBER, lamb, find_Fp2_diff(CHUNK_SIZE, CHUNK_NUMBER, in[0], x3, P), P), in[1], P);
    
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][0][i] <-- x3[0][i];
        out[0][1][i] <-- x3[1][i];
        out[1][0][i] <-- y3[0][i];
        out[1][1][i] <-- y3[1][i];
    }
    // check if out[][] has registers in [0, 2^CHUNK_SIZE)
    component range_check[2];
    range_check[0] = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    range_check[1] = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    for(var j = 0; j < 2; j++){
        for(var i = 0; i < CHUNK_NUMBER; i++) {
            range_check[0].in[j][i] <== out[0][j][i];
            range_check[1].in[j][i] <== out[1][j][i];
        }
    }

    component point_on_tangent = PointOnTangentFp2(CHUNK_SIZE, CHUNK_NUMBER, A, P);
    for(var j = 0; j < 2; j++){
        for(var i = 0; i < CHUNK_NUMBER; i++){
            point_on_tangent.in[0][j][0][i] <== in[j][0][i];
            point_on_tangent.in[0][j][1][i] <== in[j][1][i];
            point_on_tangent.in[1][j][0][i] <== out[j][0][i];
            point_on_tangent.in[1][j][1][i] <== out[j][1][i];
        }
    }
    
    component point_on_curve = PointOnCurveFp2(CHUNK_SIZE, CHUNK_NUMBER, A, B, P);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++) {
        point_on_curve.in[j][0][i] <== out[j][0][i];
        point_on_curve.in[j][1][i] <== out[j][1][i];
    }
    
    component x3_eq_x1 = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++){
        x3_eq_x1.a[j][i] <== out[0][j][i];
        x3_eq_x1.b[j][i] <== in[0][j][i];
    }
    x3_eq_x1.out === 0;
}

// Fp2 curve y^2 = x^3 + A2*x + B2 with B2 complex
// Assume curve has no Fp2 points of order 2, i.e., x^3 + A2*x + B2 has no Fp2 roots
// Fact: ^ this is the case for BLS12-381 twisted E2 and its 3-isogeny E2'
// If isInfinity = 1, replace `out` with `A` so if `A` was on curve, so is output
template EllipticCurveAddFp2(CHUNK_SIZE, CHUNK_NUMBER, A2, B2, P){
    signal input a[2][2][CHUNK_NUMBER];
    signal input aIsInfinity;
    signal input b[2][2][CHUNK_NUMBER];
    signal input bIsInfinity;
    
    signal output out[2][2][CHUNK_NUMBER];
    signal output isInfinity;

    component xEqual = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
    component yEqual = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);

    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            xEqual.a[i][idx] <== A[0][i][idx];
            xEqual.b[i][idx] <== B[0][i][idx];

            yEqual.a[i][idx] <== A[1][i][idx];
            yEqual.b[i][idx] <== B[1][i][idx];
        }
    }
    // if A.x = B.x then A = +-B 
    // if A = B then A + B = 2 * A so we need to do point doubling  
    // if A = -A then out is infinity
    signal addIsDouble;
    addIsDouble <== xEqual.out * yEqual.out; // AND gate
    
    // if A.x = B.x, need to replace B.x by A different number just so AddUnequal doesn't break
    // I will do this in A dumb way: replace B[0][0][0] by (B[0][0][0] == 0)
    component isZero = IsZero(); 
    isZero.in <== B[0][0][0]; 
    
    component add = EllipticCurveAddUnequalFp2(CHUNK_SIZE, CHUNK_NUMBER, P);
    component doub = EllipticCurveDoubleFp2(CHUNK_SIZE, CHUNK_NUMBER, A2, B2, P);
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                add.a[i][j][idx] <== A[i][j][idx];
                if(i == 0 && j == 0 && idx == 0){
                    add.b[i][j][idx] <== B[i][j][idx] + xEqual.out * (isZero.out - B[i][j][idx]); 
                } else {
                    add.b[i][j][idx] <== B[i][j][idx]; 
                }
                doub.in[i][j][idx] <== A[i][j][idx];
            }
        }
    }
    
    // out = O iff (A = O AND B = O) OR (A != 0 AND B != 0) AND (xEqual AND NOT yEqual) 
    signal ab0;
    ab0 <== aIsInfinity * bIsInfinity; 
    signal abNon0;
    abNon0 <== (1 - aIsInfinity) * (1 - bIsInfinity);
    signal aNegB;
    aNegB <== xEqual.out - xEqual.out * yEqual.out; 
    signal inverse;
    inverse <== abNon0 * aNegB;
    isInfinity <== ab0 + inverse - ab0 * inverse; // OR gate


    signal tmp[3][2][2][CHUNK_NUMBER]; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                tmp[0][i][j][idx] <== add.out[i][j][idx] + addIsDouble * (doub.out[i][j][idx] - add.out[i][j][idx]); 
                // if A = O, then A + B = B 
                tmp[1][i][j][idx] <== tmp[0][i][j][idx] + aIsInfinity * (B[i][j][idx] - tmp[0][i][j][idx]);
                // if B = O, then A + B = A
                tmp[2][i][j][idx] <== tmp[1][i][j][idx] + bIsInfinity * (A[i][j][idx] - tmp[1][i][j][idx]);
                out[i][j][idx] <== tmp[2][i][j][idx] + isInfinity * (A[i][j][idx] - tmp[2][i][j][idx]);
            }
        }
    }
}


// Curve E2 : y^2 = x^3 + B
// Inputs:
//  in = P is 2 x 2 x CHUNK_NUMBER array where P = (x, y) is A point in E2(Fp2) 
//  inIsInfinity = 1 if P = O, else = 0
// Output:
//  out = [x]P is 2 x 2 x CHUNK_NUMBER array representing A point in E2(Fp2)
//  isInfinity = 1 if [x]P = O, else = 0
// Assume:
//  E2 has no Fp2 points of order 2
//  x in [0, 2^250) 
//  `in` is point in E2 even if inIsInfinity = 1 just so nothing goes wrong
//  E2(Fp2) has no points of order 2
template EllipticCurveScalarMultiplyFp2(CHUNK_SIZE, CHUNK_NUMBER, B, x, P){
    signal input in[2][2][CHUNK_NUMBER];
    signal input inIsInfinity;

    signal output out[2][2][CHUNK_NUMBER];
    signal output isInfinity;

    var LOGK = log_ceil(CHUNK_NUMBER);
        
    var BITS[250]; 
    var BITS_LENGTH;
    var SIG_BITS = 0;
    for (var i = 0; i < 250; i++) {
        BITS[i] = (x >> i) & 1;
        if(BITS[i] == 1){
            SIG_BITS++;
            BITS_LENGTH = i + 1;
        }
    }

    signal r[BITS_LENGTH][2][2][CHUNK_NUMBER]; 
    signal rIsO[BITS_LENGTH]; 
    component pDouble[BITS_LENGTH];
    component pAdd[SIG_BITS];
    var CUR_ID = 0;

    // if in = O then [x]O = O so there's no point to any of this
    signal P[2][2][CHUNK_NUMBER];
    for(var j = 0; j < 2; j++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            for(var l = 0; l < 2; l++){
                P[j][l][idx] <== in[j][l][idx];
            }
        }
    }
    
    for(var i = BITS_LENGTH - 1; i >= 0; i--){
        if(i == BITS_LENGTH - 1){
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    for(var l = 0; l < 2; l++){
                        r[i][j][l][idx] <== P[j][l][idx];
                    }
                }
            }
            rIsO[i] <== 0; 
        } else {
            // E2(Fp2) has no points of order 2, so the only way 2 * r[i + 1] = O is if r[i + 1] = O 
            pDouble[i] = EllipticCurveDoubleFp2(CHUNK_SIZE, CHUNK_NUMBER, [0,0], B, P);  
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    for(var l = 0; l < 2; l++){
                        pDouble[i].in[j][l][idx] <== r[i + 1][j][l][idx]; 
                    }
                }
            }
            if(BITS[i] == 0){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        for(var l = 0; l < 2; l++){
                            r[i][j][l][idx] <== pDouble[i].out[j][l][idx];
                        }
                    }
                }
                rIsO[i] <== rIsO[i + 1]; 
            } else {
                // pAdd[CUR_ID] = pDouble[i] + P 
                pAdd[CUR_ID] = EllipticCurveAddFp2(CHUNK_SIZE, CHUNK_NUMBER, [0,0], B, P); 
                for(var j = 0; j < 2; j++){
                    for(var l = 0; l < 2; l++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            pAdd[CUR_ID].a[j][l][idx] <== pDouble[i].out[j][l][idx]; 
                            pAdd[CUR_ID].b[j][l][idx] <== P[j][l][idx];
                        }
                    }
                }
                pAdd[CUR_ID].aIsInfinity <== rIsO[i + 1];
                pAdd[CUR_ID].bIsInfinity <== 0;

                rIsO[i] <== pAdd[CUR_ID].isInfinity; 
                for(var j = 0; j < 2; j++){
                    for(var l = 0; l < 2; l++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            r[i][j][l][idx] <== pAdd[CUR_ID].out[j][l][idx];
                        }
                    }
                }
                CUR_ID++;
            }
        }
    }
    // output = O if input = O or r[0] = O 
    isInfinity <== inIsInfinity + rIsO[0] - inIsInfinity * rIsO[0]; 
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== r[0][i][j][idx] + isInfinity * (in[i][j][idx] - r[0][i][j][idx]);
            }
        }
    }
}


// Curve E2 : y^2 = x^3 + B
// Inputs:
//  in = P is 2 x 2 x CHUNK_NUMBER array where P = (x, y) is A point in E2(Fp2) 
// Output:
//  out = [x]P is 2 x 2 x CHUNK_NUMBER array representing A point in E2(Fp2)
// Assume:
//  E2 has no Fp2 points of order 2 
//  x in [0, 2^250) 
//  P has order > x, so in double-and-add loop we never hit point at infinity, and only add unequal is allowed: constraint will fail if add unequal fails 
template EllipticCurveScalarMultiplyUnequalFp2(CHUNK_SIZE, CHUNK_NUMBER, B, x, P){
    signal input in[2][2][CHUNK_NUMBER];
    signal output out[2][2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
        
    var BITS[250]; 
    var BITS_LENGTH;
    var SIG_BITS = 0;
    for (var i = 0; i < 250; i++) {
        BITS[i] = (x >> i) & 1;
        if(BITS[i] == 1){
            SIG_BITS++;
            BITS_LENGTH = i + 1;
        }
    }

    signal r[BITS_LENGTH][2][2][CHUNK_NUMBER]; 
    component pDouble[BITS_LENGTH];
    component pAdd[SIG_BITS];
    component addException[SIG_BITS];
    var CUR_ID = 0;

    for(var i = BITS_LENGTH - 1; i >= 0; i--){
        if(i == BITS_LENGTH - 1){
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    for(var l = 0; l < 2; l++){
                        r[i][j][l][idx] <== in[j][l][idx];
                    }
                }
            }
        } else {
            // Assuming E2 has no points of order 2, so double never fails 
            // To remove this assumption, just add A check that pDouble[i].y != 0
            pDouble[i] = EllipticCurveDoubleFp2(CHUNK_SIZE, CHUNK_NUMBER, [0,0], B, P);  
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    for(var l = 0; l < 2; l++){
                        pDouble[i].in[j][l][idx] <== r[i + 1][j][l][idx];
                    }
                }
            }
            
            if(BITS[i] == 0){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        for(var l = 0; l < 2; l++){
                            r[i][j][l][idx] <== pDouble[i].out[j][l][idx];
                        }
                    }
                }
            } else {
                // Constrain pDouble[i].x != P.x 
                addException[CUR_ID] = Fp2IsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        addException[CUR_ID].a[j][idx] <== pDouble[i].out[0][j][idx];
                        addException[CUR_ID].b[j][idx] <== in[0][j][idx];
                    }
                }
                addException[CUR_ID].out === 0;
        
                // pAdd[CUR_ID] = pDouble[i] + P 
                pAdd[CUR_ID] = EllipticCurveAddUnequalFp2(CHUNK_SIZE, CHUNK_NUMBER, P); 
                for(var j = 0; j < 2; j++){
                    for(var l = 0; l < 2; l++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            pAdd[CUR_ID].a[j][l][idx] <== pDouble[i].out[j][l][idx]; 
                            pAdd[CUR_ID].b[j][l][idx] <== in[j][l][idx];
                        }
                    }
                }
                for(var j = 0; j < 2; j++){
                    for(var l = 0; l < 2; l++){
                        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                            r[i][j][l][idx] <== pAdd[CUR_ID].out[j][l][idx];
                        }
                    }
                }

                CUR_ID++;
            }
        }
    }
    for(var i = 0; i < 2; i++){
        for(var j = 0; j < 2; j++){
            for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                out[i][j][idx] <== r[0][i][j][idx];
            }
        }
    }
}