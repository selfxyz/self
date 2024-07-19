pragma circom 2.0.3;

include "../../../node_modules/circomlib/circuits/bitify.circom";
include "fp2.circom";
include "bigint.circom";
include "bigint_func.circom";

// in[i] = (x_i, y_i) 
// Implements constraint: (y_1 + y_3) * (x_2 - x_1) - (y_2 - y_1)*(x_1 - x_3) = 0 mod p
// used to show (x1, y1), (x2, y2), (x3, -y3) are co-linear
template PointOnLine(n, k, p) {
    signal input in[3][2][k]; 

    var LOGK = log_ceil(k);
    var LOGK2 = log_ceil(3*k*k);
    assert(3*n + LOGK2 < 251);

    // AKA check point on line 
    component left = BigMultShortLong(n, k, 2*n + LOGK + 1); // 2k-1 registers abs val < 2k*2^{2n}
    for(var i = 0; i < k; i++){
        left.a[i] <== in[0][1][i] + in[2][1][i];
        left.b[i] <== in[1][0][i] - in[0][0][i]; 
    }

    component right = BigMultShortLong(n, k, 2*n + LOGK); // 2k-1 registers abs val < k*2^{2n}
    for(var i = 0; i < k; i++){
        right.a[i] <== in[1][1][i] - in[0][1][i];
        right.b[i] <== in[0][0][i] - in[2][0][i];
    }
    
    component diff_red; 
    diff_red = PrimeReduce(n, k, k-1, p, 3*n + LOGK2);
    for(var i=0; i<2*k-1; i++)
        diff_red.in[i] <== left.out[i] - right.out[i];  

    // diff_red has k registers abs val < 3*k^2*2^{3n}
    component diff_mod = SignedCheckCarryModToZero(n, k, 3*n + LOGK2, p);
    for(var i=0; i<k; i++)
        diff_mod.in[i] <== diff_red.out[i]; 
}

// in = (x, y)
// Implements:
// x^3 + ax + b - y^2 = 0 mod p
// Assume: a, b in [0, 2^n) 
template PointOnCurve(n, k, a, b, p){
    signal input in[2][k]; 

    var LOGK = log_ceil(k);
    var LOGK2 = log_ceil( (2*k-1)*(k*k+1) );
    assert(4*n + LOGK2 < 251);

    // compute x^3, y^2 
    component x_sq = BigMultShortLong(n, k, 2*n + LOGK); // 2k-1 registers in [0, k*2^{2n}) 
    component y_sq = BigMultShortLong(n, k, 2*n + LOGK); // 2k-1 registers in [0, k*2^{2n}) 
    for(var i=0; i<k; i++){
        x_sq.a[i] <== in[0][i];
        x_sq.b[i] <== in[0][i];

        y_sq.a[i] <== in[1][i];
        y_sq.b[i] <== in[1][i];
    }
    component x_cu = BigMultShortLongUnequal(n, 2*k-1, k, 3*n + 2*LOGK); // 3k-2 registers in [0, k^2 * 2^{3n}) 
    for(var i=0; i<2*k-1; i++)
        x_cu.a[i] <== x_sq.out[i];
    for(var i=0; i<k; i++)
        x_cu.b[i] <== in[0][i];

    // x_cu + a x + b has 3k-2 positive registers < k^2 * 2^{3n} + 2^{2n} + 2^n < (k^2 + 1) * 2^{3n} 
    component cu_red = PrimeReduce(n, k, 2*k-2, p, 4*n + 3*LOGK + 1);
    for(var i=0; i<3*k-2; i++){
        if(i == 0)
            cu_red.in[i] <== x_cu.out[i] + a * in[0][i] + b; 
        else{
            if(i < k)
                cu_red.in[i] <== x_cu.out[i] + a * in[0][i]; 
            else
                cu_red.in[i] <== x_cu.out[i];
        }
    }
    // cu_red has k registers < (k^2 + 1)*(2k-1)*2^{4n}

    component y_sq_red = PrimeReduce(n, k, k-1, p, 3*n + 2*LOGK + 1);
    for(var i=0; i<2*k-1; i++)
        y_sq_red.in[i] <== y_sq.out[i]; 
    // y_sq_red has positive registers, so when we subtract from cu_red it doesn't increase absolute value

    component constraint = SignedCheckCarryModToZero(n, k, 4*n + LOGK2, p);
    for(var i=0; i<k; i++){
        constraint.in[i] <== cu_red.out[i] - y_sq_red.out[i]; 
    }
}

// in[0] = (x_1, y_1), in[1] = (x_3, y_3) 
// Checks that the line between (x_1, y_1) and (x_3, -y_3) is equal to the tangent line to the elliptic curve at the point (x_1, y_1)
// Implements: 
// (y_1 + y_3) = lambda * (x_1 - x_3)
// where lambda = (3 x_1^2 + a)/(2 y_1) 
// Actual constraint is 2y_1 (y_1 + y_3) = (3 x_1^2 + a ) ( x_1 - x_3 )
template PointOnTangent(n, k, a, p){
    signal input in[2][2][k];
    
    var LOGK = log_ceil(k);
    var LOGK3 = log_ceil((3*k)*(2*k-1) + 1);
    assert(4*n + LOGK3 < 251);
    component x_sq = BigMultShortLong(n, k, 2*n + LOGK); // 2k-1 registers < k*2^{2n}) 
    for(var i=0; i<k; i++){
        x_sq.a[i] <== in[0][0][i];
        x_sq.b[i] <== in[0][0][i];
    }
    component right = BigMultShortLongUnequal(n, 2*k-1, k, 3*n + 2*LOGK + 3); // 3k-2 registers < (3*k+1)*k*2^{3n} 
    for(var i=0; i<2*k-1; i++){
        if(i == 0)
            right.a[i] <== 3 * x_sq.out[i] + a; // registers in [0, 3*k*2^{2n} + 2^n = (3k+2^{-n})*2^{2n})  
        else
            right.a[i] <== 3 * x_sq.out[i]; 
    }
    for(var i=0; i<k; i++){
        right.b[i] <== in[0][0][i] - in[1][0][i]; 
    }
    
    component left = BigMultShortLong(n, k, 2*n + 2 + LOGK); // 2k-1 registers in [0, 4k * 2^{2n})
    for(var i=0; i<k; i++){
        left.a[i] <== 2*in[0][1][i];
        left.b[i] <== in[0][1][i] + in[1][1][i];  
    }
    
    // prime reduce right - left 
    component diff_red = PrimeReduce(n, k, 2*k-2, p, 4*n + LOGK3);
    for(var i=0; i<3*k-2; i++){
        if(i < 2*k-1) 
            diff_red.in[i] <== right.out[i] - left.out[i]; 
        else
            diff_red.in[i] <== right.out[i];
    }
    // inputs of diff_red has registers < (3k+2^{-n})k*2^{3n} + 4k*2^{2n} < (3k^2 + 1)*2^{3n} assuming 5k <= 2^n 
    // diff_red.out has registers < (3k+1)*(2k-1) * 2^{4n}
    component constraint = SignedCheckCarryModToZero(n, k, 4*n + LOGK3, p);
    for(var i=0; i<k; i++)
        constraint.in[i] <== diff_red.out[i];
}

// requires x_1 != x_2
// assume p is size k array, the prime that curve lives over 
//
// Implements:
//  Given a = (x_1, y_1) and b = (x_2, y_2), 
//      assume x_1 != x_2 and a != -b, 
//  Find a + b = (x_3, y_3)
// By solving:
//  x_1 + x_2 + x_3 - lambda^2 = 0 mod p
//  y_3 = lambda (x_1 - x_3) - y_1 mod p
//  where lambda = (y_2-y_1)/(x_2-x_1) is the slope of the line between (x_1, y_1) and (x_2, y_2)
// these equations are equivalent to:
//  (x_1 + x_2 + x_3)*(x_2 - x_1)^2 = (y_2 - y_1)^2 mod p
//  (y_1 + y_3)*(x_2 - x_1) = (y_2 - y_1)*(x_1 - x_3) mod p
template EllipticCurveAddUnequal(n, k, p) { 
    signal input a[2][k];
    signal input b[2][k];

    signal output out[2][k];

    var LOGK = log_ceil(k);
    var LOGK3 = log_ceil( (3*k*k)*(2*k-1) + 1 ); 
    assert(4*n + LOGK3 < 251);

    // precompute lambda and x_3 and then y_3
    var dy[50] = long_sub_mod(n, k, b[1], a[1], p);
    var dx[50] = long_sub_mod(n, k, b[0], a[0], p); 
    var dx_inv[50] = mod_inv(n, k, dx, p);
    var lambda[50] = prod_mod(n, k, dy, dx_inv, p);
    var lambda_sq[50] = prod_mod(n, k, lambda, lambda, p);
    // out[0] = x_3 = lamb^2 - a[0] - b[0] % p
    // out[1] = y_3 = lamb * (a[0] - x_3) - a[1] % p
    var x3[50] = long_sub_mod(n, k, long_sub_mod(n, k, lambda_sq, a[0], p), b[0], p);
    var y3[50] = long_sub_mod(n, k, prod_mod(n, k, lambda, long_sub_mod(n, k, a[0], x3, p), p), a[1], p);

    for(var i = 0; i < k; i++){
        out[0][i] <-- x3[i];
        out[1][i] <-- y3[i];
    }
    
    // constrain x_3 by CUBIC (x_1 + x_2 + x_3) * (x_2 - x_1)^2 - (y_2 - y_1)^2 = 0 mod p
    
    component dx_sq = BigMultShortLong(n, k, 2*n+LOGK+2); // 2k-1 registers abs val < k*2^{2n} 
    component dy_sq = BigMultShortLong(n, k, 2*n+LOGK+2); // 2k-1 registers < k*2^{2n}
    for(var i = 0; i < k; i++){
        dx_sq.a[i] <== b[0][i] - a[0][i];
        dx_sq.b[i] <== b[0][i] - a[0][i];

        dy_sq.a[i] <== b[1][i] - a[1][i];
        dy_sq.b[i] <== b[1][i] - a[1][i];
    } 

    // x_1 + x_2 + x_3 has registers in [0, 3*2^n) 
    component cubic = BigMultShortLongUnequal(n, k, 2*k-1, 3*n+4+2*LOGK); // 3k-2 registers < 3 * k^2 * 2^{3n} ) 
    for(var i=0; i<k; i++)
        cubic.a[i] <== a[0][i] + b[0][i] + out[0][i]; 
    for(var i=0; i<2*k-1; i++){
        cubic.b[i] <== dx_sq.out[i];
    }

    component cubic_red = PrimeReduce(n, k, 2*k-2, p, 4*n + LOGK3);
    for(var i=0; i<2*k-1; i++)
        cubic_red.in[i] <== cubic.out[i] - dy_sq.out[i]; // registers abs val < 3k^2*2^{3n} + k*2^{2n} < (3k^2+1)2^{3n}
    for(var i=2*k-1; i<3*k-2; i++)
        cubic_red.in[i] <== cubic.out[i]; 
    // cubic_red has k registers < (3k^2+1)(2k-1) * 2^{4n}
    
    component cubic_mod = SignedCheckCarryModToZero(n, k, 4*n + LOGK3, p);
    for(var i=0; i<k; i++)
        cubic_mod.in[i] <== cubic_red.out[i]; 
    // END OF CONSTRAINING x3
    
    // constrain y_3 by (y_1 + y_3) * (x_2 - x_1) = (y_2 - y_1)*(x_1 - x_3) mod p
    component y_constraint = PointOnLine(n, k, p); // 2k-1 registers in [0, k*2^{2n+1})
    for(var i = 0; i < k; i++)for(var j=0; j<2; j++){
        y_constraint.in[0][j][i] <== a[j][i];
        y_constraint.in[1][j][i] <== b[j][i];
        y_constraint.in[2][j][i] <== out[j][i];
    }
    // END OF CONSTRAINING y3

    // check if out[][] has registers in [0, 2^n) 
    component range_check = RangeCheck2D(n, k);
    for(var j=0; j<2; j++)for(var i=0; i<k; i++)
        range_check.in[j][i] <== out[j][i];
}


// Elliptic curve is E : y**2 = x**3 + ax + b
// assuming a < 2^n for now
// Note that for BLS12-381, a = 0, b = 4

// Implements:
// computing 2P on elliptic curve E for P = (x_1, y_1)
// formula from https://crypto.stanford.edu/pbc/notes/elliptic/explicit.html
// x_1 = in[0], y_1 = in[1]
// assume y_1 != 0 (otherwise 2P = O)

// lamb =  (3x_1^2 + a) / (2 y_1) % p
// x_3 = out[0] = lambda^2 - 2 x_1 % p
// y_3 = out[1] = lambda (x_1 - x_3) - y_1 % p

// We precompute (x_3, y_3) and then constrain by showing that:
// * (x_3, y_3) is a valid point on the curve 
// * (x_3, y_3) is on the tangent line to E at (x_1, y_1) 
// * x_1 != x_3 
template EllipticCurveDouble(n, k, a, b, p) {
    signal input in[2][k];
    signal output out[2][k];

    var long_a[k];
    var long_3[k];
    long_a[0] = a;
    long_3[0] = 3;
    for (var i = 1; i < k; i++) {
        long_a[i] = 0;
        long_3[i] = 0;
    }

    // precompute lambda 
    var lamb_num[50] = long_add_mod(n, k, long_a, prod_mod(n, k, long_3, prod_mod(n, k, in[0], in[0], p), p), p);
    var lamb_denom[50] = long_add_mod(n, k, in[1], in[1], p);
    var lamb[50] = prod_mod(n, k, lamb_num, mod_inv(n, k, lamb_denom, p), p);

    // precompute x_3, y_3
    var x3[50] = long_sub_mod(n, k, prod_mod(n, k, lamb, lamb, p), long_add_mod(n, k, in[0], in[0], p), p);
    var y3[50] = long_sub_mod(n, k, prod_mod(n, k, lamb, long_sub_mod(n, k, in[0], x3, p), p), in[1], p);
    
    for(var i=0; i<k; i++){
        out[0][i] <-- x3[i];
        out[1][i] <-- y3[i];
    }
    // check if out[][] has registers in [0, 2^n)
    component range_check = RangeCheck2D(n, k);
    for(var j=0; j<2; j++)for(var i=0; i<k; i++)
        range_check.in[j][i] <== out[j][i];

    component point_on_tangent = PointOnTangent(n, k, a, p);
    for(var j=0; j<2; j++)for(var i=0; i<k; i++){
        point_on_tangent.in[0][j][i] <== in[j][i];
        point_on_tangent.in[1][j][i] <== out[j][i];
    }
    
    component point_on_curve = PointOnCurve(n, k, a, b, p);
    for(var j=0; j<2; j++)for(var i=0; i<k; i++)
        point_on_curve.in[j][i] <== out[j][i];
    
    component x3_eq_x1 = FpIsEqual(n, k, p);
    for(var i = 0; i < k; i++){
        x3_eq_x1.in[0][i] <== out[0][i];
        x3_eq_x1.in[1][i] <== in[0][i];
    }
    x3_eq_x1.out === 0;
}


// Fp curve y^2 = x^3 + a1*x + b1 
// Assume curve has no Fp points of order 2, i.e., x^3 + a1*x + b1 has no Fp roots
// Fact: ^ this is the case for BLS12-381 and BN254
// If isInfinity = 1, replace `out` with `a` so if `a` was on curve, so is output
template EllipticCurveAdd(n, k, a1, b1, p){
    signal input a[2][k];
    signal input aIsInfinity;
    signal input b[2][k];
    signal input bIsInfinity;
    
    signal output out[2][k];
    signal output isInfinity;

    component x_equal = FpIsEqual(n, k, p);
    component y_equal = FpIsEqual(n, k, p);

    for(var idx=0; idx<k; idx++){
        x_equal.in[0][idx] <== a[0][idx];
        x_equal.in[1][idx] <== b[0][idx];

        y_equal.in[0][idx] <== a[1][idx];
        y_equal.in[1][idx] <== b[1][idx];
    }
    // if a.x = b.x then a = +-b 
    // if a = b then a + b = 2*a so we need to do point doubling  
    // if a = -a then out is infinity
    signal add_is_double;
    add_is_double <== x_equal.out * y_equal.out; // AND gate
    
    // if a.x = b.x, need to replace b.x by a different number just so AddUnequal doesn't break
    // I will do this in a dumb way: replace b[0][0] by (b[0][0] == 0)
    component iz = IsZero(); 
    iz.in <== b[0][0]; 
    
    component add = EllipticCurveAddUnequal(n, k, p);
    component doub = EllipticCurveDouble(n, k, a1, b1, p);
    for(var i=0; i<2; i++)for(var idx=0; idx<k; idx++){
        add.a[i][idx] <== a[i][idx];
        if(i==0 && idx==0)
            add.b[i][idx] <== b[i][idx] + x_equal.out * (iz.out - b[i][idx]); 
        else
            add.b[i][idx] <== b[i][idx]; 
        
        doub.in[i][idx] <== a[i][idx];
    }
    
    // out = O iff ( a = O AND b = O ) OR (a != 0 AND b != 0) AND ( x_equal AND NOT y_equal ) 
    signal ab0;
    ab0 <== aIsInfinity * bIsInfinity; 
    signal ab_non0;
    ab_non0 <== (1- aIsInfinity) * (1 - bIsInfinity);
    signal anegb;
    anegb <== x_equal.out - x_equal.out * y_equal.out; 
    signal inverse;
    inverse <== ab_non0 * anegb;
    isInfinity <== ab0 + inverse - ab0 * inverse; // OR gate

    signal tmp[3][2][k]; 
    for(var i=0; i<2; i++)for(var idx=0; idx<k; idx++){
        tmp[0][i][idx] <== add.out[i][idx] + add_is_double * (doub.out[i][idx] - add.out[i][idx]); 
        // if a = O, then a + b = b 
        tmp[1][i][idx] <== tmp[0][i][idx] + aIsInfinity * (b[i][idx] - tmp[0][i][idx]);
        // if b = O, then a + b = a
        tmp[2][i][idx] <== tmp[1][i][idx] + bIsInfinity * (a[i][idx] - tmp[1][i][idx]);
        out[i][idx] <== tmp[2][i][idx] + isInfinity * (a[i][idx] - tmp[2][i][idx]);
    }
}

// Curve E : y^2 = x^3 + b
// Inputs:
//  in is 2 x k array where P = (x, y) is a point in E(Fp) 
//  inIsInfinity = 1 if P = O, else = 0
// Output:
//  out = [x]P is 2 x k array representing a point in E(Fp)
//  isInfinity = 1 if [x]P = O, else = 0
// Assume:
//  x in [0, 2^250) 
//  `in` is point in E even if inIsInfinity = 1 just so nothing goes wrong
//  E(Fp) has no points of order 2
template EllipticCurveScalarMultiply(n, k, b, x, p){
    signal input in[2][k];
    signal input inIsInfinity;

    signal output out[2][k];
    signal output isInfinity;

    var LOGK = log_ceil(k);
        
    var Bits[250]; 
    var BitLength;
    var SigBits=0;
    for (var i = 0; i < 250; i++) {
        Bits[i] = (x >> i) & 1;
        if(Bits[i] == 1){
            SigBits++;
            BitLength = i + 1;
        }
    }

    signal R[BitLength][2][k]; 
    signal R_isO[BitLength]; 
    component Pdouble[BitLength];
    component Padd[SigBits];
    var curid=0;

    // if in = O then [x]O = O so there's no point to any of this
    signal P[2][k];
    for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
        P[j][idx] <== in[j][idx];
    
    for(var i=BitLength - 1; i>=0; i--){
        if( i == BitLength - 1 ){
            for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                R[i][j][idx] <== P[j][idx];
            R_isO[i] <== 0; 
        }else{
            // E(Fp) has no points of order 2, so the only way 2*R[i+1] = O is if R[i+1] = O 
            Pdouble[i] = EllipticCurveDouble(n, k, 0, b, p);  
            for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                Pdouble[i].in[j][idx] <== R[i+1][j][idx]; 
            
            if(Bits[i] == 0){
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                    R[i][j][idx] <== Pdouble[i].out[j][idx];
                R_isO[i] <== R_isO[i+1]; 
            }else{
                // Padd[curid] = Pdouble[i] + P 
                Padd[curid] = EllipticCurveAdd(n, k, 0, b, p); 
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++){
                    Padd[curid].a[j][idx] <== Pdouble[i].out[j][idx]; 
                    Padd[curid].b[j][idx] <== P[j][idx];
                }
                Padd[curid].aIsInfinity <== R_isO[i+1];
                Padd[curid].bIsInfinity <== 0;

                R_isO[i] <== Padd[curid].isInfinity; 
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                    R[i][j][idx] <== Padd[curid].out[j][idx];
                
                curid++;
            }
        }
    }
    // output = O if input = O or R[0] = O 
    isInfinity <== inIsInfinity + R_isO[0] - inIsInfinity * R_isO[0];
    for(var i=0; i<2; i++)for(var idx=0; idx<k; idx++)
        out[i][idx] <== R[0][i][idx] + isInfinity * (in[i][idx] - R[0][i][idx]);
}

// Curve E : y^2 = x^3 + b
// Inputs:
//  in = P is 2 x k array where P = (x, y) is a point in E(Fp) 
// Output:
//  out = [x]P is 2 x k array representing a point in E(Fp)
// Assume:
//  x in [0, 2^250) 
//  E(Fp) has no points of order 2
//  P has order > x so never hit point at infinity, and can always use add unequal: constraint assertion fails if add unequal fails 
template EllipticCurveScalarMultiplyUnequal(n, k, b, x, p){
    signal input in[2][k];
    signal output out[2][k];

    var LOGK = log_ceil(k);
        
    var Bits[250]; 
    var BitLength;
    var SigBits=0;
    for (var i = 0; i < 250; i++) {
        Bits[i] = (x >> i) & 1;
        if(Bits[i] == 1){
            SigBits++;
            BitLength = i + 1;
        }
    }

    signal R[BitLength][2][k]; 
    component Pdouble[BitLength];
    component Padd[SigBits];
    component add_exception[SigBits];
    var curid=0;

    for(var i=BitLength - 1; i>=0; i--){
        if( i == BitLength - 1 ){
            for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                R[i][j][idx] <== in[j][idx];
        }else{
            // E(Fp) has no points of order 2, so the only way 2*R[i+1] = O is if R[i+1] = O 
            Pdouble[i] = EllipticCurveDouble(n, k, 0, b, p);  
            for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                Pdouble[i].in[j][idx] <== R[i+1][j][idx]; 
            
            if(Bits[i] == 0){
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                    R[i][j][idx] <== Pdouble[i].out[j][idx];
            }else{
                // Constrain that Pdouble[i].x != P.x 
                add_exception[curid] = FpIsEqual(n, k, p);
                for(var idx=0; idx<k; idx++){
                    add_exception[curid].in[0][idx] <== Pdouble[i].out[0][idx];
                    add_exception[curid].in[1][idx] <== in[0][idx];
                }
                add_exception[curid].out === 0;

                // Padd[curid] = Pdouble[i] + P 
                Padd[curid] = EllipticCurveAddUnequal(n, k, p); 
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++){
                    Padd[curid].a[j][idx] <== Pdouble[i].out[j][idx]; 
                    Padd[curid].b[j][idx] <== in[j][idx];
                }
                for(var j=0; j<2; j++)for(var idx=0; idx<k; idx++)
                    R[i][j][idx] <== Padd[curid].out[j][idx];
                
                curid++;
            }
        }
    }
    for(var i=0; i<2; i++)for(var idx=0; idx<k; idx++)
        out[i][idx] <== R[0][i][idx];
}