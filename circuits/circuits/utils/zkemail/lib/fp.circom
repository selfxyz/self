pragma circom 2.1.6;

include "../../circomlib/bitify/bitify.circom";
include "../../circomlib/bitify/comparators.circom";
include "../../circomlib/utils/sign.circom";
include "./bigint.circom";
include "./bigint-func.circom";


/// @title FpMul
/// @notice Multiple two numbers in Fp
/// @param a Input 1 to FpMul; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param b Input 2 to FpMul; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param p The modulus; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @output out The result of the FpMul; asserted to be less than `p`  
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

    var long_div_out[2][100] = long_div(n, k, k, ab_proper, p);

    // Since we're only computing a*b, we know that q < p will suffice, so we
    // know it fits into k chunks and can do size n range checks.
    signal q[k];
    component q_range_check[k];
    signal r[k];
    component r_range_check[k];
    component r_p_lt_check = BigLessThan(n,k);
    for (var i = 0; i < k; i++) {
        q[i] <-- long_div_out[0][i];
        q_range_check[i] = Num2Bits(n);
        q_range_check[i].in <== q[i];

        r[i] <-- long_div_out[1][i];
        r_range_check[i] = Num2Bits(n);
        r_range_check[i].in <== r[i];

        r_p_lt_check.a[i] <== r[i];
        r_p_lt_check.b[i] <== p[i];
    }
    r_p_lt_check.out === 1;

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
