pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha512_padding.circom";
include "sha512_initial_value.circom";
include "sha512_schedule.circom";
include "sha512_rounds.circom";

template Sha512_hash_chunks(BLOCK_NUM) {

  signal input  in[BLOCK_NUM*1024];           
  signal output out[512];       

  signal states[BLOCK_NUM+1][8][64];

  component iv = Sha512_initial_value();
  iv.out ==> states[0];

  component sch[BLOCK_NUM]; 
  component rds[BLOCK_NUM]; 

  for(var m=0; m<BLOCK_NUM; m++) { 

    sch[m] = SHA2_384_512_schedule();
    rds[m] = SHA2_384_512_rounds(80); 

    for(var k=0; k<16; k++) {
      for(var i=0; i<64; i++) {
        sch[m].chunk_bits[k][i] <== in[m *1024 + k*64 + (63-i) ];
      }
    }

    sch[m].out_words ==> rds[m].words;

    rds[m].inp_hash  <== states[m  ];
    rds[m].out_hash  ==> states[m+1];
  }

  for(var j=0; j<8; j++) {
    for (var i = 0; i < 64; i++){
      out[j*64 + i] <== states[BLOCK_NUM][j][63-i]; 
    }
  }
}
