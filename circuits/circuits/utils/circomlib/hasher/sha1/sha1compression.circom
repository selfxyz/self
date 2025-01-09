pragma circom 2.1.6;

include "./rotate.circom";
include "./xor4.circom";
include "./constants.circom";
include "./t.circom";
include "../../bitify/operations.circom";

template Sha1compression() {
    signal input hin[160];
    signal input inp[512];
    signal output out[160];
    
    signal a[81][32];
    signal b[81][32];
    signal c[81][32];
    signal d[81][32];
    signal e[81][32];
    signal w[80][32];
    
    var i;
    
    component rotl1[64];
    for (i = 0; i < 64; i++){
        rotl1[i] = RotL(32, 1);
    }
    
    component xor4[64];
    for (i = 0; i < 64; i++){
        xor4[i] = Xor4(32);
    }
    
    component rotl30[80];
    for (i = 0; i <= 79; i++){
        rotl30[i] = RotL(32, 30);
    }
    
    component kT[80];
    for (i = 0; i <= 79; i++){
        kT[i] = K_sha1(i);
    }
    
    component tTmp[80];
    for (i = 0; i <= 79; i++){
        tTmp[i] = T(i);

    }
    
    component fSum[5];
    for (i = 0; i < 5; i++){
        fSum[i] = BinSum_sha1(2, 32);
    }
    
    for (var t = 0; t <= 15; t++) {
        for (var k = 0; k < 32; k++) {
            w[t][k] <== inp[t * 32 + k];
        }
    }
    
    for (var t = 16; t <= 79; t++) {
        for (var k = 0; k < 32; k++) {
            xor4[t - 16].a[k] <== w[t - 3][k];
            xor4[t - 16].b[k] <== w[t - 8][k];
            xor4[t - 16].c[k] <== w[t - 14][k];
            xor4[t - 16].d[k] <== w[t - 16][k];
        }
        for (var k = 0; k < 32; k++) {
            rotl1[t - 16].in[k] <== xor4[t - 16].out[k];
        }
        for (var k = 0; k < 32; k++) {
            w[t][k] <== rotl1[t - 16].out[k];
        }
    }
    
    // Initialize five working variables
    for (var k = 0; k < 32; k++) {
        a[0][k] <== hin[k];
        b[0][k] <== hin[32 * 1 + k];
        c[0][k] <== hin[32 * 2 + k];
        d[0][k] <== hin[32 * 3 + k];
        e[0][k] <== hin[32 * 4 + k];
    }
    
    for (var t = 0; t <= 79; t++) {
        for (var k = 0; k < 32; k++) {
            tTmp[t].a[k] <== a[t][k];
            tTmp[t].b[k] <== b[t][k];
            tTmp[t].c[k] <== c[t][k];
            tTmp[t].d[k] <== d[t][k];
            tTmp[t].e[k] <== e[t][k];
            tTmp[t].kT[k] <== kT[t].out[k];
            tTmp[t].w[k] <== w[t][k];
            
            rotl30[t].in[k] <== b[t][k];
        }
        
        for (var k = 0; k < 32; k++) {
            e[t + 1][k] <== d[t][k];
            d[t + 1][k] <== c[t][k];
            c[t + 1][k] <== rotl30[t].out[k];
            b[t + 1][k] <== a[t][k];
            a[t + 1][k] <== tTmp[t].out[k];
        }
    }
    
    for (var k = 0; k < 32; k++) {
        fSum[0].in[0][k] <== hin[31 * 1 - k];
        fSum[0].in[1][k] <== a[80][31 - k];
        
        fSum[1].in[0][k] <== hin[31 * 2 - k + 1];
        fSum[1].in[1][k] <== b[80][31 - k];
        
        fSum[2].in[0][k] <== hin[31 * 3 - k + 2];
        fSum[2].in[1][k] <== c[80][31 - k];
        
        fSum[3].in[0][k] <== hin[31 * 4 - k + 3 ];
        fSum[3].in[1][k] <== d[80][31 - k];
        
        fSum[4].in[0][k] <== hin[31 * 5 - k + 4];
        fSum[4].in[1][k] <== e[80][31 - k];
    }
    
    for (var k = 0; k < 32; k++) {
        out[k] <== fSum[0].out[k];
        out[k + 32 * 1] <== fSum[1].out[k];
        out[k + 32 * 2] <== fSum[2].out[k];
        out[k + 32 * 3] <== fSum[3].out[k];
        out[k + 32 * 4] <== fSum[4].out[k];
    }
}
