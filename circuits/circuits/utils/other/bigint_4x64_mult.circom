pragma circom 2.0.2;

include "bigint.circom";

template A2NoCarry() {
    signal input a[4];

    // these representations have overflowed, nonnegative registers
    signal output a2[7];
    component a2Comp = BigMultNoCarry(64, 64, 64, 4, 4);
    for (var i = 0; i < 4; i++) {
        a2Comp.a[i] <== a[i];
        a2Comp.b[i] <== a[i];
    }
    for (var i = 0; i < 7; i++) {
        a2[i] <== a2Comp.out[i]; // 130 bits
    }
}

template A3NoCarry() {
    signal input a[4];

    // these representations have overflowed, nonnegative registers
    signal a2[7];
    component a2Comp = BigMultNoCarry(64, 64, 64, 4, 4);
    for (var i = 0; i < 4; i++) {
        a2Comp.a[i] <== a[i];
        a2Comp.b[i] <== a[i];
    }
    for (var i = 0; i < 7; i++) {
        a2[i] <== a2Comp.out[i]; // 130 bits
    }
    signal output a3[10];
    component a3Comp = BigMultNoCarry(64, 130, 64, 7, 4);
    for (var i = 0; i < 7; i++) {
        a3Comp.a[i] <== a2[i];
    }
    for (var i = 0; i < 4; i++) {
        a3Comp.b[i] <== a[i];
    }
    for (var i = 0; i < 10; i++) {
        a3[i] <== a3Comp.out[i]; // 197 bits
    }
}

template A2B1NoCarry() {
    signal input a[4];
    signal input b[4];

    // these representations have overflowed, nonnegative registers
    signal a2[7];
    component a2Comp = BigMultNoCarry(64, 64, 64, 4, 4);
    for (var i = 0; i < 4; i++) {
        a2Comp.a[i] <== a[i];
        a2Comp.b[i] <== a[i];
    }
    for (var i = 0; i < 7; i++) {
        a2[i] <== a2Comp.out[i]; // 130 bits
    }

    signal output a2b1[10];
    component a2b1Comp = BigMultNoCarry(64, 130, 64, 7, 4);
    for (var i = 0; i < 7; i++) {
        a2b1Comp.a[i] <== a2[i];
    }
    for (var i = 0; i < 4; i++) {
        a2b1Comp.b[i] <== b[i];
    }
    for (var i = 0; i < 10; i++) {
        a2b1[i] <== a2b1Comp.out[i]; // 197 bits
    }
}

template A1B1C1NoCarry() {
    signal input a[4];
    signal input b[4];
    signal input c[4];

    // these representations have overflowed, nonnegative registers
    signal a1b1[7];
    component a1b1Comp = BigMultNoCarry(64, 64, 64, 4, 4);
    for (var i = 0; i < 4; i++) {
        a1b1Comp.a[i] <== a[i];
        a1b1Comp.b[i] <== b[i];
    }
    for (var i = 0; i < 7; i++) {
        a1b1[i] <== a1b1Comp.out[i]; // 130 bits
    }

    signal output a1b1c1[10];
    component a1b1c1Comp = BigMultNoCarry(64, 130, 64, 7, 4);
    for (var i = 0; i < 7; i++) {
        a1b1c1Comp.a[i] <== a1b1[i];
    }
    for (var i = 0; i < 4; i++) {
        a1b1c1Comp.b[i] <== c[i];
    }
    for (var i = 0; i < 10; i++) {
        a1b1c1[i] <== a1b1c1Comp.out[i]; // 197 bits
    }
}