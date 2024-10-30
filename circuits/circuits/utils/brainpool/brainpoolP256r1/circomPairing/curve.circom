pragma circom 2.0.3;

include "circomlib/circuits/bitify.circom";
include "fp2.circom";

// in[i] = (x_i, y_i) 
// Implements constraint: (y_1 + y_3) * (x_2 - x_1) - (y_2 - y_1)*(x_1 - x_3) = 0 mod P
// used to show (x1, y1), (x2, y2), (X3, -Y3) are co-linear
template PointOnLine(CHUNK_SIZE, CHUNK_NUMBER, P) {
    signal input in[3][2][CHUNK_NUMBER]; 

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK2 = log_ceil(3 * CHUNK_NUMBER*CHUNK_NUMBER);
    assert(3 * CHUNK_SIZE + LOGK2 < 251);

    // AKA check point on line 
    component left = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK + 1); // 2k - 1 registers abs val < 2k*2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        left.a[i] <== in[0][1][i] + in[2][1][i];
        left.b[i] <== in[1][0][i] - in[0][0][i]; 
    }

    component right = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK); // 2k - 1 registers abs val < CHUNK_NUMBER*2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        right.a[i] <== in[1][1][i] - in[0][1][i];
        right.b[i] <== in[0][0][i] - in[2][0][i];
    }
    
    component diffRed; 
    diffRed = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + LOGK2);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        diffRed.in[i] <== left.out[i] - right.out[i];  

    // diffRed has CHUNK_NUMBER registers abs val < 3 * CHUNK_NUMBER^2 * 2^{3n}
    component diffMod = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 3 * CHUNK_SIZE + LOGK2, P);
    for(var i = 0; i < CHUNK_NUMBER; i++)
        diffMod.in[i] <== diffRed.out[i]; 
}

// in = (x, y)
// Implements:~
// x^3 + aX + b - y^2 = 0 mod P
// Assume: a, b in [0, 2^CHUNK_SIZE) 
template PointOnCurve(CHUNK_SIZE, CHUNK_NUMBER, a, b, P){
    signal input in[2][CHUNK_NUMBER]; 

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK2 = log_ceil( (2 * CHUNK_NUMBER - 1)*(CHUNK_NUMBER*CHUNK_NUMBER + 1) );
    assert(4*CHUNK_SIZE + LOGK2 < 251);

    // compute x^3, y^2 
    component xSq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK); // 2k - 1 registers in [0, CHUNK_NUMBER*2^{2n}) 
    component ySq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK); // 2k - 1 registers in [0, CHUNK_NUMBER*2^{2n}) 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        xSq.a[i] <== in[0][i];
        xSq.b[i] <== in[0][i];

        ySq.a[i] <== in[1][i];
        ySq.b[i] <== in[1][i];
    }
    component xCu = BigMultShortLongUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK); // 3k-2 registers in [0, CHUNK_NUMBER^2 * 2^{3n}) 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        xCu.a[i] <== xSq.out[i];
    for(var i = 0; i < CHUNK_NUMBER; i++)
        xCu.b[i] <== in[0][i];

    component aX = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK); // 2k - 1 registers in [0, CHUNK_NUMBER*2^{2n})
    for (var i = 0; i < CHUNK_NUMBER; i++) {
        aX.a[i] <== a[i];
        aX.b[i] <== in[0][i];
    }

    // xCu + a x + b has 3k-2 positive registers < CHUNK_NUMBER^2 * 2^{3n} + 2^{2n} + 2^CHUNK_SIZE < (CHUNK_NUMBER^2 + 1) * 2^{3n} 
    component cuRed = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER-2, P, 4*CHUNK_SIZE + 3 * LOGK + 1);
    for(var i = 0; i<3 * CHUNK_NUMBER-2; i++){
        if (i < CHUNK_NUMBER) {
            cuRed.in[i] <== xCu.out[i] + aX.out[i] + b[i];
        } else {
            if (i < 2 * CHUNK_NUMBER - 1) {
                cuRed.in[i] <== xCu.out[i] + aX.out[i];
            } else {
                cuRed.in[i] <== xCu.out[i];
            }
        }
    }
    // cuRed has CHUNK_NUMBER registers < (CHUNK_NUMBER^2 + 1)*(2k - 1)*2^{4n}

    component ySqRed = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, CHUNK_NUMBER - 1, P, 3 * CHUNK_SIZE + 2 * LOGK + 1);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        ySqRed.in[i] <== ySq.out[i]; 
    // ySqRed has positive registers, so when we subtract from cuRed it doesn't increase absolute value

    component constraint = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4*CHUNK_SIZE + LOGK2, P);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        constraint.in[i] <== cuRed.out[i] - ySqRed.out[i]; 
    }
}

// in[0] = (x_1, y_1), in[1] = (x_3, y_3) 
// Checks that the line between (x_1, y_1) and (x_3, -y_3) is equal to the tangent line to the elliptic curve at the point (x_1, y_1)
// Implements: 
// (y_1 + y_3) = LAMBDA * (x_1 - x_3)
// where LAMBDA = (3 x_1^2 + a)/(2 y_1) 
// Actual constraint is 2y_1 (y_1 + y_3) = (3 x_1^2 + a ) ( x_1 - x_3 )
template PointOnTangent(CHUNK_SIZE, CHUNK_NUMBER, a, P){
    signal input in[2][2][CHUNK_NUMBER];
    
    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil((3 * CHUNK_NUMBER)*(2 * CHUNK_NUMBER - 1) + 1);
    assert(4*CHUNK_SIZE + LOGK3 < 251);
    component xSq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + LOGK); // 2k - 1 registers < CHUNK_NUMBER*2^{2n}) 
    for(var i = 0; i < CHUNK_NUMBER; i++){
        xSq.a[i] <== in[0][0][i];
        xSq.b[i] <== in[0][0][i];
    }
    component right = BigMultShortLongUnequal(CHUNK_SIZE, 2 * CHUNK_NUMBER - 1, CHUNK_NUMBER, 3 * CHUNK_SIZE + 2 * LOGK + 3); // 3k-2 registers < (3 * CHUNK_NUMBER + 1)*CHUNK_NUMBER*2^{3n} 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        if (i < CHUNK_NUMBER) {
            right.a[i] <== 3 * xSq.out[i] + a[i]; // registers in [0, 3 * CHUNK_NUMBER*2^{2n} + 2^CHUNK_SIZE = (3k+2^{-CHUNK_SIZE})*2^{2n})
        } else {
            right.a[i] <== 3 * xSq.out[i];
        }
    }
    for(var i = 0; i < CHUNK_NUMBER; i++){
        right.b[i] <== in[0][0][i] - in[1][0][i]; 
    }
    
    component left = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE + 2 + LOGK); // 2k - 1 registers in [0, 4k * 2^{2n})
    for(var i = 0; i < CHUNK_NUMBER; i++){
        left.a[i] <== 2 * in[0][1][i];
        left.b[i] <== in[0][1][i] + in[1][1][i];  
    }
    
    // prime reduce right - left 
    component diffRed = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER-2, P, 4*CHUNK_SIZE + LOGK3);
    for(var i = 0; i<3 * CHUNK_NUMBER-2; i++){
        if(i < 2 * CHUNK_NUMBER - 1) 
            diffRed.in[i] <== right.out[i] - left.out[i]; 
        else
            diffRed.in[i] <== right.out[i];
    }
    // inputs of diffRed has registers < (3k+2^{-CHUNK_SIZE})CHUNK_NUMBER*2^{3n} + 4k*2^{2n} < (3k^2 + 1)*2^{3n} assuming 5k <= 2^CHUNK_SIZE 
    // diffRed.out has registers < (3k + 1)*(2k - 1) * 2^{4n}
    component constraint = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4*CHUNK_SIZE + LOGK3, P);
    for(var i = 0; i < CHUNK_NUMBER; i++)
        constraint.in[i] <== diffRed.out[i];
}

// requires x_1 != x_2
// assume P is size CHUNK_NUMBER array, the prime that curve lives over 
//
// Implements:
//  Given a = (x_1, y_1) and b = (x_2, y_2), 
//      assume x_1 != x_2 and a != -b, 
//  Find a + b = (x_3, y_3)
// By solving:
//  x_1 + x_2 + x_3 - LAMBDA^2 = 0 mod P
//  y_3 = LAMBDA (x_1 - x_3) - y_1 mod P
//  where LAMBDA = (y_2-y_1)/(x_2-x_1) is the slope of the line between (x_1, y_1) and (x_2, y_2)
// these equations are equivalent to:
//  (x_1 + x_2 + x_3)*(x_2 - x_1)^2 = (y_2 - y_1)^2 mod P
//  (y_1 + y_3)*(x_2 - x_1) = (y_2 - y_1)*(x_1 - x_3) mod P
template EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, P) { 
    signal input a[2][CHUNK_NUMBER];
    signal input b[2][CHUNK_NUMBER];

    signal output out[2][CHUNK_NUMBER];

    var LOGK = log_ceil(CHUNK_NUMBER);
    var LOGK3 = log_ceil( (3 * CHUNK_NUMBER*CHUNK_NUMBER)*(2 * CHUNK_NUMBER - 1) + 1 ); 
    assert(4*CHUNK_SIZE + LOGK3 < 251);

    // precompute LAMBDA and x_3 and then y_3
    var DY[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, b[1], a[1], P);
    var DX[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, b[0], a[0], P); 
    var DX_INV[150] = mod_inv(CHUNK_SIZE, CHUNK_NUMBER, DX, P);
    var LAMBDA[150] = prod_mod(CHUNK_SIZE, CHUNK_NUMBER, DY, DX_INV, P);
    var LAMBDA_SQ[150] = prod_mod(CHUNK_SIZE, CHUNK_NUMBER, LAMBDA, LAMBDA, P);
    // out[0] = x_3 = LAMB^2 - a[0] - b[0] % P
    // out[1] = y_3 = LAMB * (a[0] - x_3) - a[1] % P
    var X3[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, LAMBDA_SQ, a[0], P), b[0], P);
    var Y3[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, LAMBDA, long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, a[0], X3, P), P), a[1], P);

    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] <-- X3[i];
        out[1][i] <-- Y3[i];
    }
    
    // constrain x_3 by CUBIC (x_1 + x_2 + x_3) * (x_2 - x_1)^2 - (y_2 - y_1)^2 = 0 mod P
    
    component dxSq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE+LOGK+2); // 2k - 1 registers abs val < CHUNK_NUMBER*2^{2n} 
    component dySq = BigMultShortLong(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_SIZE+LOGK+2); // 2k - 1 registers < CHUNK_NUMBER*2^{2n}
    for(var i = 0; i < CHUNK_NUMBER; i++){
        dxSq.a[i] <== b[0][i] - a[0][i];
        dxSq.b[i] <== b[0][i] - a[0][i];

        dySq.a[i] <== b[1][i] - a[1][i];
        dySq.b[i] <== b[1][i] - a[1][i];
    } 

    // x_1 + x_2 + x_3 has registers in [0, 3 * 2^CHUNK_SIZE) 
    component cubic = BigMultShortLongUnequal(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER - 1, 3 * CHUNK_SIZE+4+2 * LOGK); // 3k-2 registers < 3 * CHUNK_NUMBER^2 * 2^{3n} ) 
    for(var i = 0; i < CHUNK_NUMBER; i++)
        cubic.a[i] <== a[0][i] + b[0][i] + out[0][i]; 
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++){
        cubic.b[i] <== dxSq.out[i];
    }

    component cubicRed = PrimeReduce(CHUNK_SIZE, CHUNK_NUMBER, 2 * CHUNK_NUMBER-2, P, 4*CHUNK_SIZE + LOGK3);
    for(var i = 0; i < 2 * CHUNK_NUMBER - 1; i++)
        cubicRed.in[i] <== cubic.out[i] - dySq.out[i]; // registers abs val < 3k^2 * 2^{3n} + CHUNK_NUMBER*2^{2n} < (3k^2 + 1)2^{3n}
    for(var i=2 * CHUNK_NUMBER - 1; i<3 * CHUNK_NUMBER-2; i++)
        cubicRed.in[i] <== cubic.out[i]; 
    // cubicRed has CHUNK_NUMBER registers < (3k^2 + 1)(2k - 1) * 2^{4n}
    
    component cubicMod = SignedCheckCarryModToZero(CHUNK_SIZE, CHUNK_NUMBER, 4*CHUNK_SIZE + LOGK3, P);
    for(var i = 0; i < CHUNK_NUMBER; i++)
        cubicMod.in[i] <== cubicRed.out[i]; 
    // END OF CONSTRAINING X3
    
    // constrain y_3 by (y_1 + y_3) * (x_2 - x_1) = (y_2 - y_1)*(x_1 - x_3) mod P
    component yConstraint = PointOnLine(CHUNK_SIZE, CHUNK_NUMBER, P); // 2k - 1 registers in [0, CHUNK_NUMBER*2^{2n + 1})
    for(var i = 0; i < CHUNK_NUMBER; i++)for(var j = 0; j < 2; j++){
        yConstraint.in[0][j][i] <== a[j][i];
        yConstraint.in[1][j][i] <== b[j][i];
        yConstraint.in[2][j][i] <== out[j][i];
    }
    // END OF CONSTRAINING Y3

    // check if out[][] has registers in [0, 2^CHUNK_SIZE) 
    component rangeCheck = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++)
        rangeCheck.in[j][i] <== out[j][i];
}


// Elliptic curve is E : y**2 = x**3 + aX + b
// assuming a < 2^CHUNK_SIZE for now
// Note that for BLS12-381, a = 0, b = 4

// Implements:
// computing 2P on elliptic curve E for P = (x_1, y_1)
// formula from https://crypto.stanford.edu/pbc/notes/elliptic/explicit.html
// x_1 = in[0], y_1 = in[1]
// assume y_1 != 0 (otherwise 2P = O)

// LAMB =  (3x_1^2 + a) / (2 y_1) % P
// x_3 = out[0] = LAMBDA^2 - 2 x_1 % P
// y_3 = out[1] = LAMBDA (x_1 - x_3) - y_1 % P

// We precompute (x_3, y_3) and then constrain by showing that:
// * (x_3, y_3) is a valid point on the curve 
// * (x_3, y_3) is on the tangent line to E at (x_1, y_1) 
// * x_1 != x_3 
template EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, a, b, p) {
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

    var LONG3[CHUNK_NUMBER];
    LONG3[0] = 3;
    for (var i = 1; i < CHUNK_NUMBER; i++) {
        LONG3[i] = 0;
    }

    // precompute lambda 
    var lamb_num[150] = long_add_mod(CHUNK_SIZE, CHUNK_NUMBER, a, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, LONG3, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, in[0], in[0], p), p), p);
    var lamb_denom[150] = long_add_mod(CHUNK_SIZE, CHUNK_NUMBER, in[1], in[1], p);
    var lamb[150] = prod_mod(CHUNK_SIZE, CHUNK_NUMBER, lamb_num, mod_inv(CHUNK_SIZE, CHUNK_NUMBER, lamb_denom, p), p);

    // precompute x_3, y_3
    var x3[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, lamb, lamb, p), long_add_mod(CHUNK_SIZE, CHUNK_NUMBER, in[0], in[0], p), p);
    var y3[150] = long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, prod_mod(CHUNK_SIZE, CHUNK_NUMBER, lamb, long_sub_mod(CHUNK_SIZE, CHUNK_NUMBER, in[0], x3, p), p), in[1], p);
    
    for(var i = 0; i < CHUNK_NUMBER; i++){
        out[0][i] <-- x3[i];
        out[1][i] <-- y3[i];
    }
    // check if out[][] has registers in [0, 2^CHUNK_SIZE)
    component range_check = RangeCheck2D(CHUNK_SIZE, CHUNK_NUMBER);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++)
        range_check.in[j][i] <== out[j][i];

    component point_on_tangent = PointOnTangent(CHUNK_SIZE, CHUNK_NUMBER, a, p);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++){
        point_on_tangent.in[0][j][i] <== in[j][i];
        point_on_tangent.in[1][j][i] <== out[j][i];
    }
    
    component point_on_curve = PointOnCurve(CHUNK_SIZE, CHUNK_NUMBER, a, b, p);
    for(var j = 0; j < 2; j++)for(var i = 0; i < CHUNK_NUMBER; i++)
        point_on_curve.in[j][i] <== out[j][i];
    
    component x3_eq_x1 = FpIsEqual(CHUNK_SIZE, CHUNK_NUMBER, p);
    for(var i = 0; i < CHUNK_NUMBER; i++){
        x3_eq_x1.in[0][i] <== out[0][i];
        x3_eq_x1.in[1][i] <== in[0][i];
    }
    x3_eq_x1.out === 0;
}



// Fp curve y^2 = x^3 + A1*x + B1 
// Assume curve has no Fp points of order 2, i.e., x^3 + A1*x + B1 has no Fp roots
// Fact: ^ this is the case for BLS12-381 and BN254
// If isInfinity = 1, replace `out` with `a` so if `a` was on curve, so is output
template EllipticCurveAdd(CHUNK_SIZE, CHUNK_NUMBER, A1, B1, P){
    signal input a[2][CHUNK_NUMBER];
    signal input aIsInfinity;
    signal input b[2][CHUNK_NUMBER];
    signal input bIsInfinity;
    
    signal output out[2][CHUNK_NUMBER];
    signal output isInfinity;

    component xEqual = FpIsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
    component yEqual = FpIsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);

    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
        xEqual.in[0][idx] <== a[0][idx];
        xEqual.in[1][idx] <== b[0][idx];

        yEqual.in[0][idx] <== a[1][idx];
        yEqual.in[1][idx] <== b[1][idx];
    }
    // if a.x = b.x then a = +-b 
    // if a = b then a + b = 2 * a so we need to do point doubling  
    // if a = -a then out is infinity
    signal addIsDouble;
    addIsDouble <== xEqual.out * yEqual.out; // AND gate
    
    // if a.x = b.x, need to replace b.x by a different number just so AddUnequal doesn't break
    // I will do this in a dumb way: replace b[0][0] by (b[0][0] == 0)
    component isZero = IsZero(); 
    isZero.in <== b[0][0]; 
    
    component add = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, P);
    component doub = EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, A1, B1, P);
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            add.a[i][idx] <== a[i][idx];
            if( i  == 0  && idx == 0 ){
                add.b[i][idx] <== b[i][idx] + xEqual.out * (isZero.out - b[i][idx]); 
            } else {
                add.b[i][idx] <== b[i][idx]; 
            }
            doub.in[i][idx] <== a[i][idx];
        }
    }
    
    // out = O iff ( a = O AND b = O ) OR (a != 0 AND b != 0) AND ( xEqual AND NOT yEqual ) 
    signal ab0;
    ab0 <== aIsInfinity * bIsInfinity; 
    signal abNon0;
    abNon0 <== (1 - aIsInfinity) * (1 - bIsInfinity);
    signal aNegB;
    aNegB <== xEqual.out - xEqual.out * yEqual.out; 
    signal inverse;
    inverse <== abNon0 * aNegB;
    isInfinity <== ab0 + inverse - ab0 * inverse; // OR gate

    signal tmp[3][2][CHUNK_NUMBER]; 
    for(var i = 0; i < 2; i++) {
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            tmp[0][i][idx] <== add.out[i][idx] + addIsDouble * (doub.out[i][idx] - add.out[i][idx]); 
            // if a = O, then a + b = b 
            tmp[1][i][idx] <== tmp[0][i][idx] + aIsInfinity * (b[i][idx] - tmp[0][i][idx]);
            // if b = O, then a + b = a
            tmp[2][i][idx] <== tmp[1][i][idx] + bIsInfinity * (a[i][idx] - tmp[1][i][idx]);
            out[i][idx] <== tmp[2][i][idx] + isInfinity * (a[i][idx] - tmp[2][i][idx]);
        }
    }
}

// Curve E : y^2 = x^3 + b
// Inputs:
//  in is 2 x CHUNK_NUMBER array where P = (x, y) is a point in E(Fp) 
//  inIsInfinity = 1 if P = O, else = 0
// Output:
//  out = [x]P is 2 x CHUNK_NUMBER array representing a point in E(Fp)
//  isInfinity = 1 if [x]P = O, else = 0
// Assume:
//  x in [0, 2^250) 
//  `in` is point in E even if inIsInfinity = 1 just so nothing goes wrong
//  E(Fp) has no points of order 2
template EllipticCurveScalarMultiply(CHUNK_SIZE, CHUNK_NUMBER, b, x, p){
    signal input in[2][CHUNK_NUMBER];
    signal input inIsInfinity;

    signal output out[2][CHUNK_NUMBER];
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

    signal r[BITS_LENGTH][2][CHUNK_NUMBER]; 
    signal rIsO[BITS_LENGTH]; 
    component pDouble[BITS_LENGTH];
    component pAdd[SIG_BITS];
    var CUR_ID = 0;

    // if in = O then [x]O = O so there's no point to any of this
    signal P[2][CHUNK_NUMBER];
    for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
        P[j][idx] <== in[j][idx];
    
    for(var i = BITS_LENGTH - 1; i >= 0; i--){
        if( i == BITS_LENGTH - 1 ){
            for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                r[i][j][idx] <== P[j][idx];
            }
            rIsO[i] <== 0; 
        } else {
            // E(Fp) has no points of order 2, so the only way 2 * r[i + 1] = O is if r[i + 1] = O 
            pDouble[i] = EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, 0, b, p);  
            for(var j = 0; j < 2; j++)for(var idx = 0; idx < CHUNK_NUMBER; idx++)
                pDouble[i].in[j][idx] <== r[i + 1][j][idx]; 
            
            if(BITS[i] == 0){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        r[i][j][idx] <== pDouble[i].out[j][idx];
                    }
                }
                rIsO[i] <== rIsO[i + 1]; 
            } else {
                // pAdd[CUR_ID] = pDouble[i] + P 
                pAdd[CUR_ID] = EllipticCurveAdd(CHUNK_SIZE, CHUNK_NUMBER, 0, b, p); 
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pAdd[CUR_ID].a[j][idx] <== pDouble[i].out[j][idx]; 
                        pAdd[CUR_ID].b[j][idx] <== P[j][idx];
                    }
                }
                pAdd[CUR_ID].aIsInfinity <== rIsO[i + 1];
                pAdd[CUR_ID].bIsInfinity <== 0;

                rIsO[i] <== pAdd[CUR_ID].isInfinity; 
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        r[i][j][idx] <== pAdd[CUR_ID].out[j][idx];
                    }
                }
                
                CUR_ID++;
            }
        }
    }
    // output = O if input = O or r[0] = O 
    isInfinity <== inIsInfinity + rIsO[0] - inIsInfinity * rIsO[0];
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[i][idx] <== r[0][i][idx] + isInfinity * (in[i][idx] - r[0][i][idx]);
        }
    }
}

// Curve E : y^2 = x^3 + b
// Inputs:
//  in = P is 2 x CHUNK_NUMBER array where P = (x, y) is a point in E(Fp) 
// Output:
//  out = [x]P is 2 x CHUNK_NUMBER array representing a point in E(Fp)
// Assume:
//  x in [0, 2^250) 
//  E(Fp) has no points of order 2
//  P has order > x so never hit point at infinity, and can always use add unequal: constraint assertion fails if add unequal fails 
template EllipticCurveScalarMultiplyUnequal(CHUNK_SIZE, CHUNK_NUMBER, b, x, P){
    signal input in[2][CHUNK_NUMBER];
    signal output out[2][CHUNK_NUMBER];

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

    signal r[BITS_LENGTH][2][CHUNK_NUMBER]; 
    component pDouble[BITS_LENGTH];
    component pAdd[SIG_BITS];
    component add_exception[SIG_BITS];
    var CUR_ID = 0;

    for(var i=BITS_LENGTH - 1; i >= 0; i--){
        if( i == BITS_LENGTH - 1 ){
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    r[i][j][idx] <== in[j][idx];
                }
            }
        } else {
            // E(Fp) has no points of order 2, so the only way 2 * r[i + 1] = O is if r[i + 1] = O 
            pDouble[i] = EllipticCurveDouble(CHUNK_SIZE, CHUNK_NUMBER, 0, b, P);  
            for(var j = 0; j < 2; j++){
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    pDouble[i].in[j][idx] <== r[i + 1][j][idx]; 
                }
            }
            if(BITS[i] == 0){
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        r[i][j][idx] <== pDouble[i].out[j][idx];
                    }
                }
            } else {
                // Constrain that pDouble[i].x != P.x 
                add_exception[CUR_ID] = FpIsEqual(CHUNK_SIZE, CHUNK_NUMBER, P);
                for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                    add_exception[CUR_ID].in[0][idx] <== pDouble[i].out[0][idx];
                    add_exception[CUR_ID].in[1][idx] <== in[0][idx];
                }
                add_exception[CUR_ID].out === 0;

                // pAdd[CUR_ID] = pDouble[i] + P 
                pAdd[CUR_ID] = EllipticCurveAddUnequal(CHUNK_SIZE, CHUNK_NUMBER, P); 
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        pAdd[CUR_ID].a[j][idx] <== pDouble[i].out[j][idx]; 
                        pAdd[CUR_ID].b[j][idx] <== in[j][idx];
                    }
                }
                for(var j = 0; j < 2; j++){
                    for(var idx = 0; idx < CHUNK_NUMBER; idx++){
                        r[i][j][idx] <== pAdd[CUR_ID].out[j][idx];
                    }
                }
                CUR_ID++;
            }
        }
    }
    for(var i = 0; i < 2; i++){
        for(var idx = 0; idx < CHUNK_NUMBER; idx++){
            out[i][idx] <== r[0][i][idx];
        }
    }
}


