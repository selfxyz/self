pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "../../other/smt.circom";

template ValidateCountry(nLevels) {
    signal input host_user[6]; // Pair of (user country followed by host's country)
    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[256];


    // Country hash aka key
    component poseidon_hasher = Poseidon(6);
    for (var i = 0; i < 6; i++) {
        poseidon_hasher.inputs[i] <== host_user[i];
    }

    SMTVerify(nLevels)(poseidon_hasher.out, smt_leaf_key, smt_root, smt_siblings, 0);
}
