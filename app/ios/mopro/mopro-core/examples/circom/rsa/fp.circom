pragma circom 2.1.5;

include "./node_modules/circomlib/circuits/bitify.circom";
include "./node_modules/circomlib/circuits/comparators.circom";
include "./node_modules/circomlib/circuits/sign.circom";
include "./bigint.circom";
include "./bigint_func.circom";

// These functions operate over values in Z/Zp for some integer p (typically,
// but not necessarily prime). Values are stored as standard bignums with k
// chunks of n bits, but intermediate values often have "overflow" bits inside
// various chunks.
//
// These Fp functions will always correctly generate witnesses mod p, but they
// do not *check* that values are normalized to < p; they only check that
// values are correct mod p. This is to save the comparison circuit.
// They *will* always check for intended results mod p (soundness), but it may
// not have a unique intermediate signal.
//
// Conversely, some templates may not be satisfiable if the input witnesses are
// not < p. This does not break completeness, as honest provers will always
// generate witnesses which are canonical (between 0 and p).

// a * b = r mod p
// a * b - p * q - r for some q
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
    var ab_proper[200] = getProperRepresentation(n + n + log_ceil(k), n, 2*k-1, ab);

    var long_div_out[2][100] = long_div(n, k, k, ab_proper, p);

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

// Lifted from https://sourcegraph.com/github.com/darkforest-eth/circuits/-/blob/range_proof/circuit.circom
// NB: RangeProof is inclusive.
// input: field element, whose abs is claimed to be less than max_abs_value
// output: none
// we also want something like 4 * (abs(in) + max_abs_value) < 2 ** bits
// and bits << 256
// NB: RangeProof is inclusive.
// input: field element, whose abs is claimed to be <= than max_abs_value
// output: none
// also checks that both max and abs(in) are expressible in `bits` bits
template RangeProof(bits) {
    signal input in;
    signal input max_abs_value;

    /* check that both max and abs(in) are expressible in `bits` bits  */
    component n2b1 = Num2Bits(bits+1);
    n2b1.in <== in + (1 << bits);
    component n2b2 = Num2Bits(bits);
    n2b2.in <== max_abs_value;

    /* check that in + max is between 0 and 2*max */
    component lowerBound = LessThan(bits+1);
    component upperBound = LessThan(bits+1);

    lowerBound.in[0] <== max_abs_value + in;
    lowerBound.in[1] <== 0;
    lowerBound.out === 0;

    upperBound.in[0] <== 2 * max_abs_value;
    upperBound.in[1] <== max_abs_value + in;
    upperBound.out === 0;
}

// input: n field elements, whose abs are claimed to be less than max_abs_value
// output: none
template MultiRangeProof(n, bits) {
    signal input in[n];
    signal input max_abs_value;
    component rangeProofs[n];

    for (var i = 0; i < n; i++) {
        rangeProofs[i] = RangeProof(bits);
        rangeProofs[i].in <== in[i];
        rangeProofs[i].max_abs_value <== max_abs_value;
    }
}

template IsNegative(){
    signal input in;
    signal output out;
    component n2b = Num2Bits(254);
    component sign = Sign();
    in ==> n2b.in;
    for (var i = 0; i<254; i++) {
        n2b.out[i] ==> sign.in[i];
    }
    sign.sign ==> out;
}
