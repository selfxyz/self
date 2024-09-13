pragma circom 2.1.6;
 
include "@zk-email/circuits/lib/bigint.circom";

// w = 32
// e_bits = 17
// nb is the length of the base and modulus
// calculates (base^exp) % modulus, exp = 2^(e_bits - 1) + 1 = 2^16 + 1
template PowerMod(w, nb, e_bits) {
    assert(e_bits >= 2);

    signal input base[nb];
    signal input modulus[nb];

    signal output out[nb];

    component muls[e_bits];

    for (var i = 0; i < e_bits; i++) {
        muls[i] = BigMultModP(w, nb);

        for (var j = 0; j < nb; j++) {
            muls[i].p[j] <== modulus[j];
        }
    }

    for (var i = 0; i < nb; i++) {
        muls[0].a[i] <== base[i];
        muls[0].b[i] <== base[i];
    }

    for (var i = 1; i < e_bits - 1; i++) {
        for (var j = 0; j < nb; j++) {
            muls[i].a[j] <== muls[i - 1].out[j];
            muls[i].b[j] <== muls[i - 1].out[j];
        }
    }

    for (var i = 0; i < nb; i++) {
        muls[e_bits - 1].a[i] <== base[i];
        muls[e_bits - 1].b[i] <== muls[e_bits - 2].out[i];
    }

    for (var i = 0; i < nb; i++) {
        out[i] <== muls[e_bits - 1].out[i];
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

template BigMult(n, k) {
    signal input a[k];
    signal input b[k];
    signal output out[2 * k];

    var LOGK = log_ceil(k);
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
    runningCarryRangeChecks[0] = Num2Bits(n + log_ceil(k));
    runningCarryRangeChecks[0].in <== runningCarry[0];
    runningCarry[0] * (1 << n) === in[0] - out[0];
    for (var i = 1; i < k; i++) {
        runningCarry[i] <-- (in[i] - out[i] + runningCarry[i-1]) / (1 << n);
        runningCarryRangeChecks[i] = Num2Bits(n + log_ceil(k));
        runningCarryRangeChecks[i].in <== runningCarry[i];
        runningCarry[i] * (1 << n) === in[i] - out[i] + runningCarry[i-1];
    }
    runningCarry[k-1] === out[k];
}
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
template BigMod(n, k) {
    assert(n <= 126);
    signal input a[2 * k];
    signal input b[k];

    signal output div[k + 1];
    signal output mod[k];

    var longdiv[2][150] = long_div_2(n, k, a, b);
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

    component lt = BigLessThan(n, k);
    for (var i = 0; i < k; i++) {
        lt.a[i] <== mod[i];
        lt.b[i] <== b[i];
    }
    lt.out === 1;
}
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
function SplitFn(in, n, m) {
    return [in % (1 << n), (in \ (1 << n)) % (1 << m)];
}

function SplitThreeFn(in, n, m, k) {
    return [in % (1 << n), (in \ (1 << n)) % (1 << m), (in \ (1 << n + m)) % (1 << k)];
}

function long_div_2(n, k, a, b) {
    return long_div2(n, k, k, a, b);
}

function long_div2(n, k, m, a, b){
    var out[2][150];
    // assume k+m < 150
    var remainder[150];
    for (var i = 0; i < m + k; i++) {
        remainder[i] = a[i];
    }

    var dividend[150];
    for (var i = m; i >= 0; i--) {
        if (i == m) {
            dividend[k] = 0;
            for (var j = k - 1; j >= 0; j--) {
                dividend[j] = remainder[j + m];
            }
        } else {
            for (var j = k; j >= 0; j--) {
                dividend[j] = remainder[j + i];
            }
        }
        out[0][i] = short_div(n, k, dividend, b);
        var mult_shift[150] = long_scalar_mult(n, k, out[0][i], b);
        var subtrahend[150];
        for (var j = 0; j < m + k; j++) {
            subtrahend[j] = 0;
        }
        for (var j = 0; j <= k; j++) {
            if (i + j < m + k) {
               subtrahend[i + j] = mult_shift[j];
            }
        }
        remainder = long_sub(n, m + k, remainder, subtrahend);
    }
    for (var i = 0; i < k; i++) {
        out[1][i] = remainder[i];
    }
    out[1][k] = 0;
    return out;
}