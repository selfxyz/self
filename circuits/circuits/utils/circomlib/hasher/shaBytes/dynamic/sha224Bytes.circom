pragma circom 2.1.9;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "../../sha2/sha224/sha224HashChunks.circom";

template Sha224Bytes(maxByteLength) {
    signal input paddedIn[maxByteLength];
    signal input paddedInLength;
    signal output out[224];

    component sha = Sha224HashChunks((maxByteLength * 8) \ 512);
    sha.paddedInLength <== paddedInLength * 8;

    component bytes[maxByteLength];
    for (var i = 0; i < maxByteLength; i++) {
        bytes[i] = Num2Bits(8);
        bytes[i].in <== paddedIn[i];
        for (var j = 0; j < 8; j++) {
            sha.in[i*8+j] <== bytes[i].out[7-j];
        }
    }

    for (var i = 0; i < 224; i++) {
        out[i] <== sha.out[i];
    }
}
