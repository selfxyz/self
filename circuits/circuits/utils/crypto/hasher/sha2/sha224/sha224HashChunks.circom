pragma circom 2.0.0;

include "../sha2Common.circom";
include "../sha256/sha256Schedule.circom";
include "../sha256/sha256Rounds.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "sha224InitialValue.circom";

template Sha224HashChunks(MAX_BLOCKS) {
    signal input  in[MAX_BLOCKS * 512];
    signal input paddedInLength;

    signal output out[224];

    signal inBlockIndex;

    inBlockIndex <-- (paddedInLength >> 9); 
    paddedInLength === inBlockIndex * 512;
    
    signal states[MAX_BLOCKS + 1][8][32];
    
    component iv = Sha224InitialValue();
    iv.out ==> states[0];
    
    component sch[MAX_BLOCKS];
    component rds[MAX_BLOCKS];
    
    for (var m = 0; m < MAX_BLOCKS; m++) {
        
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
    
    component arraySelectors[224];
    for (var j = 0; j < 7; j++) {
        for (var i = 0; i < 32; i++){
            arraySelectors[j * 32 + i] = ItemAtIndex(MAX_BLOCKS + 1);
             for (var k = 0; k <= MAX_BLOCKS; k++) {
                arraySelectors[j * 32 + i].in[k] <== states[k][j][31 - i];
            }
            arraySelectors[j * 32 + i].index <== inBlockIndex;
            out[j * 32 + i] <== arraySelectors[j * 32 + i].out; 
        }
    }
}

