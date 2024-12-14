pragma circom 2.1.9;
include "../../utils/shaBytes/shaBytesStatic.circom";

template Sha512Tester() {
    signal input in_padded[93];
    signal input expected[512];
    signal output hash[512];

    hash <== ShaBytesStatic(512, 93)(in_padded);

    for (var i = 0; i < 512; i++) {
        assert(hash[i] == expected[i]);
    }
}

component main = Sha512Tester();