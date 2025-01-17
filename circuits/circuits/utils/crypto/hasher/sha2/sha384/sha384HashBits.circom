pragma circom 2.0.0;

include "../sha2Common.circom";
include "../sha512/sha512Schedule.circom";
include "../sha512/sha512Rounds.circom";
include "sha384InitialValue.circom";

template Sha384HashBits(LEN) {
    
    signal input in[LEN];
    signal output out[384];

    component addPadding = ShaPadding(LEN, 1024);
    addPadding.in <== in;

    var BLOCK_NUM = ((LEN + 1 + 128) + 1024 - 1) \ 1024;
    
    signal states[BLOCK_NUM + 1][8][64];
    
    component iv = Sha384InitialValues();
    iv.out ==> states[0];
    
    component sch[BLOCK_NUM];
    component rds[BLOCK_NUM];
    
    for (var m = 0; m < BLOCK_NUM; m++) {
        
        sch[m] = Sha2_384_512Schedule();
        rds[m] = Sha2_384_512Rounds(80);
        
        for (var k = 0; k < 16; k++) {
            for (var i = 0; i < 64; i++) {
                sch[m].chunkBits[k][i] <== addPadding.out[m * 1024 + k * 64 + (63 - i) ];
            }
        }
        
        sch[m].outWords ==> rds[m].words;
        
        rds[m].inpHash <== states[m];
        rds[m].outHash ==> states[m + 1];
    }
    
    for (var j = 0; j < 6; j++) {
        for (var i = 0; i < 64; i++){
            out[j * 64 + i] <== states[BLOCK_NUM][j][63 - i];
        }
    }
}
