pragma circom 2.1.6;

include "constants.circom";
include "sha1compression.circom";
include "../sha2/sha2Common.circom";

template Sha1HashChunks(BLOCK_NUM) {
    signal input in[BLOCK_NUM * 512];
    signal output out[160];
    
    var i;
    var k;
    
    component ha0 = H_sha1(0);
    component hb0 = H_sha1(1);
    component hc0 = H_sha1(2);
    component hd0 = H_sha1(3);
    component he0 = H_sha1(4);
    
    component sha1Compression[BLOCK_NUM];
    
    for (i = 0; i < BLOCK_NUM; i++) {
        sha1Compression[i] = Sha1compression();
        
        if (i == 0) {
            for (k = 0; k < 32; k++) {
                sha1Compression[i].hin[32 * 0 + k] <== ha0.out[k];
                sha1Compression[i].hin[32 * 1 + k] <== hb0.out[k];
                sha1Compression[i].hin[32 * 2 + k] <== hc0.out[k];
                sha1Compression[i].hin[32 * 3 + k] <== hd0.out[k];
                sha1Compression[i].hin[32 * 4 + k] <== he0.out[k];
            }
        } else {
            for (k = 0; k < 32; k++) {
                sha1Compression[i].hin[32 * 0 + k] <== sha1Compression[i - 1].out[32 * 0 + 31 - k];
                sha1Compression[i].hin[32 * 1 + k] <== sha1Compression[i - 1].out[32 * 1 + 31 - k];
                sha1Compression[i].hin[32 * 2 + k] <== sha1Compression[i - 1].out[32 * 2 + 31 - k];
                sha1Compression[i].hin[32 * 3 + k] <== sha1Compression[i - 1].out[32 * 3 + 31 - k];
                sha1Compression[i].hin[32 * 4 + k] <== sha1Compression[i - 1].out[32 * 4 + 31 - k];
            }
        }
        
        for (k = 0; k < 512; k++) {
            sha1Compression[i].inp[k] <== in[i * 512 + k];
        }
    }
    
    for (i = 0; i < 5; i++) {
        for (k = 0; k < 32; k++) {
            out[(31 - k) + i * 32] <== sha1Compression[BLOCK_NUM - 1].out[k + i * 32];
        }
    }
}

template Sha1HashBits(LEN) {
    signal input in[LEN];
    signal output out[160];
    
    component addPadding = ShaPadding(LEN, 512);
    addPadding.in <== in;

    var BLOCK_NUM = ((LEN + 1 + 128) + 512 - 1) \ 512;

    var i;
    var k;
    
    component ha0 = H_sha1(0);
    component hb0 = H_sha1(1);
    component hc0 = H_sha1(2);
    component hd0 = H_sha1(3);
    component he0 = H_sha1(4);
    
    component sha1Compression[BLOCK_NUM];
    
    for (i = 0; i < BLOCK_NUM; i++) {
        sha1Compression[i] = Sha1compression();
        
        if (i == 0) {
            for (k = 0; k < 32; k++) {
                sha1Compression[i].hin[32 * 0 + k] <== ha0.out[k];
                sha1Compression[i].hin[32 * 1 + k] <== hb0.out[k];
                sha1Compression[i].hin[32 * 2 + k] <== hc0.out[k];
                sha1Compression[i].hin[32 * 3 + k] <== hd0.out[k];
                sha1Compression[i].hin[32 * 4 + k] <== he0.out[k];
            }
        } else {
            for (k = 0; k < 32; k++) {
                sha1Compression[i].hin[32 * 0 + k] <== sha1Compression[i - 1].out[32 * 0 + 31 - k];
                sha1Compression[i].hin[32 * 1 + k] <== sha1Compression[i - 1].out[32 * 1 + 31 - k];
                sha1Compression[i].hin[32 * 2 + k] <== sha1Compression[i - 1].out[32 * 2 + 31 - k];
                sha1Compression[i].hin[32 * 3 + k] <== sha1Compression[i - 1].out[32 * 3 + 31 - k];
                sha1Compression[i].hin[32 * 4 + k] <== sha1Compression[i - 1].out[32 * 4 + 31 - k];
            }
        }
        
        for (k = 0; k < 512; k++) {
            sha1Compression[i].inp[k] <== addPadding.out[i * 512 + k];
        }
    }
    
    for (i = 0; i < 5; i++) {
        for (k = 0; k < 32; k++) {
            out[(31 - k) + i * 32] <== sha1Compression[BLOCK_NUM - 1].out[k + i * 32];
        }
    }
}
