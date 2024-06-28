pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "@zk-email/circuits/helpers/extract.circom";
include "binary-merkle-root.circom";

template ProvePassportNotInOfac(nLevels) {
    signal input mrz[93];

    signal input merkle_root;
    signal input merkletree_size;
    signal input path[nLevels];
    signal input siblings[nLevels];
    signal output isEqual;
    signal passport;


    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== mrz[50+i];
    }

    signal computedRoot <== BinaryMerkleRoot(nLevels)(poseidon_hasher.out, merkletree_size, path, siblings);
    signal diff <== merkle_root - computedRoot;
    isEqual <== (1 - diff * diff);

}

component main { public [ merkle_root ] } = ProvePassportNotInOfac(16);
