pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha256_schedule.circom";
include "sha256_rounds.circom";
include "sha256_initial_value.circom";

//------------------------------------------------------------------------------
// hashes 512 bits into 256 bits, without applying any padding
// this can be possibly useful for constructing a Merkle tree

template Sha256_hash_chunk() {

  signal input  inp_bits[512];          // 512 bits
  signal output out_hash[8][32];        // 256 bits, as 8 little-endian 32-bit words
  signal output out_bits[256];          // 256 flat bits, big-endian order

  component iv  = Sha256_initial_value();
  component sch = SHA2_224_256_schedule();
  component rds = SHA2_224_256_rounds(64); 

  for(var k=0; k<16; k++) {
    for(var i=0; i<32; i++) {
      sch.chunk_bits[k][i] <== inp_bits[ k*32 + (31-i) ];
    }
  }

  iv.out         ==> rds.inp_hash;
  sch.out_words  ==> rds.words;
  rds.out_hash   ==> out_hash;

  for(var k=0; k<8; k++) {
    for(var i=0; i<32; i++) {
      out_bits[ 32*k + i ] <== out_hash[k][31-i];
    }
  }

}

//------------------------------------------------------------------------------
