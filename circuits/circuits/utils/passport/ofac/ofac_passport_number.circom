pragma circom 2.1.9;

include "../../crypto/merkle-trees/smt.circom";

template OFAC_PASSPORT_NUMBER(nLevels) {
    signal input dg1[93];

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[nLevels];

    component poseidon_hasher = Poseidon(12);
    for (var i = 0; i < 9; i++) { // passport number
        poseidon_hasher.inputs[i] <== dg1[49 + i];
    }
    for (var i = 0; i < 3; i++) { // nationality
        poseidon_hasher.inputs[9 + i] <== dg1[59 + i];
    }

    signal output ofacCheckResult <== SMTVerify(nLevels)(poseidon_hasher.out, smt_leaf_key, smt_root, smt_siblings, 0);
}