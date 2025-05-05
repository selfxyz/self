pragma circom 2.1.9;

include "circomlib/circuits/poseidon.circom";
include "../../crypto/merkle-trees/smt.circom";

template OFAC_NAME_YOB(nLevels) {
    signal input namehash;
    signal input yob;

    signal input smt_leaf_key;
    signal input smt_root;
    signal input smt_siblings[nLevels];

    signal name_yob_hash <== Poseidon(2)([yob,namehash]);

    signal output ofacCheckResult <== SMTVerify(nLevels)(name_yob_hash, smt_leaf_key, smt_root, smt_siblings, 0);
}
