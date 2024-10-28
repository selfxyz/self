pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/sign.circom";
include "./bigInt.circom";
include "./bigIntFunc.circom";


/// @title FpMul
/// @notice Multiple two numbers in Fp
/// @param a Input 1 to FpMul; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param b Input 2 to FpMul; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param p The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the FpMul
template FpMul(n, k) {
    assert(n + n + log_ceil(k) + 2 <= 252);

    signal input a[k];
    signal input b[k];
    signal input p[k];

    signal output out[k];

    signal v_ab[2*k-1];
    for (var x = 0; x < 2*k-1; x++) {
        var v_a = poly_eval(k, a, x);
        var v_b = poly_eval(k, b, x);
        v_ab[x] <== v_a * v_b;
    }

    var ab[200] = poly_interp(2*k-1, v_ab);
    // ab_proper has length 2*k
    var ab_proper[100] = getProperRepresentation(n + n + log_ceil(k), n, 2*k-1, ab);

    var long_div_out[2][100] = long_div_5args(n, k, k, ab_proper, p);

    // Since we're only computing a*b, we know that q < p will suffice, so we
    // know it fits into k chunks and can do size n range checks.
    signal q[k];
    component q_range_check[k];
    signal r[k];
    component r_range_check[k];
    for (var i = 0; i < k; i++) {
        q[i] <-- long_div_out[0][i];
        q_range_check[i] = Num2Bits(n);
        q_range_check[i].in <== q[i];

        r[i] <-- long_div_out[1][i];
        r_range_check[i] = Num2Bits(n);
        r_range_check[i].in <== r[i];
    }

    signal v_pq_r[2*k-1];
    for (var x = 0; x < 2*k-1; x++) {
        var v_p = poly_eval(k, p, x);
        var v_q = poly_eval(k, q, x);
        var v_r = poly_eval(k, r, x);
        v_pq_r[x] <== v_p * v_q + v_r;
    }

    signal v_t[2*k-1];
    for (var x = 0; x < 2*k-1; x++) {
        v_t[x] <== v_ab[x] - v_pq_r[x];
    }

    var t[200] = poly_interp(2*k-1, v_t);
    component tCheck = CheckCarryToZero(n, n + n + log_ceil(k) + 2, 2*k-1);
    for (var i = 0; i < 2*k-1; i++) {
        tCheck.in[i] <== t[i];
    }

    for (var i = 0; i < k; i++) {
        out[i] <== r[i];
    }
}
function div_ceil(m, n) {
    var ret = 0;
    if (m % n == 0) {
        ret = m \ n;
    } else {
        ret = m \ n + 1;
    }
    return ret;
}

// m bits per overflowed register (values are potentially negative)
// n bits per properly-sized register
// in has k registers
// out has k + ceil(m/n) - 1 + 1 registers. highest-order potentially negative,
// all others are positive
// - 1 since the last register is included in the last ceil(m/n) array
// + 1 since the carries from previous registers could push you over
function getProperRepresentation(m, n, k, in) {
    var ceilMN = div_ceil(m, n);

    var out[100]; // should be out[k + ceilMN]
    assert(k + ceilMN < 100);
    for (var i = 0; i < k; i++) {
        out[i] = in[i];
    }
    for (var i = k; i < 100; i++) {
        out[i] = 0;
    }
    assert(n <= m);
    for (var i = 0; i+1 < k + ceilMN; i++) {
        assert((1 << m) >= out[i] && out[i] >= -(1 << m));
        var shifted_val = out[i] + (1 << m);
        assert(0 <= shifted_val && shifted_val <= (1 << (m+1)));
        out[i] = shifted_val & ((1 << n) - 1);
        out[i+1] += (shifted_val >> n) - (1 << (m - n));
    }

    return out;
}

// Evaluate polynomial a at point x
function poly_eval(len, a, x) {
    var v = 0;
    for (var i = 0; i < len; i++) {
        v += a[i] * (x ** i);
    }
    return v;
}

// Interpolate a degree len-1 polynomial given its evaluations at 0..len-1
function poly_interp(len, v) {
    assert(len <= 200);
    var out[200];
    for (var i = 0; i < len; i++) {
        out[i] = 0;
    }

    // Product_{i=0..len-1} (x-i)
    var full_poly[201];
    full_poly[0] = 1;
    for (var i = 0; i < len; i++) {
        full_poly[i+1] = 0;
        for (var j = i; j >= 0; j--) {
            full_poly[j+1] += full_poly[j];
            full_poly[j] *= -i;
        }
    }

    for (var i = 0; i < len; i++) {
        var cur_v = 1;
        for (var j = 0; j < len; j++) {
            if (i == j) {
                // do nothing
            } else {
                cur_v *= i-j;
            }
        }
        cur_v = v[i] / cur_v;

        var cur_rem = full_poly[len];
        for (var j = len-1; j >= 0; j--) {
            out[j] += cur_v * cur_rem;
            cur_rem = full_poly[j] + i * cur_rem;
        }
        assert(cur_rem == 0);
    }

    return out;
}
