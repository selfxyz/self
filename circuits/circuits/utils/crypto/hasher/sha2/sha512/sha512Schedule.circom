pragma circom 2.0.0;

include "../sha2Common.circom";

//------------------------------------------------------------------------------
// message schedule for SHA384 / SHA512
//
// NOTE: the individual 64 bit words are in little-endian order 
//

template Sha2_384_512Schedule() {
    
    signal input  chunkBits[16][64]; 
    signal output outWords [80]; 

    signal outBits[80][64]; 
    
    
    component sumN[16];
    for (var k = 0; k < 16; k++) {
        sumN[k] = GetSumOfNElements(64);
        for (var i = 0; i < 64; i++) {
            sumN[k].in[i] <== (1 << i) * chunkBits[k][i];
        }
        outWords[k] <== sumN[k].out;
        outBits [k] <== chunkBits[k];
    }
    
    component s0Xor [80 - 16][64];
    component s1Xor [80 - 16][64];
    component modulo[80 - 16];
    
    component bits2Num[80 - 16];

    component s0Sum [80 - 16];
    component s1Sum [80 - 16];

    for (var m = 16; m < 80; m++) {
        var r = m - 16;
        var k = m - 15;
        var l = m - 2;
        
        s0Sum[m - 16] = GetSumOfNElements(64);
        s1Sum[m - 16] = GetSumOfNElements(64);
        
        for (var i = 0; i < 64; i++) {
            
            // note: with XOR3_v2, circom optimizes away the constant zero `z` thing
            // with XOR3_v1, it does not. But otherwise it's the same number of constraints.
            
            s0Xor[r][i] = XOR3_v2();
            s0Xor[r][i].x <== outBits[k][ (i + 1) % 64 ];
            s0Xor[r][i].y <== outBits[k][ (i + 8) % 64 ];
            s0Xor[r][i].z <== (i < 64 - 7) ? outBits[k][ (i + 7) ] : 0;
            s0Sum[m - 16].in[i] <== (1 << i) * s0Xor[r][i].out;
            
            s1Xor[r][i] = XOR3_v2();
            s1Xor[r][i].x <== outBits[l][ (i + 19) % 64 ];
            s1Xor[r][i].y <== outBits[l][ (i + 61) % 64 ];
            s1Xor[r][i].z <== (i < 64 - 6) ? outBits[l][ (i + 6) ] : 0;
            s1Sum[m - 16].in[i] <== (1 << i) * s1Xor[r][i].out;
            
        }
        
        modulo[r] = GetLastNBits(64);
        modulo[r].in <== s1Sum[r].out + outWords[m - 7] + s0Sum[r].out + outWords[m - 16];
        modulo[r].out ==> outBits[m];
        bits2Num[r] = Bits2Num(64);
        bits2Num[r].in <== outBits[m];
        bits2Num[r].out ==> outWords[m];
    }
}

//------------------------------------------------------------------------------

