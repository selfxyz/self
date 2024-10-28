pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha256_hash_bits.circom";

//------------------------------------------------------------------------------
// Computes the SHA256 hash of a sequence of bytes
// The output is 8 little-endian 32-bit words.
// See below for the more standard "digest" version

template Sha256_hash_bytes(n) {

  signal input  inp_bytes[n];             // `n` bytes
  signal output hash_dwords[8][32];       // 256 bits, as 8 little-endian 32-bit words

  signal        inp_bits[8*n];

  component sha = Sha256_hash_bits(8*n);
  component tobits[n];

  for(var j=0; j<n; j++) {
    tobits[j] = ToBits(8);
    tobits[j].inp <== inp_bytes[j];
    for(var i=0; i<8; i++) {
      tobits[j].out[i] ==> inp_bits[ j*8 + 7-i ];
    }
  }

  sha.inp_bits    <== inp_bits;
  sha.hash_dwords ==> hash_dwords;
}

//------------------------------------------------------------------------------
// Computes the SHA256 hash of a sequence of bits
// The output is 32 bytes in the standard order

template Sha256_hash_bytes_digest(n) {

  signal input  inp_bytes [n];       // `n` bytes
  signal output hash_bytes[32];      // 32 bytes

  component sha = Sha256_hash_bytes(n);
  component ser = DWordsToByteString(8);

  inp_bytes       ==> sha.inp_bytes;
  sha.hash_dwords ==> ser.inp;
  ser.out         ==> hash_bytes;
}

//------------------------------------------------------------------------------
