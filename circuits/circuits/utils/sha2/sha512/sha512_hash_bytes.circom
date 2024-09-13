pragma circom 2.0.0;

include "../sha2_common.circom";
include "sha512_hash_bits.circom";

//------------------------------------------------------------------------------
// Computes the SHA512 hash of a sequence of bytes
// The output is 8 little-endian 64-bit words.
// See below for the more standard "digest" version

template Sha512_hash_bytes(n) {

  signal input  inp_bytes[n];             // `n` bytes
  signal output hash_qwords[8][64];       // 512 bits, as 8 little-endian 64-bit words

  signal        inp_bits[8*n];

  component sha = Sha512_hash_bits(8*n);
  component tobits[n];

  for(var j=0; j<n; j++) {
    tobits[j] = ToBits(8);
    tobits[j].inp <== inp_bytes[j];
    for(var i=0; i<8; i++) {
      tobits[j].out[i] ==> inp_bits[ j*8 + 7-i ];
    }
  }

  sha.inp_bits    <== inp_bits;
  sha.hash_qwords ==> hash_qwords;
}

//------------------------------------------------------------------------------
// Computes the SHA512 hash of a sequence of bits
// The output is 64 bytes in the standard order

template Sha512_hash_bytes_digest(n) {

  signal input  inp_bytes [n];       // `n` bytes
  signal output hash_bytes[64];      // 64 bytes

  component sha = Sha512_hash_bytes(n);
  component ser = QWordsToByteString(8);

  inp_bytes       ==> sha.inp_bytes;
  sha.hash_qwords ==> ser.inp;
  ser.out         ==> hash_bytes;
}

//------------------------------------------------------------------------------
