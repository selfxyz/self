pragma circom 2.1.6;

include "../sha2/sha2Common.circom";

template ParityT(CHUNK_NUMBER) {
    signal input a[CHUNK_NUMBER];
    signal input b[CHUNK_NUMBER];
    signal input c[CHUNK_NUMBER];
    signal output out[CHUNK_NUMBER];
    
    component xor3 = XOR3_v3(32);
    
    for (var k = 0; k < 32; k++) {
        xor3.a[k] <== a[k];
        xor3.b[k] <== b[k];
        xor3.c[k] <== c[k];
    }
    
    for (var k = 0; k < 32; k++) {
        out[k] <== xor3.out[k];
    }
}