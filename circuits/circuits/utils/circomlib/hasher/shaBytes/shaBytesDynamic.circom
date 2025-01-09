pragma circom 2.1.9;

include "./dynamic/sha1Bytes.circom";
include "./dynamic/sha224Bytes.circom";
include "@zk-email/circuits/lib/sha.circom";
include "./dynamic/sha384Bytes.circom";
include "./dynamic/sha512Bytes.circom";

template ShaBytesDynamic(hashLen, max_num_bits) {
    signal input in_padded[max_num_bits];
    signal input in_len_padded_bytes;

    signal output hash[hashLen];

    if (hashLen == 512) {
        hash <== Sha512Bytes(max_num_bits)(in_padded, in_len_padded_bytes);
    }
    if (hashLen == 384) {
        hash <== Sha384Bytes(max_num_bits)(in_padded, in_len_padded_bytes);
    }
    if (hashLen == 256) {
        hash <== Sha256Bytes(max_num_bits)(in_padded, in_len_padded_bytes);
    }
    if (hashLen == 224) { 
        hash <== Sha224Bytes(max_num_bits)(in_padded, in_len_padded_bytes);
    }
    if (hashLen == 160) {
        hash <== Sha1Bytes(max_num_bits)(in_padded, in_len_padded_bytes);
    }
}