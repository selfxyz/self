pragma circom 2.1.3;

template RotL(n, l) {
    signal input in[n];
    signal output out[n];

    for (var i=(n-1); i >= 0; i--) {
        out[i] <== in[ (i+l)%n ];
    }
}