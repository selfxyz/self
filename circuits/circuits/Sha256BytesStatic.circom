pragma circom 2.1.5;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/sha256.circom";

// Static length sha256 bytes, adapted from zk-email
template Sha256BytesStatic(max_num_bytes) {
    signal input in_padded[max_num_bytes];
    signal output out[256];

    var num_bits = max_num_bytes * 8;
    component sha = Sha256(num_bits);

    component bytes[max_num_bytes];
    for (var i = 0; i < max_num_bytes; i++) {
        bytes[i] = Num2Bits(8);
        bytes[i].in <== in_padded[i];
        for (var j = 0; j < 8; j++) {
            sha.in[i*8+j] <== bytes[i].out[7-j];
        }
    }

    for (var i = 0; i < 256; i++) {
        out[i] <== sha.out[i];
    }
}