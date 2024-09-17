pragma circom 2.1.6;

include "./dynamic/Sha1Bytes.circom";
include "@zk-email/circuits/lib/sha.circom";

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