pragma circom 2.1.9;
include "../../utils/shaBytes/shaBytesDynamic.circom";

template Sha384Tester() {
    signal input in_padded[192];
    signal input in_len_padded_bytes;
    signal input expected[384];
    signal output hash[384];

    hash <== ShaBytesDynamic(384, 192)(in_padded, in_len_padded_bytes);

    for (var i = 0; i < 384; i++) {
        assert(hash[i] == expected[i]);
    }
}

component main = Sha384Tester();