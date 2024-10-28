pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha256_padding.circom";
include "sha256_initial_value.circom";
include "sha256_schedule.circom";
include "sha256_rounds.circom";

template Sha256_hash_chunks(BLOCK_NUM) {

  signal input  in[BLOCK_NUM * 512];            
  signal output out[256];       

  signal states[BLOCK_NUM+1][8][32];
  
  component iv = Sha256_initial_value();
  iv.out ==> states[0];

  component sch[BLOCK_NUM]; 
  component rds[BLOCK_NUM]; 

  for(var m=0; m<BLOCK_NUM; m++) { 

    sch[m] = SHA2_224_256_schedule();
    rds[m] = SHA2_224_256_rounds(64); 

    for(var k=0; k<16; k++) {
      for(var i=0; i<32; i++) {
        sch[m].chunk_bits[k][i] <== in[m * 512 +  k*32 + (31-i) ];
      }
    }

    sch[m].out_words ==> rds[m].words;

    rds[m].inp_hash  <== states[m  ];
    rds[m].out_hash  ==> states[m+1];
  }

  for (var j=0; j<8; j++) {
    for (var i = 0; i < 32; i++){
      out[j*32 + i] <== states[BLOCK_NUM][j][31-i]; 
    }
  }
}
