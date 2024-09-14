pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha512_schedule.circom";
include "sha512_rounds.circom";
include "sha512_initial_value.circom";

//------------------------------------------------------------------------------
// hashes 1024 bits into 512 bits, without applying any padding
// this can be possibly useful for constructing a Merkle tree

template Sha512_hash_chunk() {

  signal input  inp_bits[1024];         // 1024 bits
  signal output out_hash[8][64];        // 512 bits, as 8 little-endian 64-bit words
  signal output out_bits[512];          // 512 flat bits, big-endian order

  component iv  = Sha512_initial_value();
  component sch = SHA2_384_512_schedule();
  component rds = SHA2_384_512_rounds(80); 

  for(var k=0; k<16; k++) {
    for(var i=0; i<64; i++) {
      sch.chunk_bits[k][i] <== inp_bits[ k*64 + (63-i) ];
    }
  }

  iv.out         ==> rds.inp_hash;
  sch.out_words  ==> rds.words;
  rds.out_hash   ==> out_hash;

  for(var k=0; k<8; k++) {
    for(var i=0; i<64; i++) {
      out_bits[ 64*k + i ] <== out_hash[k][63-i];
    }
  }

}

//------------------------------------------------------------------------------
