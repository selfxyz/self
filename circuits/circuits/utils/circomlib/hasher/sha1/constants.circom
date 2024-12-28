pragma circom 2.1.6;

include "circomlib/circuits/bitify.circom";

template H_sha1(x) {
    signal output out[32];
    var c[5] = [
    0x67452301,
    0xefcdab89,
    0x98badcfe,
    0x10325476,
    0xc3d2e1f0
    ];
    
    component bitify = Num2Bits(32);
    bitify.in <== c[x];
    
    for (var k = 0; k < 32; k++) {
        out[k] <== bitify.out[31 - k];
    }
}

template K_sha1(t) {
    signal output out[32];
    var k[4] = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
    
    component bitify = Num2Bits(32);
    
    var i;
    
    if (0 <= t && t <= 19) {
        bitify.in <== k[0];
    }
    
    if (20 <= t && t <= 39) {
        bitify.in <== k[1];
    }
    
    if (40 <= t && t <= 59) {
        bitify.in <== k[2];
    }
    
    if (60 <= t && t <= 79) {
        bitify.in <== k[3];
    }
    
    for (var k = 0; k < 32; k++) {
        out[k] <== bitify.out[31 - k];
    }
}