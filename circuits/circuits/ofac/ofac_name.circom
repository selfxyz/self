pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "binary-merkle-root.circom";
include "../utils/other/getCommonLength.circom";
include "../utils/other/smt.circom";

template OFAC_NAME() {

    signal input dg1[93];

    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    signal output proofLevel <== 1;

    component poseidon_hasher[3];
    for (var j = 0; j < 3; j++) {
        poseidon_hasher[j] = Poseidon(13);
        for (var i = 0; i < 13; i++) {
            poseidon_hasher[j].inputs[i] <== dg1[10 + 13 * j + i];
        }
    }

    signal name_hash <== Poseidon(3)([poseidon_hasher[0].out, poseidon_hasher[1].out, poseidon_hasher[2].out]);
    
    SMTVerify(256)(name_hash, smt_leaf_value, smt_root, smt_siblings, 0);
    
}

component main { public [ smt_root ] } = OFAC_NAME();
