ragma circom 2.1.5;

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

    // extract deets 
    signal passport = mrz[50...58]

    component poseidon_hasher = Poseidon(1);
    poseidon_hasher.inputs[0] <== passport

    signal computedRoot <== BinaryMerkleRoot(nLevels)(poseidon_hasher.out, merkletree_size, path, siblings);
    isEqual <== merkle_root == computedRoot;

}

component main { public [ merkle_root, scope] } = ProvePassportNotInOfac(16);
