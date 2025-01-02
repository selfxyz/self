pragma circom 2.1.6;

include "./rotate.circom";
include "circomlib/circuits/comparators.circom";
include "./f.circom";
include "./constants.circom";
include "../../int/arithmetic.circom";

template T(t) {

    signal input a[32];
    signal input b[32];
    signal input c[32];
    signal input d[32];
    signal input e[32];
    signal input kT[32];
    signal input w[32];
    
    signal output out[32];
    
    component rotatel5 = RotL(32, 5);
    component f = fT(t);
    
    var k;
    for (k = 0; k < 32; k++) {
        rotatel5.in[k] <== a[k];
        f.b[k] <== b[k];
        f.c[k] <== c[k];
        f.d[k] <== d[k];
    }
    
    component sumBinary = BinSum_sha1(5, 32);
    var nout = 35; 
    
    for (k = 0; k < 32; k++) {
        sumBinary.in[0][k] <== rotatel5.out[31 - k];
        sumBinary.in[1][k] <== f.out[31 - k];
        sumBinary.in[2][k] <== e[31 - k];
        sumBinary.in[3][k] <== kT[31 - k];
        sumBinary.in[4][k] <== w[31 - k];
    }
    
    component sum = Bits2Num(nout);
    for (k = 0; k < nout; k++) {
        sum.in[k] <== sumBinary.out[k];
    }
    
    // perform sum modulo 32
    component getLastNBits = GetLastNBits(32);
    getLastNBits.in <== sum.out;

    for (k = 0; k < 32; k++) {
        out[k] <== getLastNBits.out[31 - k];
    }
  
}