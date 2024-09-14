pragma circom 2.0.0;
  
include "../sha2_common.circom";

//------------------------------------------------------------------------------
// message schedule for SHA224 / SHA256
//
// NOTE: the individual 64 bit words are in little-endian order 
//

template SHA2_224_256_schedule() {
  
  signal input  chunk_bits[16][32];   // 512 bits = 16 dwords = 64 bytes
  signal output out_words [64];       // 64 dwords
  signal        out_bits  [64][32];   // 2048 bits = 64 dwords = 256 bytes

  for(var k=0; k<16; k++) {
    var sum = 0;
    for(var i=0; i<32; i++) { sum += (1<<i) * chunk_bits[k][i]; }
    out_words[k] <== sum;
    out_bits [k] <== chunk_bits[k];
  }

  component s0xor [64-16][32];
  component s1xor [64-16][32];
  component modulo[64-16];

  for(var m=16; m<64; m++) {
    var r = m-16;
    var k = m-15;
    var l = m- 2;

    var s0_sum = 0;
    var s1_sum = 0;
  
    for(var i=0; i<32; i++) {

      // note: with XOR3_v2, circom optimizes away the constant zero `z` thing
      // with XOR3_v1, it does not. But otherwise it's the same number of constraints.

      s0xor[r][i] = XOR3_v2();
      s0xor[r][i].x <==               out_bits[k][ (i +  7) % 32 ]     ;
      s0xor[r][i].y <==               out_bits[k][ (i + 18) % 32 ]     ;
      s0xor[r][i].z <== (i < 32- 3) ? out_bits[k][ (i +  3)      ] : 0 ;
      s0_sum += (1<<i) * s0xor[r][i].out;
   
      s1xor[r][i] = XOR3_v2();
      s1xor[r][i].x <==               out_bits[l][ (i + 17) % 32 ]     ;
      s1xor[r][i].y <==               out_bits[l][ (i + 19) % 32 ]     ;
      s1xor[r][i].z <== (i < 32-10) ? out_bits[l][ (i + 10)      ] : 0 ;
      s1_sum += (1<<i) * s1xor[r][i].out;

    }

    var tmp = s1_sum + out_words[m-7] + s0_sum + out_words[m-16] ;

    modulo[r] = Bits34();
    modulo[r].inp      <== tmp;
    modulo[r].out_bits ==> out_bits [m];
    modulo[r].out_word ==> out_words[m];

  }
}

//------------------------------------------------------------------------------
