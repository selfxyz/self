pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha512_padding.circom";
include "sha512_initial_value.circom";
include "sha512_schedule.circom";
include "sha512_rounds.circom";
include "../../other/array.circom";

template Sha512Dynamic(maxBits) {
  signal input in[maxBits];
  signal input paddedInLength;
  signal output out[512];

  var nchunks = SHA2_384_512_compute_number_of_chunks(maxBits);
  signal chunks[nchunks][1024];
  signal states[nchunks + 1][8][64];

  component pad = SHA2_384_512_padding(maxBits);
  pad.inp <== in;
  pad.out ==> chunks;

  component iv = Sha512_initial_value();
  iv.out ==> states[0];

  component sch[nchunks];
  component rds[nchunks];

  for (var m = 0; m < nchunks; m++) {
    sch[m] = SHA2_384_512_schedule();
    rds[m] = SHA2_384_512_rounds(80);

    for (var k = 0; k < 16; k++) {
      for (var i = 0; i < 64; i++) {
        sch[m].chunk_bits[k][i] <== chunks[m][k * 64 + (63 - i)];
      }
    }

    sch[m].out_words ==> rds[m].words;
    rds[m].inp_hash <== states[m];
    rds[m].out_hash ==> states[m + 1];
  }

  signal inBlockIndex;
  inBlockIndex <-- (paddedInLength >> 10);
  paddedInLength === inBlockIndex * 1024;

  component arraySelectors[512];
  for (var j = 0; j < 8; j++) {
    for (var i = 0; i < 64; i++) {
      var idx = j * 64 + i;
      arraySelectors[idx] = ItemAtIndex(nchunks);
      for (var m = 0; m < nchunks; m++) {
        arraySelectors[idx].in[m] <== states[m + 1][j][63 - i];
      }
      arraySelectors[idx].index <== inBlockIndex - 1;
      out[idx] <== arraySelectors[idx].out;
    }
  }
}

template Sha512HashBitsStatic(lenBits) {

  signal input  in[lenBits];
  signal output out[512];      

  var nchunks = SHA2_384_512_compute_number_of_chunks(lenBits);

  signal chunks[nchunks  ][1024];
  signal states[nchunks+1][8][64];

  component pad = SHA2_384_512_padding(lenBits);
  pad.inp <== in;
  pad.out ==> chunks;

  component iv = Sha512_initial_value();
  iv.out ==> states[0];

  component sch[nchunks]; 
  component rds[nchunks]; 

  for(var m=0; m<nchunks; m++) { 

    sch[m] = SHA2_384_512_schedule();
    rds[m] = SHA2_384_512_rounds(80); 

    for(var k=0; k<16; k++) {
      for(var i=0; i<64; i++) {
        sch[m].chunk_bits[k][i] <== chunks[m][ k*64 + (63-i) ];
      }
    }

    sch[m].out_words ==> rds[m].words;

    rds[m].inp_hash  <== states[m  ];
    rds[m].out_hash  ==> states[m+1];
  }


  for(var j=0; j<8; j++) {
    for (var i = 0; i < 64; i++){
      out[j*64 + i] <== states[nchunks][j][63-i]; 
    }
  }

}

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
