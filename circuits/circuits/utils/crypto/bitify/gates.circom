pragma circom 2.0.0;

include "circomlib/circuits/gates.circom";


// Xor for n pairs
template Xor2(n) {
    signal input in1[n];
    signal input in2[n];
    signal output out[n];

    for (var k = 0; k < n; k++) {
        out[k] <== in1[k] + in2[k] - 2 * in1[k] * in2[k];
    }
}
