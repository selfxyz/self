pragma circom 2.0.0;

include "../sha2Common.circom";
include "sha256InitialValue.circom";
include "sha256Schedule.circom";
include "sha256Rounds.circom";

template Sha256HashChunks(BLOCK_NUM) {
    
    signal input  in[BLOCK_NUM * 512];

    signal output out[256];
    

    signal states[BLOCK_NUM + 1][8][32];
    
    component iv = Sha256InitialValue();
    iv.out ==> states[0];
    
    component sch[BLOCK_NUM];
    component rds[BLOCK_NUM];
    
    for (var m = 0; m < BLOCK_NUM; m++) {
        
        sch[m] = Sha2_224_256Shedule();
        rds[m] = Sha2_224_256Rounds(64);
        
        for (var k = 0; k < 16; k++) {
            for (var i = 0; i < 32; i++) {
                sch[m].chunkBits[k][i] <== in[m * 512 + k * 32 + (31 - i) ];
            }
        }
        
        sch[m].outWords ==> rds[m].words;
        
        rds[m].inpHash <== states[m];
        rds[m].outHash ==> states[m + 1];
    }
    
    for (var j = 0; j < 8; j++) {
        for (var i = 0; i < 32; i++){
            out[j * 32 + i] <== states[BLOCK_NUM][j][31 - i];
        }
    }
}
