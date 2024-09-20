/// UNUSED FILE

pragma circom 2.1.9;

include "bigInt_func.circom";
include "p256_func.circom";

// P = 2^256 - 2^224 + 2^192 + 2^96 - 1

// input: 10 registers, 64 bits each. registers can be overful
// returns: reduced number with 8 32-bit registers, preserving residue mod P
// changing the curve...
//      offset is too big to use immediately (on the order of 2^224)
//      need overflow to be at most 53, since there are 200-bit inputs (see p256.circom circuit AddUnequalCubicConstraint)
//      use 8 32-bit registers instead, calculate reps of 2**(64*i) in (32,8) representation directly so can only add 32-bit overflow
template P256PrimeReduce10Registers() {
    signal input in[10];

    // raw number = in[0] + in[1]*(2^64)^1 + in[2]*(2^64)^2 +in[3]*(2^64)^3 ... + in[7]*(2^64)^7 + ...
    // in[i]*(2^64)^i --> represent each of (2^64)^i (mod p) as an 8 digit (register) number in base 2^32, so that offsets to multiply in[i] by for each register at most 32 bits = small

    // PrimeReduce10Registers: 
    // TODO: remove hardcode
    var in_coeffs[10][8] = [[1, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 1, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 1, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 1, 0],
                        [1, 0, 0, 4294967295, 4294967295, 4294967295, 4294967294, 0],
                        [4294967295, 0, 1, 1, 4294967295, 4294967294, 0, 4294967294],
                        [4294967294, 4294967294, 4294967295, 2, 2, 0, 1, 4294967294],
                        [4294967295, 4294967294, 4294967294, 4294967295, 0, 2, 3, 0],
                        [3, 0, 4294967295, 4294967291, 4294967294, 4294967295, 4294967293, 4],
                        [2, 5, 3, 4294967294, 4294967289, 4294967291, 4294967292, 4294967292]];

    

    var tmp[8] = [0,0,0,0,0,0,0,0];
    for (var i=0; i<8; i++) {
        for (var j=0; j<10; j++) {
            tmp[i] += in_coeffs[j][i] * in[j];
        }
    }
    
    signal output out[8]; // (32, 8)
    for (var i=0; i<8; i++) {
        out[i] <== tmp[i];
    }

}

// DONE
// input: 7 registers, 64 bits each. registers can be overful
// returns: reduced number with 4 registers, preserving residue mod P
// PrimeReduce7Registers only called in CheckQuadraticModPIsZero, which have inputs at most 132 bits
// so can directly reduce 2^(64i)*in[i] directly in 4 registers of 64 bits -> 64 bit overflow for 4 <= i <= 6
template P256PrimeReduce7Registers() {
    signal input in[7];

    var in_coeffs[7][4] = [[1, 0, 0, 0], 
                    [0, 1, 0, 0], 
                    [0, 0, 1, 0], 
                    [0, 0, 0, 1], 
                    [1, 18446744069414584320, 18446744073709551615, 4294967294], 
                    [4294967295, 4294967297, 18446744069414584319, 18446744065119617024], 
                    [18446744069414584318, 12884901887, 2, 18446744065119617025]];

    var tmp[4] = [0,0,0,0];
    for (var i=0; i<4; i++) {
        for (var j=0; j<7; j++) {
            tmp[i] += in_coeffs[j][i] * in[j];
        }
    }

    signal output out[4]; // (64, 4)
    for (var i=0; i<4; i++) {
        out[i] <== tmp[i];
    }
}

// DONE
// check that in is in range [0, P-1]
// want to look at P base 2^64 - as long as number is less than that, good (check ranges from largest to smallest digit)
// P = 18446744073709551615 * 2^0 + 4294967295 * 2^64 + 0 * 2^128 + 18446744069414584321 * 2^192
// TODO: remove hardcode
template CheckInRangeP256 () {
    signal input in[4];

    component firstPlaceLessThan = LessThan(64);
    firstPlaceLessThan.in[0] <== in[3];
    firstPlaceLessThan.in[1] <== 18446744069414584321;

    component firstPlaceEqual = IsEqual();
    firstPlaceEqual.in[0] <== in[3];
    firstPlaceEqual.in[1] <== 18446744069414584321;

    component secondPlaceLessThan = LessThan(64);
    secondPlaceLessThan.in[0] <== in[2];
    secondPlaceLessThan.in[1] <== 0;

    component secondPlaceEqual = IsEqual();
    secondPlaceEqual.in[0] <== in[2];
    secondPlaceEqual.in[1] <== 0;

    component thirdPlaceLessThan = LessThan(64);
    thirdPlaceLessThan.in[0] <== in[1];
    thirdPlaceLessThan.in[1] <== 4294967295;

    component thirdPlaceEqual = IsEqual();
    thirdPlaceEqual.in[0] <== in[1];
    thirdPlaceEqual.in[1] <== 4294967295;

    component fourthPlaceLessThan = LessThan(64);
    fourthPlaceLessThan.in[0] <== in[0];
    fourthPlaceLessThan.in[1] <== 18446744073709551615;

    component fourthPlaceEqual = IsEqual();
    fourthPlaceEqual.in[0] <== in[0];
    fourthPlaceEqual.in[1] <== 18446744073709551615;

    signal l1;
    l1 <== 1 - firstPlaceLessThan.out;
    signal e1;
    e1 <== 1 - firstPlaceEqual.out;
    signal l2;
    l2 <== 1 - secondPlaceLessThan.out;
    signal e2;
    e2 <== 1 - secondPlaceEqual.out;
    signal l3;
    l3 <== 1 - thirdPlaceLessThan.out;
    signal e3;
    e3 <== 1 - thirdPlaceEqual.out;
    signal l4;
    l4 <== 1 - fourthPlaceLessThan.out;
    signal e4;
    e4 <== 1 - fourthPlaceEqual.out;

    // d1d2d3d4 < P <=> (d1 less) OR 
    //                  (d1 equal and d2 less) OR
    //                  (d1 equal and d2 equal and d3 less) OR 
    //                  (d1 equal and d2 equal and d3 equal and d4 less)

    signal tmp1;
    tmp1 <== 1 * (e1 + l2);
    signal tmp2;
    tmp2 <== (e1 + e2 + l3) * (e1 + e2 + e3 + l4);

    tmp1 * tmp2 === 0;

}

// DONE
// 64 bit registers with m-bit overflow
// registers (and overall number) are potentially negative
template CheckCubicModPIsZero(m) {
    assert(m < 206); // since we deal with up to m+34 bit, potentially negative registers

    signal input in[10];

    log("===CheckCubicMod===");
    for (var i=0; i<10; i++) { // should be at most 200-bit registers
        log(in[i]);
    }

    log(111);

    // the p256 field size in (32,8)-rep
    signal p[8];
    var p_32_8[100] = get_p256_prime(32, 8);
    for (var i=0; i<8; i++) {
        p[i] <== p_32_8[i];
        log(p[i]);
    }


    // now, we compute a positive number congruent to `in` expressible in *8* overflowed registers.
    // for this representation, individual registers are allowed to be negative, but the final number
    // will be nonnegative overall.
    // first, we apply the p256 10-register reduction technique to reduce to *8* registers. this may result
    // in a negative number overall, but preserves congruence mod p.
    // our intermediate result is z = p256reduce(in)
    // second, we add a big multiple of p to z, to ensure that our final result is positive. 
    // since the registers of z are m + 34 bits, its max abs value is 2^(m+34 + 224) + 2^(m+34 + 192) + 2^(m+34 + 160) + ...
    //      < 2^(m+258)
    // so we add p * 2^(m+6) = (2^256-2^224 + eps) * 2^(m+6), which is a bit under 2^(m+262) and larger than |z| < 8 * 2^(m+34 + 224) = 2^(m+34 + 224 + 3) = 2^(m+261)

    // notes:
    // what if we just didn't reduce any registers? like why are we reducing the input at all if all we're doing is long division? then
    //      in < 2^(m + 64*9) + ... < 2^(m + 64*9)*10...

    signal reduced[8];

    component p256Reducer = P256PrimeReduce10Registers(); // (32, 8)
    for (var i = 0; i < 10; i++) {
        p256Reducer.in[i] <== in[i];
    }

    log(0);

    for (var i = 0; i < 8; i++) {
        log(p256Reducer.out[i]);
    }

    log(222);
    
    // also compute P as (32, 8) rep to add - multiple should still be the same since value stays same
    signal multipleOfP[8];
    for (var i = 0; i < 8; i++) {
        multipleOfP[i] <== p[i] * (1 << (m+6)); // m + 6 + 32 = m+38 bits
    }

    // reduced becomes (32, 8)
    for (var i = 0; i < 8; i++) {
        reduced[i] <== p256Reducer.out[i] + multipleOfP[i]; // max(m+34, m+38) + 1 = m+39 bits
    }

    for (var i = 0; i < 8; i++) {
        log(reduced[i]);
    }
    
    log(333);

    // now we compute the quotient q, which serves as a witness. we can do simple bounding to show
    // q := reduced / P < (p256Reducer + multipleofP) / 2^255 < (2^(m+262) + 2^(m+261)) / 2^255 < 2^(m+8)
    // so the expected quotient q is always expressive in *7* 32-bit registers (i.e. < 2^224)
    // as long as m < 216 (and we only ever call m < 200)
    signal q[7];

    // getProperRepresentation(m, n, k, in) spec:
    // m bits per overflowed register (values are potentially negative)
    // n bits per properly-sized register
    // in has k registers
    // out has k + ceil(m/n) - 1 + 1 registers. highest-order potentially negative,
    // all others are positive
    // - 1 since the last register is included in the last ceil(m/n) array
    // + 1 since the carries from previous registers could push you over
    // TODO: need to check if largest register of proper is negative
    var temp[100] = getProperRepresentation(m + 39, 32, 8, reduced); // SOME ERROR HERE

    var proper[16];
    for (var i = 0; i<16; i++) {
        proper[i] = temp[i];
        log(proper[i]);
    }

    log(999999999);

    // long_div(n, k, m, a, b) spec:
    // n bits per register
    // a has k + m registers
    // b has k registers
    // out[0] has length m + 1 -- quotient
    // out[1] has length k -- remainder
    // implements algorithm of https://people.eecs.berkeley.edu/~fateman/282/F%20Wright%20notes/week4.pdf
    // b[k-1] must be nonzero!
    // var qVarTemp[2][100] = long_div(32, 8, 8, proper, p); // ERROR HERE 
    // for (var i = 0; i < 7; i++) {
    //     q[i] <-- qVarTemp[0][i];
    //     log(q[i]);
    // }

    var qVarTemp[7] = [0, 0, 0, 0, 813694976, 2338053171, 2054]; // try hardcoding expected q in?
    for (var i = 0; i < 7; i++) {
        q[i] <-- qVarTemp[i];
        log(q[i]);
    }


    // we need to constrain that q is in proper (7x32) representation
    component qRangeChecks[7];
    for (var i = 0; i < 7; i++) {
        qRangeChecks[i] = Num2Bits(32);
        qRangeChecks[i].in <== q[i];
    }

    log(444);

    // now we compute a representation qpProd = q * p
    signal qpProd[14];

    // template BigMultNoCarry(n, ma, mb, ka, kb) spec:
    // a and b have n-bit registers
    // a has ka registers, each with NONNEGATIVE ma-bit values (ma can be > n)
    // b has kb registers, each with NONNEGATIVE mb-bit values (mb can be > n)
    // out has ka + kb - 1 registers, each with (ma + mb + ceil(log(max(ka, kb))))-bit values
    component qpProdComp = BigMultNoCarry(32, 32, 32, 7, 8); // qpProd = q*p
    for (var i = 0; i < 7; i++) {
        qpProdComp.a[i] <== q[i];
    }
    for (var i = 0; i < 8; i++) {
        qpProdComp.b[i] <== p[i];
    }
    for (var i = 0; i < 14; i++) {
        qpProd[i] <== qpProdComp.out[i]; // 67 bits
    }

    for (var i = 0; i < 14; i++) {
        log(qpProd[i]); // 67 bits
    }

    // log(444);
    // for (var i = 0; i < 26; i++) {
    //     log(qpProdComp.out[i]); // 67 bits
    // }


    log(555);

    // finally, check that qpProd == reduced
    // CheckCarryToZeroEcdsa(n, m, k) spec:
    // in[i] contains values in the range -2^(m-1) to 2^(m-1)
    // constrain that in[] as a big integer is zero
    // each limbs is n bits
    // FAILING HERE:
    component zeroCheck = CheckCarryToZeroEcdsa(32, m + 50, 14);
    for (var i = 0; i < 14; i++) {
        if (i < 8) { // reduced only has 8 registers
            zeroCheck.in[i] <== qpProd[i] - reduced[i]; // (m + 39) + 1 bits
            log(zeroCheck.in[i]);
        } else {
            zeroCheck.in[i] <== qpProd[i];
            log(zeroCheck.in[i]);
        }
    }

    log(666);

}

// DONE
// 64 bit registers with m-bit overflow
// registers (and overall number) are potentially negative
template CheckQuadraticModPIsZero(m) {
    assert(m < 147); // so that we can assume q has 2 registers

    signal input in[7];

    // the p256 field size, hardcoded
    signal p[4];
    p[0] <== 18446744073709551615;
    p[1] <== 4294967295;
    p[2] <== 0;
    p[3] <== 18446744069414584321;

    // now, we compute a positive number congruent to `in` expressible in 4 overflowed registers.
    // for this representation, individual registers are allowed to be negative, but the final number
    // will be nonnegative overall.
    // first, we apply the p256 7-register reduction technique to reduce to 4 registers. this may result
    // in a negative number overall, but preserves congruence mod p.
    // our intermediate result is z = p256Reduce(in)
    // second, we add a big multiple of p to z, to ensure that our final result is positive. 
    // since the registers of z are m + 33 bits, its max abs value is 2^(m+33 + 192) + 2^(m+33 + 128) + ...
    // so we add p * 2^(m-30), which is a bit under 2^(m+226) and larger than |z| < 2^(m+33+192) + eps
    signal reduced[4];
    component p256Reducer = P256PrimeReduce7Registers();
    for (var i = 0; i < 7; i++) {
        p256Reducer.in[i] <== in[i];
    }
    signal multipleOfP[4];
    for (var i = 0; i < 4; i++) {
        multipleOfP[i] <== p[i] * (1 << (m-30)); // m - 30 + 64 = m + 34 bits
    }
    for (var i = 0; i < 4; i++) {
        reduced[i] <== p256Reducer.out[i] + multipleOfP[i]; // max(m+33, m+34) + 1 = m+35 bits
    }

    // now we compute the quotient q, which serves as a witness. we can do simple bounding to show
    // that the the expected quotient is always expressible in 2 registers (i.e. < 2^192)
    // so long as m < 147
    signal q[2];

    var temp[100] = getProperRepresentation(m + 35, 64, 4, reduced);
    var proper[8];
    for (var i = 0; i < 8; i++) {
        proper[i] = temp[i];
    }

    var qVarTemp[2][100] = long_div_ecdsa(64, 4, 4, proper, p);
    for (var i = 0; i < 2; i++) {
        q[i] <-- qVarTemp[0][i];
    }

    // we need to constrain that q is in proper (2x64) representation
    component qRangeChecks[2];
    for (var i = 0; i < 2; i++) {
        qRangeChecks[i] = Num2Bits(64);
        qRangeChecks[i].in <== q[i];
    }

    // now we compute a representation qpProd = q * p
    signal qpProd[5];
    component qpProdComp = BigMultNoCarry(64, 64, 64, 2, 4);
    for (var i = 0; i < 2; i++) {
        qpProdComp.a[i] <== q[i];
    }
    for (var i = 0; i < 4; i++) {
        qpProdComp.b[i] <== p[i];
    }
    for (var i = 0; i < 5; i++) {
        qpProd[i] <== qpProdComp.out[i]; // 130 bits
    }

    // finally, check that qpProd == reduced
    component zeroCheck = CheckCarryToZeroEcdsa(64, m + 36, 5);
    for (var i = 0; i < 5; i++) {
        if (i < 4) { // reduced only has 4 registers
            zeroCheck.in[i] <== qpProd[i] - reduced[i]; // (m + 35) + 1 bits
        } else {
            zeroCheck.in[i] <== qpProd[i];
        }
    }
}