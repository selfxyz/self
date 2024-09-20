pragma circom 2.1.9;

include "./rotate.circom";  
include "./xor4.circom";
include "./constants.circom";
include "./t.circom";

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

    component rotl_1[64];
    for (i=0; i<64; i++) rotl_1[i] = RotL(32, 1);
    
    component xor4[64];
    for (i=0; i<64; i++) xor4[i] = Xor4(32);

    component rotl_30[80];
    for (i=0; i<=79; i++) rotl_30[i] = RotL(32, 30);

    component K_t[80];
    for (i=0; i<=79; i++) K_t[i] = K_sha1(i);

    component t_tmp[80];
    for (i=0; i<=79; i++) t_tmp[i] = T(i);

    component fsum[5];
    for (i=0; i<5; i++) fsum[i] = BinSum(32, 2);
    
    var k;
    var t;

    for (t=0; t<=15; t++) {
        for (k=0; k<32; k++) {
            w[t][k] <== inp[t*32+k];
        }
    }

    for (t=16; t<=79; t++) {
        for (k=0; k<32; k++) {
            xor4[t-16].a[k] <== w[t-3][k];
            xor4[t-16].b[k] <== w[t-8][k];
            xor4[t-16].c[k] <== w[t-14][k];
            xor4[t-16].d[k] <== w[t-16][k];
        }
        for (k=0; k<32; k++) {
            rotl_1[t-16].in[k] <== xor4[t-16].out[k];
        }
        for (k=0; k<32; k++) {
            w[t][k] <== rotl_1[t-16].out[k];
        }
    }


    // Initialize five working variables
    for (k=0; k<32; k++) {
        a[0][k] <== hin[k];
        b[0][k] <== hin[32*1 + k];
        c[0][k] <== hin[32*2 + k];
        d[0][k] <== hin[32*3 + k];
        e[0][k] <== hin[32*4 + k];
    }

    for (t=0; t<=79; t++) {

        for (k=0; k<32; k++) {
            t_tmp[t].a[k] <== a[t][k];
            t_tmp[t].b[k] <== b[t][k];
            t_tmp[t].c[k] <== c[t][k];
            t_tmp[t].d[k] <== d[t][k];
            t_tmp[t].e[k] <== e[t][k];
            t_tmp[t].k_t[k] <== K_t[t].out[k];
            t_tmp[t].w[k] <== w[t][k];

            rotl_30[t].in[k] <== b[t][k];            
        }

        for (k=0; k<32; k++) {
            e[t+1][k] <== d[t][k];
            d[t+1][k] <== c[t][k];
            c[t+1][k] <== rotl_30[t].out[k];
            b[t+1][k] <== a[t][k];            
            a[t+1][k] <== t_tmp[t].out[k];
        }


    }

    for (k=0; k<32; k++) {

        fsum[0].in[0][k] <== hin[31*1-k];
        fsum[0].in[1][k] <== a[80][31-k];
        
        fsum[1].in[0][k] <== hin[31*2-k+1];
        fsum[1].in[1][k] <== b[80][31-k];

        fsum[2].in[0][k] <== hin[31*3-k+2];
        fsum[2].in[1][k] <== c[80][31-k];
        
        fsum[3].in[0][k] <== hin[31*4-k+3];
        fsum[3].in[1][k] <== d[80][31-k];
        
        fsum[4].in[0][k] <== hin[31*5-k+4];
        fsum[4].in[1][k] <== e[80][31-k];

    } 

    for (k=0; k<32; k++) {
        out[k] <== fsum[0].out[k];
        out[k+32*1] <== fsum[1].out[k];
        out[k+32*2] <== fsum[2].out[k];
        out[k+32*3] <== fsum[3].out[k];
        out[k+32*4] <== fsum[4].out[k];
    }

}