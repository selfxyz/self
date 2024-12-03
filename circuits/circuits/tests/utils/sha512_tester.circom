pragma circom 2.1.9;
include "../../utils/shaBytes/shaBytesDynamic.circom";

template Sha512Tester() {
    signal input in_padded[192];
    signal input in_len_padded_bytes;
    signal input expected[512];
    signal output hash[512];

    hash <== ShaBytesDynamic(512, 192)(in_padded, in_len_padded_bytes);

    for (var i = 0; i < 512; i++) {
        assert(hash[i] == expected[i]);
    }
}

component main = Sha512Tester();