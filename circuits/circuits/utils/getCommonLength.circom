pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

// computes the first n common bits of the hashes
template PoseidonHashesCommonLength() {
    signal input hash1;
    signal input hash2;
    signal output out;

    component converter1 = Num2Bits(256);
    converter1.in <== hash1;
    signal bits1[256];
    bits1 <== converter1.out;

    component converter2 = Num2Bits(256);
    converter2.in <== hash2;
    signal bits2[256];
    bits2 <== converter2.out;

    component iseq[256];
    signal pop[256];

    iseq[0] = IsEqual();
    bits1[0] ==> iseq[0].in[0];
    bits2[0] ==> iseq[0].in[1];
    pop[0] <== iseq[0].out;

    for (var i = 1; i < 256; i++) {
        var temp = bits2[i] - bits1[i];
        iseq[i] = IsEqual();
        bits1[i] ==> iseq[i].in[0];
        bits2[i] ==> iseq[i].in[1];
        pop[i] <== iseq[i].out*pop[i-1]; 
    }   

    var added = 0;
    var mult = 1;
    for(var i = 0; i<256;i++){
        mult = mult*pop[i];
        added += pop[i];
    }

    added ==> out;

}

