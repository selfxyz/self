pragma circom 2.1.5;

template Xor2(n) {
    signal input a[n];
    signal input b[n];
    signal output out[n];

    for (var k=0; k<n; k++) {
        out[k] <== a[k] + b[k] - 2*a[k]*b[k];
    }
}
