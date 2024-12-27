pragma circom 2.1.6;

include "../../circomlib/bitify/comparators.circom";
include "../../circomlib/bitify/bitify.circom";
include "../../circomlib/bitify/gates.circom";
include "./bigint-func.circom";


/// @template BigLessThan
/// @notice Less than comparison for big integers
/// @param n The number of bits in each chunk
/// @param k The number of chunks
/// @param a The first bigint; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param b The second bigint; assumes to consist of `k` chunks, each of which must fit in `n` bits
/// @param out The output of the comparison
template BigLessThan(n, k){
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


/// @template CheckCarryToZero
/// @notice Check that in[] as a big integer is zero
/// @param n The number of bits in each chunk
/// @param m 
/// @param k The number of chunks
/// @input in The input big integer; assumes elements to be in the range -2^(m-1) to 2^(m-1)
template CheckCarryToZero(n, m, k) {
    assert(k >= 2);

    var EPSILON = 3;

    assert(m + EPSILON <= 253);

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
        // checking carry is in the range of - 2^(m-n-1+eps), 2^(m+-n-1+eps)
        carryRangeChecks[i].in <== carry[i] + ( 1<< (m + EPSILON - n - 1));
    }
    in[k-1] + carry[k-2] === 0;
}
