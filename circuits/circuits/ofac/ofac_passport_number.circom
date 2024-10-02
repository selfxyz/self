pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "../utils/other/array.circom";
include "binary-merkle-root.circom";
include "../utils/other/getCommonLength.circom";
include "../utils/other/smt.circom";

template OFAC_PASSPORT_NUMBER() {

    signal input dg1[93];

    signal input smt_leaf_value;
    signal input smt_root;
    signal input smt_siblings[256];
    signal output proofLevel <== 3;

    component poseidon_hasher = Poseidon(9);
    for (var i = 0; i < 9; i++) {
        poseidon_hasher.inputs[i] <== dg1[49 + i];
    } 
   signal output ofacVerification <== SMTVerify(256)(poseidon_hasher.out, smt_leaf_value, smt_root, smt_siblings, 0);
}
