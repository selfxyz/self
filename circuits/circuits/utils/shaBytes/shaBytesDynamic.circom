pragma circom 2.1.9;

include "./dynamic/sha1Bytes.circom";
include "./dynamic/sha256Bytes.circom";

template ShaBytesDynamic(hashLen, max_num_bytes) {
    signal input in_padded[max_num_bytes];
    signal input in_len_padded_bytes;

    signal output hash[hashLen];

    if (hashLen == 256) {
        hash <== Sha256Bytes(max_num_bytes)(in_padded, in_len_padded_bytes);
    }
    if (hashLen == 160) {
        hash <== Sha1Bytes(max_num_bytes)(in_padded, in_len_padded_bytes);
    }

}