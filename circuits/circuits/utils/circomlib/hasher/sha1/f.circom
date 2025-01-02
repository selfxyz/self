pragma circom 2.1.6;

include "./parity.circom";

template ChT(n) {
    signal input a[n];
    signal input b[n];
    signal input c[n];
    signal output out[n];
    
    for (var k = 0; k < n; k++) {
        out[k] <== a[k] * (b[k] - c[k]) + c[k];
    }
}

template MajT(n) {
    signal input a[n];
    signal input b[n];
    signal input c[n];
    signal output out[n];
    signal mid[n];
    
    for (var k = 0; k < n; k++) {
        mid[k] <== b[k] * c[k];
        out[k] <== a[k] * (b[k] + c[k] - 2 * mid[k]) + mid[k];
    }
}

template fT(T) {
    signal input b[32];
    signal input c[32];
    signal input d[32];
    signal output out[32];
    
    component maj = MajT(32);
    component parity = ParityT(32);
    component ch = ChT(32);
    
    // ch(x, y, z)
    for (var k = 0; k < 32; k++) {
        ch.a[k] <== b[k];
        ch.b[k] <== c[k];
        ch.c[k] <== d[k];
    }
    
    // parity(x, y, z)
    for (var k = 0; k < 32; k++) {
        parity.a[k] <== b[k];
        parity.b[k] <== c[k];
        parity.c[k] <== d[k];
    }
    
    // maj(x, y, z)
    for (var k = 0; k < 32; k++) {
        maj.a[k] <== b[k];
        maj.b[k] <== c[k];
        maj.c[k] <== d[k];
    }
    
    if (T <= 19) {
        for (var k = 0; k < 32; k++) {
            out[k] <== ch.out[k];
        }
    } else {
        if (T <= 39 || T >= 60) {
            for (var k = 0; k < 32; k++) {
                out[k] <== parity.out[k];
            }
        } else {
            for (var k = 0; k < 32; k++) {
                out[k] <== maj.out[k];
            }
        }
    }
}