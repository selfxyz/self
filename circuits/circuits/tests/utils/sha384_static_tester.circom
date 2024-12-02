pragma circom 2.1.9;
include "../../utils/shaBytes/shaBytesStatic.circom";

template Sha384Tester() {
    signal input in_padded[93];
    signal input expected[384];
    signal output hash[384];

    hash <== ShaBytesStatic(384, 93)(in_padded);

    for (var i = 0; i < 384; i++) {
        assert(hash[i] == expected[i]);
    }
}

component main = Sha384Tester();