pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../../crypto/merkle-trees/smt.circom";

template OFAC_NAME_DOB_ID(nLevels) {

    signal input dg1[95];

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[nLevels];
    // Name Hash
    component poseidon_hasher[3];
    for (var j = 0; j < 3; j++) {
        poseidon_hasher[j] = Poseidon(10);
        for (var i = 0; i < 10; i++) {
            poseidon_hasher[j].inputs[i] <== dg1[65 + 10 * j + i];
        }
    }
    signal name_hash <== Poseidon(3)([poseidon_hasher[0].out, poseidon_hasher[1].out, poseidon_hasher[2].out]);

    // Dob hash
    component pos_dob = Poseidon(6);
    for(var i = 0; i < 6; i++) {
        pos_dob.inputs[i] <== dg1[35 + i];
    }
    
    // NameDob hash
    signal name_dob_hash <== Poseidon(2)([pos_dob.out, name_hash]);

    signal output ofacCheckResult <== SMTVerify(nLevels)(name_dob_hash, smt_leaf_key, smt_root, smt_siblings, 0);
}