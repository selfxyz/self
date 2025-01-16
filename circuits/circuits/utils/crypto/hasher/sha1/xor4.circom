pragma circom 2.1.6;

template Xor4(n) {
    signal input a[n];
    signal input b[n];
    signal input c[n];
    signal input d[n];
    
    signal mid[n];
    signal aTemp[n];
    
    signal output out[n];
    
    for (var k = 0; k < n; k++) {
        mid[k] <== b[k] * c[k];
        aTemp[k] <== a[k] * (1 - 2 * b[k] - 2 * c[k] + 4 * mid[k]) + b[k] + c[k] - 2 * mid[k];
        out[k] <== aTemp[k] - 2 * d[k] * aTemp[k] + d[k];
    }
}