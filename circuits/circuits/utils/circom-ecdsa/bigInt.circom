pragma circom 2.0.3;

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";

include "bigInt_func.circom";


// addition mod 2**n with carry bit
template ModSum(n) {
    assert(n <= 252);
    signal input a;
    signal input b;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(n + 1);
    n2b.in <== a + b;
    carry <== n2b.out[n];
    sum <== a + b - carry * (1 << n);
}

// check if k-register variables a, b are equal everywhere
template BigIsEqual(k) {
    signal input a[k];
    signal input b[k];
    signal output out;

    component isEquals[k];
    var total = k;
    for (var i = 0; i < k; i ++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== a[i];
        isEquals[i].in[1] <== b[i];
        total -= isEquals[i].out;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}

// check if k-register variable a is equal to zero
template BigIsZero(k) {
    signal input in[k];
    signal output out;

    component isZeros[k];
    var total = k;
    for (var i = 0; i < k; i ++) {
        isZeros[i] = IsZero();
        isZeros[i].in <== in[i];
        total -= isZeros[i].out;
    }
    component checkZero = IsZero();
    checkZero.in <== total;
    out <== checkZero.out;
}


// a - b
template ModSub(n) {
    assert(n <= 252);
    signal input a;
    signal input b;
    signal output out;
    signal output borrow;
    component lt = LessThan(n);
    lt.in[0] <== a;
    lt.in[1] <== b;
    borrow <== lt.out;
    out <== borrow * (1 << n) + a - b;
}

// a - b - c
// assume a - b - c + 2**n >= 0
template ModSubThree(n) {
    assert(n + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    assert(a - b - c + (1 << n) >= 0);
    signal output out;
    signal output borrow;
    signal b_plus_c;
    b_plus_c <== b + c;
    component lt = LessThan(n + 1);
    lt.in[0] <== a;
    lt.in[1] <== b_plus_c;
    borrow <== lt.out;
    out <== borrow * (1 << n) + a - b_plus_c;
}

template ModSumThree(n) {
    assert(n + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(n + 2);
    n2b.in <== a + b + c;
    carry <== n2b.out[n] + 2 * n2b.out[n + 1];
    sum <== a + b + c - carry * (1 << n);
}

template ModSumFour(n) {
    assert(n + 2 <= 253);
    signal input a;
    signal input b;
    signal input c;
    signal input d;
    signal output sum;
    signal output carry;

    component n2b = Num2Bits(n + 2);
    n2b.in <== a + b + c + d;
    carry <== n2b.out[n] + 2 * n2b.out[n + 1];
    sum <== a + b + c + d - carry * (1 << n);
}

// product mod 2**n with carry
template ModProd(n) {
    assert(n <= 126);
    signal input a;
    signal input b;
    signal output prod;
    signal output carry;

    component n2b = Num2Bits(2 * n);
    n2b.in <== a * b;

    component b2n1 = Bits2Num(n);
    component b2n2 = Bits2Num(n);
    var i;
    for (i = 0; i < n; i++) {
        b2n1.in[i] <== n2b.out[i];
        b2n2.in[i] <== n2b.out[i + n];
    }
    prod <== b2n1.out;
    carry <== b2n2.out;
}

// split a n + m bit input into two outputs
template Split(n, m) {
    assert(n <= 126);
    signal input in;
    signal output small;
    signal output big;

    small <-- in % (1 << n);
    big <-- in \ (1 << n);

    component n2b_small = Num2Bits(n);
    n2b_small.in <== small;
    component n2b_big = Num2Bits(m);
    n2b_big.in <== big;

    in === small + big * (1 << n);
}

// split a n + m + k bit input into three outputs
template SplitThree(n, m, k) {
    assert(n <= 126);
    signal input in;
    signal output small;
    signal output medium;
    signal output big;

    small <-- in % (1 << n);
    medium <-- (in \ (1 << n)) % (1 << m);
    big <-- in \ (1 << n + m);

    component n2b_small = Num2Bits(n);
    n2b_small.in <== small;
    component n2b_medium = Num2Bits(m);
    n2b_medium.in <== medium;
    component n2b_big = Num2Bits(k);
    n2b_big.in <== big;

    in === small + medium * (1 << n) + big * (1 << n + m);
}

// a[i], b[i] in 0... 2**n-1
// represent a = a[0] + a[1] * 2**n + .. + a[k - 1] * 2**(n * k)
template BigAdd(n, k) {
    assert(n <= 252);
    signal input a[k];
    signal input b[k];
    signal output out[k + 1];

    component unit0 = ModSum(n);
    unit0.a <== a[0];
    unit0.b <== b[0];
    out[0] <== unit0.sum;

    component unit[k - 1];
    for (var i = 1; i < k; i++) {
        unit[i - 1] = ModSumThree(n);
        unit[i - 1].a <== a[i];
        unit[i - 1].b <== b[i];
        if (i == 1) {
            unit[i - 1].c <== unit0.carry;
        } else {
            unit[i - 1].c <== unit[i - 2].carry;
        }
        out[i] <== unit[i - 1].sum;
    }
    out[k] <== unit[k - 2].carry;
}

/* 
Polynomial Multiplication
Inputs:
    - a = a[0] + a[1] * X + ... + a[k-1] * X^{k-1}
    - b = b[0] + b[1] * X + ... + b[k-1] * X^{k-1}
Output:
    - out = out[0] + out[1] * X + ... + out[2 * k - 2] * X^{2*k - 2}
    - out = a * b as polynomials in X 
Notes:
    - Optimization due to xJsnark:
    -- witness is calculated by normal polynomial multiplication
    -- out is contrained by evaluating out(X) === a(X) * b(X) at X = 0, ..., 2*k - 2
    - If a[i], b[j] have absolute value < B, then out[i] has absolute value < k * B^2 
m_out is the expected max number of bits in the output registers
*/
template BigMultShortLong(n, k, m_out) {
   assert(n <= 126);
   signal input a[k];
   signal input b[k];
   signal output out[2 * k - 1];

   var prod_val[2 * k - 1];
   for (var i = 0; i < 2 * k - 1; i++) {
       prod_val[i] = 0;
       if (i < k) {
           for (var a_idx = 0; a_idx <= i; a_idx++) {
               prod_val[i] = prod_val[i] + a[a_idx] * b[i - a_idx];
           }
       } else {
           for (var a_idx = i - k + 1; a_idx < k; a_idx++) {
               prod_val[i] = prod_val[i] + a[a_idx] * b[i - a_idx];
           }
       }
       out[i] <-- prod_val[i];
   }

   var k2 = 2 * k - 1;
   var pow[k2][k2]; // we cache the exponent values because it makes a big difference in witness generation time
   for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
       pow[i][j] = i ** j; 

   var a_poly[2 * k - 1];
   var b_poly[2 * k - 1];
   var out_poly[2 * k - 1];
   for (var i = 0; i < 2 * k - 1; i++) {
       out_poly[i] = 0;
       a_poly[i] = 0;
       b_poly[i] = 0;
       for (var j = 0; j < 2 * k - 1; j++) {
           out_poly[i] = out_poly[i] + out[j] * pow[i][j];
       }
       for (var j = 0; j < k; j++) {
           a_poly[i] = a_poly[i] + a[j] * pow[i][j];
           b_poly[i] = b_poly[i] + b[j] * pow[i][j];
       }
   }
   for (var i = 0; i < 2 * k - 1; i++) {
      out_poly[i] === a_poly[i] * b_poly[i];
   }
}

/*
same as BigMultShortLong except a has degree ka - 1, b has degree kb - 1
    - If a[i], b[j] have absolute value < B, then out[i] has absolute value < min(ka, kb) * B^2 
*/
template BigMultShortLongUnequal(n, ka, kb, m_out) {
    assert(n <= 126);
    signal input a[ka];
    signal input b[kb];
    signal output out[ka + kb - 1];
    
    var prod_val[ka + kb - 1];
    for (var i = 0; i < ka + kb - 1; i++) {
	prod_val[i] = 0;
    }
    for (var i = 0; i < ka; i++) {
	for (var j = 0; j < kb; j++) {
	    prod_val[i + j] = prod_val[i + j] + a[i] * b[j];
	}
    }
    for (var i = 0; i < ka + kb - 1; i++) {
       out[i] <-- prod_val[i];
   }

   var k2 = ka + kb - 1;
   var pow[k2][k2]; 
   for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
       pow[i][j] = i ** j; 

   var a_poly[ka + kb - 1];
   var b_poly[ka + kb - 1];
   var out_poly[ka + kb - 1];
   for (var i = 0; i < ka + kb - 1; i++) {
       out_poly[i] = 0;
       a_poly[i] = 0;
       b_poly[i] = 0;
       for (var j = 0; j < ka + kb - 1; j++) {
           out_poly[i] = out_poly[i] + out[j] * pow[i][j];
       }
       for (var j = 0; j < ka; j++) {
           a_poly[i] = a_poly[i] + a[j] * pow[i][j];
       }
       for (var j = 0; j < kb; j++) {
           b_poly[i] = b_poly[i] + b[j] * pow[i][j];
       }
   }
   for (var i = 0; i < ka + kb - 1; i++) {
      out_poly[i] === a_poly[i] * b_poly[i];
   }
}


// in[i] contains longs
// out[i] contains shorts
template LongToShortNoEndCarry(n, k) {
    assert(n <= 126);
    signal input in[k];
    signal output out[k+1];

    var split[k][3];
    for (var i = 0; i < k; i++) {
        split[i] = SplitThreeFn(in[i], n, n, n);
    }

    var carry[k];
    carry[0] = 0;
    out[0] <-- split[0][0];
    if (k > 1) {
        var sumAndCarry[2] = SplitFn(split[0][1] + split[1][0], n, n);
        out[1] <-- sumAndCarry[0];
        carry[1] = sumAndCarry[1];
    }
    if (k > 2) {
        for (var i = 2; i < k; i++) {
            var sumAndCarry[2] = SplitFn(split[i][0] + split[i-1][1] + split[i-2][2] + carry[i-1], n, n);
            out[i] <-- sumAndCarry[0];
            carry[i] = sumAndCarry[1];
        }
        out[k] <-- split[k-1][1] + split[k-2][2] + carry[k-1];
    }

    component outRangeChecks[k+1];
    for (var i = 0; i < k+1; i++) {
        outRangeChecks[i] = Num2Bits(n);
        outRangeChecks[i].in <== out[i];
    }

    signal runningCarry[k];
    component runningCarryRangeChecks[k];
    runningCarry[0] <-- (in[0] - out[0]) / (1 << n);
    runningCarryRangeChecks[0] = Num2Bits(n + log_ceil_ecdsa(k));
    runningCarryRangeChecks[0].in <== runningCarry[0];
    runningCarry[0] * (1 << n) === in[0] - out[0];
    for (var i = 1; i < k; i++) {
        runningCarry[i] <-- (in[i] - out[i] + runningCarry[i-1]) / (1 << n);
        runningCarryRangeChecks[i] = Num2Bits(n + log_ceil_ecdsa(k));
        runningCarryRangeChecks[i].in <== runningCarry[i];
        runningCarry[i] * (1 << n) === in[i] - out[i] + runningCarry[i-1];
    }
    runningCarry[k-1] === out[k];
}

template BigMult(n, k) {
    signal input a[k];
    signal input b[k];
    signal output out[2 * k];

    var LOGK = log_ceil_ecdsa(k);
    component mult = BigMultShortLong(n, k, 2*n + LOGK);
    for (var i = 0; i < k; i++) {
        mult.a[i] <== a[i];
        mult.b[i] <== b[i];
    }

    // no carry is possible in the highest order register
    component longshort = LongToShortNoEndCarry(n, 2 * k - 1);
    for (var i = 0; i < 2 * k - 1; i++) {
        longshort.in[i] <== mult.out[i];
    }
    for (var i = 0; i < 2 * k; i++) {
        out[i] <== longshort.out[i];
    }
}

/*
Inputs:
    - BigInts a, b
Output:
    - out = (a < b) ? 1 : 0
*/
template BigLessThanEcdsa(n, k){
    signal input a[k];
    signal input b[k];
    signal output out;

    component lt[k];
    component eq[k];
    for (var i = 0; i < k; i++) {
        lt[i] = LessThan(n);
        lt[i].in[0] <== a[i];
        lt[i].in[1] <== b[i];
        eq[i] = IsEqual();
        eq[i].in[0] <== a[i];
        eq[i].in[1] <== b[i];
    }

    // ors[i] holds (lt[k - 1] || (eq[k - 1] && lt[k - 2]) .. || (eq[k - 1] && .. && lt[i]))
    // ands[i] holds (eq[k - 1] && .. && lt[i])
    // eq_ands[i] holds (eq[k - 1] && .. && eq[i])
    component ors[k - 1];
    component ands[k - 1];
    component eq_ands[k - 1];
    for (var i = k - 2; i >= 0; i--) {
        ands[i] = AND();
        eq_ands[i] = AND();
        ors[i] = OR();

        if (i == k - 2) {
           ands[i].a <== eq[k - 1].out;
           ands[i].b <== lt[k - 2].out;
           eq_ands[i].a <== eq[k - 1].out;
           eq_ands[i].b <== eq[k - 2].out;
           ors[i].a <== lt[k - 1].out;
           ors[i].b <== ands[i].out;
        } else {
           ands[i].a <== eq_ands[i + 1].out;
           ands[i].b <== lt[i].out;
           eq_ands[i].a <== eq_ands[i + 1].out;
           eq_ands[i].b <== eq[i].out;
           ors[i].a <== ors[i + 1].out;
           ors[i].b <== ands[i].out;
        }
     }
     out <== ors[0].out;
}

// leading register of b should be non-zero
template BigMod(n, k) {
    assert(n <= 126);
    signal input a[2 * k];
    signal input b[k];

    signal output div[k + 1];
    signal output mod[k];

    var longdiv[2][50] = long_div_ecdsa(n, k, a, b);
    for (var i = 0; i < k; i++) {
        div[i] <-- longdiv[0][i];
        mod[i] <-- longdiv[1][i];
    }
    div[k] <-- longdiv[0][k];
    component div_range_checks[k + 1];
    for (var i = 0; i <= k; i++) {
        div_range_checks[i] = Num2Bits(n);
        div_range_checks[i].in <== div[i];
    }
    component mod_range_checks[k];
    for (var i = 0; i < k; i++) {
        mod_range_checks[i] = Num2Bits(n);
        mod_range_checks[i].in <== mod[i];
    }

    component mul = BigMult(n, k + 1);
    for (var i = 0; i < k; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== b[i];
    }
    mul.a[k] <== div[k];
    mul.b[k] <== 0;

    for (var i = 0; i < 2 * k + 2; i++) {
        //log(mul.out[i]);
    }

    component add = BigAdd(n, 2 * k + 2);
    for (var i = 0; i < 2 * k; i++) {
        add.a[i] <== mul.out[i];
        if (i < k) {
            add.b[i] <== mod[i];
        } else {
            add.b[i] <== 0;
        }
    }
    add.a[2 * k] <== mul.out[2 * k];
    add.a[2 * k + 1] <== mul.out[2 * k + 1];
    add.b[2 * k] <== 0;
    add.b[2 * k + 1] <== 0;

    for (var i = 0; i < 2 * k + 2; i++) {
        //log(add.out[i]);
    }

    for (var i = 0; i < 2 * k; i++) {
        add.out[i] === a[i];
    }
    add.out[2 * k] === 0;
    add.out[2 * k + 1] === 0;

    component lt = BigLessThanEcdsa(n, k);
    for (var i = 0; i < k; i++) {
        lt.a[i] <== mod[i];
        lt.b[i] <== b[i];
    }
    lt.out === 1;
}

// copied from BigMod to allow a to have m registers and use long_div2
template BigMod2(n, k, m) {
    assert(n <= 126);
    signal input a[m];
    signal input b[k];

    signal output div[m - k + 1];
    signal output mod[k];

    var longdiv[2][50] = long_div2(n, k, m-k, a, b);
    for (var i = 0; i < k; i++) {
        mod[i] <-- longdiv[1][i];
    }
    for (var i = 0; i <= m-k; i++) {
        div[i] <-- longdiv[0][i];
    }
    component div_range_checks[m - k + 1];
    for (var i = 0; i <= m-k; i++) {
        div_range_checks[i] = Num2Bits(n);
        div_range_checks[i].in <== div[i];
    }
    component mod_range_checks[k];
    for (var i = 0; i < k; i++) {
        mod_range_checks[i] = Num2Bits(n);
        mod_range_checks[i].in <== mod[i];
    }

    component mul = BigMult(n, m-k + 1);
    // this might need to be optimized since b has less registers than div
    for (var i = 0; i < k; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== b[i];
    }
    for (var i = k; i <= m-k; i++) {
        mul.a[i] <== div[i];
        mul.b[i] <== 0;
    }

    // mul shouldn't have more registers than a
    for (var i = m; i < 2*(m-k)+2; i++) {
        mul.out[i] === 0;
    }

    component add = BigAdd(n, m);
    for (var i = 0; i < m; i++) {
        add.a[i] <== mul.out[i];
        if (i < k) {
            add.b[i] <== mod[i];
        } else {
            add.b[i] <== 0;
        }
    }

    for (var i = 0; i < m; i++) {
        add.out[i] === a[i];
    }
    add.out[m] === 0;

    component lt = BigLessThanEcdsa(n, k);
    for (var i = 0; i < k; i++) {
        lt.a[i] <== mod[i];
        lt.b[i] <== b[i];
    }
    lt.out === 1;
}



// a[i], b[i] in 0... 2**n-1
// represent a = a[0] + a[1] * 2**n + .. + a[k - 1] * 2**(n * k)
// calculates (a+b)%p, where 0<= a,b < p 
template BigAddModP(n, k){
    assert(n <= 252);
    signal input a[k];
    signal input b[k];
    signal input p[k];
    signal output out[k];

    component add = BigAdd(n,k);
    for (var i = 0; i < k; i++) {
        add.a[i] <== a[i];
        add.b[i] <== b[i];
    }
    component lt = BigLessThanEcdsa(n, k+1);
    for (var i = 0; i < k; i++) {
        lt.a[i] <== add.out[i];
        lt.b[i] <== p[i];
    }
    lt.a[k] <== add.out[k];
    lt.b[k] <== 0; 

    component sub = BigSub(n,k+1);
    for (var i = 0; i < k; i++) {
        sub.a[i] <== add.out[i];
        sub.b[i] <== (1-lt.out) * p[i];
    }
    sub.a[k] <== add.out[k];
    sub.b[k] <== 0;
    
    sub.out[k] === 0;
    for (var i = 0; i < k; i++) {
        out[i] <== sub.out[i];
    }
}

/*
Inputs:
    - BigInts a, b
    - Assume a >= b
Output:
    - BigInt out = a - b
    - underflow = how much is borrowed at the highest digit of subtraction, only nonzero if a < b
*/
template BigSub(n, k) {
    assert(n <= 252);
    signal input a[k];
    signal input b[k];
    signal output out[k];
    signal output underflow;

    component unit0 = ModSub(n);
    unit0.a <== a[0];
    unit0.b <== b[0];
    out[0] <== unit0.out;

    component unit[k - 1];
    for (var i = 1; i < k; i++) {
        unit[i - 1] = ModSubThree(n);
        unit[i - 1].a <== a[i];
        unit[i - 1].b <== b[i];
        if (i == 1) {
            unit[i - 1].c <== unit0.borrow;
        } else {
            unit[i - 1].c <== unit[i - 2].borrow;
        }
        out[i] <== unit[i - 1].out;
    }
    underflow <== unit[k - 2].borrow;
}

// calculates (a - b) % p, where a, b < p
// note: does not assume a >= b
template BigSubModP(n, k){
    assert(n <= 252);
    signal input a[k];
    signal input b[k];
    signal input p[k];
    signal output out[k];
    component sub = BigSub(n, k);
    for (var i = 0; i < k; i++){
        sub.a[i] <== a[i];
        sub.b[i] <== b[i];
    }
    signal flag;
    flag <== sub.underflow;
    component add = BigAdd(n, k);
    for (var i = 0; i < k; i++){
        add.a[i] <== sub.out[i];
        add.b[i] <== p[i];
    }
    signal tmp[k];
    for (var i = 0; i < k; i++){
        tmp[i] <== (1 - flag) * sub.out[i];
        out[i] <== tmp[i] + flag * add.out[i];
    }
}

// Note: deprecated
template BigMultModP(n, k) {
    assert(n <= 252);
    signal input a[k];
    signal input b[k];
    signal input p[k];
    signal output out[k];

    component big_mult = BigMult(n, k);
    for (var i = 0; i < k; i++) {
        big_mult.a[i] <== a[i];
        big_mult.b[i] <== b[i];
    }
    component big_mod = BigMod(n, k);
    for (var i = 0; i < 2 * k; i++) {
        big_mod.a[i] <== big_mult.out[i];
    }
    for (var i = 0; i < k; i++) {
        big_mod.b[i] <== p[i];
    }
    for (var i = 0; i < k; i++) {
        out[i] <== big_mod.mod[i];
    }
}

template BigModInv(n, k) {
    assert(n <= 252);
    signal input in[k];
    signal input p[k];
    signal output out[k];

    // length k
    var inv[50] = mod_inv(n, k, in, p);
    for (var i = 0; i < k; i++) {
        out[i] <-- inv[i];
    }
    component range_checks[k];
    for (var i = 0; i < k; i++) {
        range_checks[i] = Num2Bits(n);
        range_checks[i].in <== out[i];
    }

    component mult = BigMult(n, k);
    for (var i = 0; i < k; i++) {
        mult.a[i] <== in[i];
        mult.b[i] <== out[i];
    }
    component mod = BigMod(n, k);
    for (var i = 0; i < 2 * k; i++) {
        mod.a[i] <== mult.out[i];
    }
    for (var i = 0; i < k; i++) {
        mod.b[i] <== p[i];
    }
    mod.mod[0] === 1;
    for (var i = 1; i < k; i++) {
        mod.mod[i] === 0;
    }
}

/* Taken from circom-ecdsa
Input: 
    - in = in[0] + in[1] * X + ... + in[k-1] * X^{k-1} as signed overflow representation
    - Assume each in[i] is in range (-2^{m-1}, 2^{m-1})
Implements:
    - constrain that in[] evaluated at X = 2^n as a big integer equals zero
*/
template CheckCarryToZeroEcdsa(n, m, k) {
    assert(k >= 2);
    
    var EPSILON = 1; // see below for why 1 is ok
    
    signal input in[k];
    
    signal carry[k];
    component carryRangeChecks[k];
    for (var i = 0; i < k-1; i++){
        carryRangeChecks[i] = Num2Bits(m + EPSILON - n); 
        if( i == 0 ){
            carry[i] <-- in[i] / (1<<n);
            in[i] === carry[i] * (1<<n);
        }
        else{
            carry[i] <-- (in[i]+carry[i-1]) / (1<<n);
            in[i] + carry[i-1] === carry[i] * (1<<n);
        }
        // checking carry is in the range of -2^(m-n-1+eps), 2^(m-n-1+eps)
        carryRangeChecks[i].in <== carry[i] + ( 1<< (m + EPSILON - n - 1));
        // carry[i] is bounded by 2^{m-1} * (2^{-n} + 2^{-2n} + ... ) = 2^{m-n-1} * ( 1/ (1-2^{-n})) < 2^{m-n} by geometric series 
    }
    
    in[k-1] + carry[k-2] === 0;
    
}

/* 
Let X = 2^n 
Input:
    - in is length k + m array in signed overflow representation
    - in = in[0] + in[1] * X + ... + in[k+m-1] * X^{k+m-1}
    - Assume each in[i] is a signed integer such that abs(in[i] * 2^n) < 2^252
    - p is prime in BigInt format passed as parameter
Output:
    - out = out[0] + out[1] * X + ... + out[k-1] * X^{k-1} is BigInt congruent to in (mod p)
Implementation:
    - For i >= k, we precompute X^i = r[i] mod p, where r[i] represented as k registers with r[i][j] in [0, 2^n) 
    - in[i] * X^i is replaced by sum_j in[i] * r[i][j] * X^j
Notes:
    - If each in[i] has absolute value <B, then out[i] has absolute value < (m+1) * 2^n * B
m_out is the expected max number of bits in the output registers
*/
template PrimeReduce(n, k, m, p, m_out){
    signal input in[m+k]; 
    signal output out[k];

    var two[k]; 
    var e[k];
    for(var i=1; i<k; i++){
        two[i]=0;
        e[i]=0;
    }
    two[0] = 2;

    
    e[0] = n;
    var pow2n[50] = mod_exp(n, k, two, p, e); 
    e[0] = k;
    assert(k < (1<<n) );
    var pow2nk[50] = mod_exp(n, k, pow2n, p, e);
    
    var r[m][50]; 
    for(var i=0; i<m; i++){
        // r[i] = 2^{n(k+i)} mod p 
        if(i==0){
            r[i] = pow2nk;
        }else{
            r[i] = prod_mod(n, k, r[i-1], pow2n, p);  
        }
    } 
    var out_sum[k]; 
    for(var i=0; i<k; i++)
        out_sum[i] = in[i];
    for(var i=0; i<m; i++)
        for(var j=0; j<k; j++)
            out_sum[j] += in[i+k] * r[i][j]; // linear constraint 
    for(var i=0; i<k; i++)
        out[i] <== out_sum[i]; 
    /*component range_checks[k];
    for (var i = 0; i < k; i++) {
        range_checks[i] = Num2Bits(m_out+1);
        range_checks[i].in <== out[i] + (1 << m_out);
    }*/
}

/* 
Polynomial multiplication in 2 variables
Input:
    - a = sum_{i=0}^{l-1} sum_{j=0}^{k-1} a[i][j] * w^i * X^j 
    - b = sum_{i=0}^{l-1} sum_{j=0}^{k-1} b[i][j] * w^i * X^j 
Output:
    - out = sum_{i=0}^{2*l-2} sum_{j=0}^{2*k-1} out[i][j] * w^i * X^j 
    - out = a * b as product of polynomials in two variables w, X 
Notes:
    - Uses same xJsnark optimization as BigMultShortLong
    - If a[i][j], b[i][j] have absolute value < B, then out[i][j] has absolute value < l * k * B^2 
Use case: one variable will end up being 2^n; the other will be the field extension generator
*/
template BigMultShortLong2D(n, k, l) {
    signal input a[l][k];
    signal input b[l][k];
    signal output out[2*l-1][2*k-1];

    var prod_val[2*l-1][2*k-1];
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*k-1; j++) {
            prod_val[i][j] = 0;
        }
    }

    for (var i1 = 0; i1 < l; i1 ++) {
        for (var i2 = 0; i2 < l; i2 ++) {
            for (var j1 = 0; j1 < k; j1 ++) {
                for (var j2 = 0; j2 < k; j2 ++) {
                    var i = i1 + i2;
                    var j = j1 + j2;
                    prod_val[i][j] += a[i1][j1] * b[i2][j2];
                }
            }
        }
    }

    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*k-1; j++) {
            out[i][j] <-- prod_val[i][j];
        }
    }
    
    var k2 = (2*k-1 > 2*l-1) ? 2*k-1 : 2*l-1;
    var pow[k2][k2]; 
    for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
        pow[i][j] = i ** j; 

    var a_poly[2*l-1][2*k-1];
    var b_poly[2*l-1][2*k-1];
    var out_poly[2*l-1][2*k-1];
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*k-1; j++) {
            a_poly[i][j] = 0;
            b_poly[i][j] = 0;
            out_poly[i][j] = 0;
            for (var deg1 = 0; deg1 < l; deg1 ++) {
                for (var deg2 = 0; deg2 < k; deg2 ++) {
                    a_poly[i][j] = a_poly[i][j] + a[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                    b_poly[i][j] = b_poly[i][j] + b[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                }
            }
            for (var deg1 = 0; deg1 < 2*l-1; deg1 ++) {
                for (var deg2 = 0; deg2 < 2*k-1; deg2 ++) {
                    out_poly[i][j] = out_poly[i][j] + out[deg1][deg2] * pow[i][deg1] * pow[j][deg2];// (i ** deg1) * (j ** deg2);
                }
            }
        }
    }
    
    for (var i = 0; i < 2*l-1; i++) {
        for (var j = 0; j < 2*k-1; j++) {
            out_poly[i][j] === a_poly[i][j] * b_poly[i][j];
        }
    }
}

/* 
Same as BigMultShortLong2D except a has degrees la - 1, ka - 1 and b has degrees lb - 1, kb - 1
Notes:
    - If a[i][j], b[i][j] have absolute value < B, then out[i][j] has absolute value < min(la, lb) * min(ka, kb) * B^2 
*/
template BigMultShortLong2DUnequal(n, ka, kb, la, lb) {
    signal input a[la][ka];
    signal input b[lb][kb];
    signal output out[la + lb -1][ka + kb -1];

    var prod_val[la + lb -1][ka + kb -1];
    for (var i = 0; i < la + lb -1; i++) {
        for (var j = 0; j < ka + kb -1; j++) {
            prod_val[i][j] = 0;
        }
    }

    for (var i1 = 0; i1 < la; i1 ++) {
        for (var i2 = 0; i2 < lb; i2 ++) {
            for (var j1 = 0; j1 < ka; j1 ++) {
                for (var j2 = 0; j2 < kb; j2 ++) {
                    var i = i1 + i2;
                    var j = j1 + j2;
                    prod_val[i][j] += a[i1][j1] * b[i2][j2];
                }
            }
        }
    }

    for (var i = 0; i < la + lb -1; i++) {
        for (var j = 0; j < ka + kb -1; j++) {
            out[i][j] <-- prod_val[i][j];
        }
    }

    var k2 = (ka + kb -1 > la + lb -1) ? ka + kb - 1 : la + lb -1;
    var pow[k2][k2]; 
    for(var i = 0; i<k2; i++)for(var j=0; j<k2; j++)
        pow[i][j] = i ** j; 

    var a_poly[la + lb - 1][ka + kb -1];
    var b_poly[la + lb - 1][ka + kb -1];
    var out_poly[la + lb - 1][ka + kb -1];
    for (var i = 0; i < la + lb - 1; i++) {
        for (var j = 0; j < ka + kb - 1; j++) {
            a_poly[i][j] = 0;
            b_poly[i][j] = 0;
            out_poly[i][j] = 0;
            for (var deg1 = 0; deg1 < la + lb - 1; deg1 ++) {
                if (deg1 < la) {
                    for (var deg2 = 0; deg2 < ka; deg2 ++) {
                        a_poly[i][j] = a_poly[i][j] + a[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; //(i ** deg1) * (j ** deg2);
                    }
                }
                if (deg1 < lb) {
                    for (var deg2 = 0; deg2 < kb; deg2 ++) {
                        b_poly[i][j] = b_poly[i][j] + b[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                    }
		        }
                for (var deg2 = 0; deg2 < ka + kb -1; deg2 ++) {
                    out_poly[i][j] = out_poly[i][j] + out[deg1][deg2] * pow[i][deg1] * pow[j][deg2]; // (i ** deg1) * (j ** deg2);
                }
            }
        }
    }

    for (var i = 0; i < la + lb - 1; i++) {
        for (var j = 0; j < ka + kb - 1; j++) {
            out_poly[i][j] === a_poly[i][j] * b_poly[i][j];
        }
    }
}


